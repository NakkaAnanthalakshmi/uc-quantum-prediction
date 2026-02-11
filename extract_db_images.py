import pymongo
import base64
import os
from datetime import datetime

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "quantum_clinical_db"
ARTIFACTS_DIR = r"C:\Users\Lahari\.gemini\antigravity\brain\b90879ae-8005-4012-9743-ab127762eb3a"

def extract_latest_assets():
    if not os.path.exists(ARTIFACTS_DIR):
        os.makedirs(ARTIFACTS_DIR)

    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    # 1. Extract latest circuit
    circuit = db.prediction_circuits.find_one(sort=[("timestamp", -1)])
    if circuit and "diagram" in circuit:
        data = circuit["diagram"]
        if isinstance(data, str):
            import base64
            data = base64.b64decode(data)
        with open(os.path.join(ARTIFACTS_DIR, "db_verified_circuit.png"), "wb") as f:
            f.write(data)
        print("Extracted latest circuit.")

    # 2. Extract latest prediction image
    prediction = db.predictions.find_one({"image": {"$ne": None}}, sort=[("timestamp", -1)])
    if prediction and "image" in prediction:
        data = prediction["image"]
        if isinstance(data, str):
            import base64
            data = base64.b64decode(data)
        with open(os.path.join(ARTIFACTS_DIR, "db_verified_prediction.png"), "wb") as f:
            f.write(data)
        print("Extracted latest prediction image.")

if __name__ == "__main__":
    extract_latest_assets()
