import pymongo
from bson.binary import Binary
from datetime import datetime
import os

# Production Hardware Configuration
def get_mongo_uri():
    # 1. Primary: Explicit URI
    uri = os.environ.get("MONGO_URI") or os.environ.get("MONGODB_URL") or os.environ.get("MONGODB_URI")
    if uri: return uri

    # 2. Secondary: Construct from individual Railway params
    host = os.environ.get("MONGOHOST")
    port = os.environ.get("MONGOPORT")
    user = os.environ.get("MONGOUSER")
    pwd = os.environ.get("MONGOPASSWORD")
    
    if host and port:
        auth = f"{user}:{pwd}@" if user and pwd else ""
        return f"mongodb://{auth}{host}:{port}/"
    
    # 3. Fallback: Localhost
    return "mongodb://localhost:27017/"

MONGO_URI = get_mongo_uri()
DB_NAME = "quantum_clinical_db"

class MongoClient:
    def __init__(self):
        try:
            self.client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
            self.db = self.client[DB_NAME]
            # Verify connection
            self.client.server_info()
            print(f"Connected to MongoDB at {MONGO_URI}")
        except Exception as e:
            print(f"MongoDB Connection Failed: {e}")
            self.db = None

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
