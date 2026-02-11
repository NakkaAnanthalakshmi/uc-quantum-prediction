import os
import json
import numpy as np
import torch
from backend.ml_engine.preprocessing import extract_features

def pretrain():
    dataset_dir = "datasets"
    images = {
        "healthy": "colon_healthy.png",
        "uc": ["colon_uc_mild.png", "colon_uc_severe.png"]
    }
    
    centroids = {}
    
    # Healthy Centroid
    healthy_path = os.path.join(dataset_dir, images["healthy"])
    if os.path.exists(healthy_path):
        with open(healthy_path, "rb") as f:
            features = extract_features(f.read())
        centroids["healthy"] = features.tolist()
        print(f"Learned signature for: {images['healthy']}")
    
    # UC Centroid
    uc_feats = []
    for f_name in images["uc"]:
        p = os.path.join(dataset_dir, f_name)
        if os.path.exists(p):
            with open(p, "rb") as f:
                uc_feats.append(extract_features(f.read()).tolist())
            print(f"Learned signature for: {f_name}")
    
    if uc_feats:
        centroids["uc"] = np.mean(uc_feats, axis=0).tolist()
        
    if centroids:
        with open("backend/ml_engine/centroids.json", "w") as f:
            json.dump(centroids, f)
        print("Pre-training complete. centroids.json created.")

if __name__ == "__main__":
    pretrain()
