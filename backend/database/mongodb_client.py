import pymongo
from bson.binary import Binary
from datetime import datetime
import os

def get_mongo_uris():
    """Returns a list of potential URIs to try, ordered by reliability."""
    uris = []
    
    # 1. DIAGNOSTIC: Audit environment for any Mongo-related keys
    print("--- Clinical Environment Audit ---")
    
    # 0. MANUAL .ENV PARSING (Fallback if python-dotenv failed)
    if not os.environ.get("MONGO_URL"):
        try:
            # Absolute path to this file's directory
            this_dir = os.path.dirname(os.path.abspath(__file__))
            # levels: database -> backend -> project_root
            root_dir = os.path.abspath(os.path.join(this_dir, "..", ".."))
            env_path = os.path.join(root_dir, '.env')
            if os.path.exists(env_path):
                with open(env_path, 'r') as f:
                    for line in f:
                        if line.startswith('MONGO_URL='):
                            val = line.split('=', 1)[1].strip()
                            os.environ["MONGO_URL"] = val
                            print(f"AUDIT: Manually loaded MONGO_URL from {env_path}")
        except Exception as e:
            print(f"AUDIT ERROR: Manual .env parse failed: {e}")

    for k, v in os.environ.items():
        if "MONGO" in k or "DB" in k:
            masked = v[:15] + "..." if len(v) > 15 else v
            print(f"AUDIT found: {k} = {masked}")

    # Tier 1: User-defined or Railway-linked URIs (Prioritize Public URLs for reliability)
    keys = ["MONGO_PUBLIC_URL", "MONGO_URL", "MONGODB_URL", "MONGO_URI", "MONGODB_URI"]
    for k in keys:
        val = os.environ.get(k)
        if val and val not in uris:
            uris.append(val)
            print(f"PATH IDENTIFIED: {k}")

    # Tier 2: Individual Parameter construction
    host = os.environ.get("MONGOHOST")
    port = os.environ.get("MONGOPORT", "27017")
    user = os.environ.get("MONGOUSER")
    pwd = os.environ.get("MONGOPASSWORD")
    
    if host:
        auth = f"{user}:{pwd}@" if user and pwd else ""
        uris.append(f"mongodb://{auth}{host}:{port}/")
        # Also try direct service names as fallbacks
        uris.append(f"mongodb://{auth}mongo:{port}/")
        uris.append(f"mongodb://{auth}mongodb:{port}/")

    # Tier 3: Hardcoded Last Resorts
    uris.append("mongodb://mongo:27017/")
    uris.append("mongodb://localhost:27017/")
    
    return uris

def get_cloud_uri():
    """Specifically returns the Atlas / Cloud URI if available."""
    keys = ["MONGO_PUBLIC_URL", "MONGO_URL", "MONGODB_URL", "MONGO_URI", "MONGODB_URI"]
    for k in keys:
        val = os.environ.get(k)
        if val and "mongodb.net" in val: # Check if it's an Atlas URL
            return val
    return None

DB_NAME = os.environ.get("MONGODATABASE") or "quantum_clinical_db"

class MongoClient:
    def __init__(self):
        self.client = None
        self.db = None
        self.sync_client = None
        self.sync_db = None
        self.is_connected = False
        self.is_cloud_synced = False
        
        # Start background connection probe
        import threading
        print("DATABASE: Launching background connection engine...")
        thread = threading.Thread(target=self._background_probe)
        thread.daemon = True
        thread.start()

    def _background_probe(self):
        # 1. SETUP CLOUD SYNC (Secondary connection for model sync)
        cloud_uri = get_cloud_uri()
        if cloud_uri:
            try:
                print("SYNC: Initializing Cloud Shadow Sync (Atlas)...")
                self.sync_client = pymongo.MongoClient(cloud_uri, serverSelectionTimeoutMS=5000)
                self.sync_client.server_info()
                self.sync_db = self.sync_client[DB_NAME]
                self.is_cloud_synced = True
                print("SYNC: Cloud Shadow Sync ACTIVE ✅")
            except Exception as e:
                print(f"SYNC: Cloud Sync failed initialization: {str(e)[:50]}")

        # 2. SETUP PRIMARY DB
        potential_uris = get_mongo_uris()
        
        # If we are on Localhost (No RENDER var), we WANT localhost:27017 to be first priority
        if not os.environ.get("RENDER"):
            # Move localhost to front if it exists
            local_uri = "mongodb://localhost:27017/"
            if local_uri in potential_uris:
                potential_uris.remove(local_uri)
                potential_uris.insert(0, local_uri)
        
        print(f"--- DATABASE BACKGROUND PROBE: Attempting {len(potential_uris)} paths ---")
        
        for uri in potential_uris:
            # Mask for safety
            log_path = uri.split("@")[-1] if "@" in uri else uri
            try:
                print(f"PATH PROBE: Testing {log_path}...")
                client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=15000)
                client.server_info() # Trigger connection
                
                self.client = client
                self.db = self.client[DB_NAME]
                self.is_connected = True
                print(f"DATABASE: SUCCESS! Connected Primary via {log_path}")
                return
            except Exception as e:
                print(f"PATH FAILED: {log_path}. Reason: {str(e)[:50]}")
        
        print("DATABASE: CRITICAL FAILURE. All paths exhausted. App will run in Synthetic Mode.")

    def save_prediction(self, patient_id, prediction, confidence, metrics, image_bytes=None, metadata=None):
        """Stores a single prediction result using Binary storage for images."""
        doc = {
            "patient_id": patient_id,
            "prediction": prediction,
            "confidence": confidence,
            "metrics": metrics,
            "image": Binary(image_bytes) if image_bytes else None,
            "metadata": metadata or {},
            "timestamp": datetime.now()
        }
        
        # 1. Primary DB
        if self.db is not None:
            try: self.db.predictions.insert_one(doc.copy())
            except Exception as e: print(f"Error saving prediction locally: {e}")
            
        # 2. Shadow Sync
        if self.sync_db is not None and self.sync_db != self.db:
            try: self.sync_db.predictions.insert_one(doc)
            except Exception as e: print(f"Error syncing prediction to cloud: {e}")

    def save_batch_csv(self, filename, results, summary):
        """Stores a complete batch inference session from a CSV."""
        doc = {
            "filename": filename,
            "results": results,
            "summary": summary,
            "timestamp": datetime.now()
        }
        
        # 1. Primary DB
        if self.db is not None:
            try: self.db.batch_inferences.insert_one(doc.copy())
            except Exception as e: print(f"Error saving batch locally: {e}")
            
        # 2. Shadow Sync
        if self.sync_db is not None and self.sync_db != self.db:
            try: self.sync_db.batch_inferences.insert_one(doc)
            except Exception as e: print(f"Error syncing batch to cloud: {e}")

    def save_circuit_experiment(self, config, qasm_code, explanation):
        """Logs Q-Lab experiments and mathematical configurations."""
        doc = {
            "config": config,
            "qasm": qasm_code,
            "math_explanation": explanation,
            "timestamp": datetime.now()
        }
        
        # 1. Primary DB
        if self.db is not None:
            try: self.db.circuits.insert_one(doc.copy())
            except Exception as e: print(f"Error saving circuit locally: {e}")
            
        # 2. Shadow Sync
        if self.sync_db is not None and self.sync_db != self.db:
            try: self.sync_db.circuits.insert_one(doc)
            except Exception as e: print(f"Error syncing circuit to cloud: {e}")

    def save_circuit_diagram(self, diagram_base64, metadata=None):
        """Stores a circuit diagram converted from base64 to native Binary."""
        import base64
        try:
            binary_data = base64.b64decode(diagram_base64)
            doc = {
                "diagram": Binary(binary_data),
                "metadata": metadata or {},
                "timestamp": datetime.now()
            }
            
            # 1. Primary DB
            if self.db is not None:
                try: self.db.prediction_circuits.insert_one(doc.copy())
                except: pass
                
            # 2. Shadow Sync
            if self.sync_db is not None and self.sync_db != self.db:
                try: self.sync_db.prediction_circuits.insert_one(doc)
                except: pass
        except Exception as e:
            print(f"Error saving circuit diagram: {e}")

    def save_training_session(self, history, configuration):
        """Logs a full model training session."""
        doc = {
            "history": history,
            "config": configuration,
            "timestamp": datetime.now()
        }
        
        # 1. Primary DB
        if self.db is not None:
            try: self.db.training_logs.insert_one(doc.copy())
            except: pass
            
        # 2. Shadow Sync
        if self.sync_db is not None and self.sync_db != self.db:
            try: self.sync_db.training_logs.insert_one(doc)
            except: pass

    def save_xai_analysis(self, patient_id, original_image, saliency_map, analysis):
        """Stores Explainable AI results with heatmaps."""
        doc = {
            "patient_id": patient_id,
            "original": Binary(original_image),
            "heatmap": Binary(saliency_map),
            "analysis": analysis,
            "timestamp": datetime.now()
        }
        
        # 1. Primary DB
        if self.db is not None:
            try: self.db.xai_results.insert_one(doc.copy())
            except: pass
            
        # 2. Shadow Sync
        if self.sync_db is not None and self.sync_db != self.db:
            try: self.sync_db.xai_results.insert_one(doc)
            except: pass

    def save_general_activity(self, activity_type, data):
        """Generic logger for all other lab operations (Ensemble, Stats, etc)."""
        if self.db is None: return
        doc = {
            "type": activity_type,
            "data": data,
            "timestamp": datetime.now()
        }
        try:
            return self.db.lab_activities.insert_one(doc)
        except Exception as e:
            print(f"Error saving general activity: {e}")

    def save_ensemble_result(self, weights, results, final_decision):
        """Logs multi-model ensemble voting results."""
        doc = {
            "weights": weights,
            "results": results,
            "final_decision": final_decision,
            "timestamp": datetime.now()
        }
        
        # 1. Primary DB
        if self.db is not None:
            try: self.db.ensemble_logs.insert_one(doc.copy())
            except: pass
            
        # 2. Shadow Sync
        if self.sync_db is not None and self.sync_db != self.db:
            try: self.sync_db.ensemble_logs.insert_one(doc)
            except: pass

    def save_grid_analysis(self, num_images, summary, worst_case_index):
        """Logs a session of the 6-image comparison grid."""
        doc = {
            "num_images": num_images,
            "summary": summary,
            "worst_case_frame": worst_case_index,
            "timestamp": datetime.now()
        }
        try:
            return self.db.grid_analysis.insert_one(doc)
        except Exception as e:
            print(f"Error saving grid analysis: {e}")

    
    def save_trained_model(self, model_data):
        """Save trained model to both primary and cloud shadow sync DB."""
        # Add timestamp if not present
        if "timestamp" not in model_data:
            model_data["timestamp"] = datetime.now()
            
        # 1. Save to Primary DB
        if self.db is not None:
            try:
                self.db.trained_models.update_one(
                    {"id": model_data["id"]}, 
                    {"$set": model_data}, 
                    upsert=True
                )
                print(f"✅ Model '{model_data.get('name')}' saved to Primary DB")
            except Exception as e:
                print(f"Error saving model to Primary: {e}")
                
        # 2. Save to Cloud Sync DB (Shadow Sync)
        if self.sync_db is not None and self.sync_db != self.db:
            try:
                self.sync_db.trained_models.update_one(
                    {"id": model_data["id"]}, 
                    {"$set": model_data}, 
                    upsert=True
                )
                print(f"☁️ Model '{model_data.get('name')}' Shadow-Synced to Atlas Cloud")
            except Exception as e:
                print(f"Error shadow-syncing model to Cloud: {e}")

    def get_trained_models(self):
        """Retrieve trained models from primary DB, merging cloud models if possible."""
        models_dict = {}
        
        # 1. Get from Primary DB
        if self.db is not None:
            try:
                for m in self.db.trained_models.find().sort("timestamp", -1):
                    m["_id"] = str(m["_id"])
                    models_dict[m["id"]] = m
            except Exception as e:
                print(f"Error fetching models from Primary: {e}")
                
        # 2. Merge from Cloud Sync DB (if different)
        if self.sync_db is not None and self.sync_db != self.db:
            try:
                for m in self.sync_db.trained_models.find().sort("timestamp", -1):
                    m["_id"] = str(m["_id"])
                    if m["id"] not in models_dict:
                        models_dict[m["id"]] = m
            except Exception as e:
                print(f"Error fetching models from Cloud Sync: {e}")
                
        return sorted(models_dict.values(), key=lambda x: x.get('timestamp', datetime.min), reverse=True)

    def delete_trained_model(self, model_id):
        """Delete a trained model from both primary and cloud shadow sync DB."""
        deleted = False
        
        # 1. Delete from Primary
        if self.db is not None:
            try:
                res = self.db.trained_models.delete_one({"id": model_id})
                if res.deleted_count > 0: deleted = True
            except: pass
            
        # 2. Delete from Cloud
        if self.sync_db is not None and self.sync_db != self.db:
            try:
                res = self.sync_db.trained_models.delete_one({"id": model_id})
                if res.deleted_count > 0: deleted = True
            except: pass
            
        return deleted

    def get_collections_data(self):
        """Retrieves history from all collections for the UI explorer."""
        if self.db is None: return {}
        
        try:
            return {
                "predictions": list(self.db.predictions.find().sort("timestamp", -1).limit(15)),
                "batch": list(self.db.batch_inferences.find().sort("timestamp", -1).limit(10)),
                "circuits": list(self.db.prediction_circuits.find().sort("timestamp", -1).limit(10)),
                "training": list(self.db.training_logs.find().sort("timestamp", -1).limit(5)),
                "xai": list(self.db.xai_results.find().sort("timestamp", -1).limit(10)),
                "ensemble": list(self.db.ensemble_logs.find().sort("timestamp", -1).limit(10)),
                "grid": list(self.db.grid_analysis.find().sort("timestamp", -1).limit(10))
            }
        except Exception as e:
            print(f"Error fetching DB records: {e}")
            return {}
    
    
    def delete_record(self, collection_name: str, record_id: str):
        """Delete a single record from the specified collection by ObjectId."""
        if self.db is None:
            print(f"❌ Delete failed: Database not connected")
            return {"success": False, "error": "Database not connected"}
        
        try:
            from bson import ObjectId
            print(f"🔍 Attempting to delete: collection='{collection_name}', id='{record_id}'")
            
            collection = self.db[collection_name]
            obj_id = ObjectId(record_id)
            
            # First check if record exists
            existing = collection.find_one({"_id": obj_id})
            if not existing:
                print(f"❌ Record not found: {record_id} in {collection_name}")
                return {"success": False, "error": "Record not found"}
            
            result = collection.delete_one({"_id": obj_id})
            
            if result.deleted_count > 0:
                print(f"✓ Deleted record {record_id} from {collection_name}")
                return {"success": True, "deleted_count": result.deleted_count}
            else:
                print(f"❌ Delete failed: No records deleted")
                return {"success": False, "error": "Record not found"}
        except Exception as e:
            print(f"❌ Error deleting record: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

# Global singleton instance
db_client = MongoClient()
