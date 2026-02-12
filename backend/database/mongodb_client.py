import pymongo
from bson.binary import Binary
from datetime import datetime
import os

def get_mongo_uris():
    """Returns a list of potential URIs to try, ordered by reliability."""
    uris = []
    
    # 1. DIAGNOSTIC: Audit environment for any Mongo-related keys
    print("--- Clinical Environment Audit ---")
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

DB_NAME = os.environ.get("MONGODATABASE") or "quantum_clinical_db"

class MongoClient:
    def __init__(self):
        self.client = None
        self.db = None
        self.is_connected = False
        
        # Start background connection probe to prevent Startup Timeouts
        import threading
        print("DATABASE: Launching background connection engine...")
        thread = threading.Thread(target=self._background_probe)
        thread.daemon = True
        thread.start()

    def _background_probe(self):
        potential_uris = get_mongo_uris()
        
        print(f"--- DATABASE BACKGROUND PROBE: Attempting {len(potential_uris)} paths ---")
        
        for uri in potential_uris:
            # Mask for safety
            log_path = uri.split("@")[-1] if "@" in uri else uri
            try:
                print(f"PATH PROBE: Testing {log_path}...")
                client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
                client.server_info() # Trigger connection
                
                self.client = client
                self.db = self.client[DB_NAME]
                self.is_connected = True
                print(f"DATABASE: SUCCESS! Connected via {log_path}")
                return
            except Exception as e:
                print(f"PATH FAILED: {log_path}. Reason: {str(e)[:50]}")
        
        print("DATABASE: CRITICAL FAILURE. All paths exhausted. App will run in Synthetic Mode.")

    def save_prediction(self, patient_id, prediction, confidence, metrics, image_bytes=None, metadata=None):
        """Stores a single prediction result using Binary storage for images."""
        if self.db is None: return
        
        doc = {
            "patient_id": patient_id,
            "prediction": prediction,
            "confidence": confidence,
            "metrics": metrics,
            "image": Binary(image_bytes) if image_bytes else None,
            "metadata": metadata or {},
            "timestamp": datetime.now()
        }
        
        try:
            return self.db.predictions.insert_one(doc)
        except Exception as e:
            print(f"Error saving prediction: {e}")

    def save_batch_csv(self, filename, results, summary):
        """Stores a complete batch inference session from a CSV."""
        if self.db is None: return
        
        doc = {
            "filename": filename,
            "results": results,
            "summary": summary,
            "timestamp": datetime.now()
        }
        
        try:
            return self.db.batch_inferences.insert_one(doc)
        except Exception as e:
            print(f"Error saving batch results: {e}")

    def save_circuit_experiment(self, config, qasm_code, explanation):
        """Logs Q-Lab experiments and mathematical configurations."""
        if self.db is None: return
        
        doc = {
            "config": config,
            "qasm": qasm_code,
            "math_explanation": explanation,
            "timestamp": datetime.now()
        }
        
        try:
            return self.db.circuits.insert_one(doc)
        except Exception as e:
            print(f"Error saving circuit: {e}")

    def save_circuit_diagram(self, diagram_base64, metadata=None):
        """Stores a circuit diagram converted from base64 to native Binary."""
        if self.db is None: return
        
        import base64
        try:
            # Convert to binary for efficient storage
            binary_data = base64.b64decode(diagram_base64)
            
            doc = {
                "diagram": Binary(binary_data),
                "metadata": metadata or {},
                "timestamp": datetime.now()
            }
            return self.db.prediction_circuits.insert_one(doc)
        except Exception as e:
            print(f"Error saving circuit diagram: {e}")

    def save_training_session(self, history, configuration):
        """Logs a full model training session."""
        if self.db is None: return
        doc = {
            "history": history,
            "config": configuration,
            "timestamp": datetime.now()
        }
        try:
            return self.db.training_logs.insert_one(doc)
        except Exception as e:
            print(f"Error saving training log: {e}")

    def save_xai_analysis(self, patient_id, original_image, saliency_map, analysis):
        """Stores Explainable AI results with heatmaps."""
        if self.db is None: return
        doc = {
            "patient_id": patient_id,
            "original": Binary(original_image),
            "heatmap": Binary(saliency_map),
            "analysis": analysis,
            "timestamp": datetime.now()
        }
        try:
            return self.db.xai_results.insert_one(doc)
        except Exception as e:
            print(f"Error saving XAI analysis: {e}")

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
        if self.db is None: return
        doc = {
            "weights": weights,
            "results": results,
            "final_decision": final_decision,
            "timestamp": datetime.now()
        }
        try:
            return self.db.ensemble_logs.insert_one(doc)
        except Exception as e:
            print(f"Error saving ensemble result: {e}")

    def save_grid_analysis(self, num_images, summary, worst_case_index):
        """Logs a session of the 6-image comparison grid."""
        if self.db is None: return
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

# Global singleton instance
db_client = MongoClient()
