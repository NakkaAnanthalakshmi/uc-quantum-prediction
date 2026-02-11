import os
import torch
import numpy as np
from PIL import Image
from backend.ml_engine.preprocessing import extract_features

def analyze_dataset():
    dataset_dir = "datasets"
    files = [f for f in os.listdir(dataset_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    print(f"{'Filename':<25} | {'Mean':<10} | {'Std':<10}")
    print("-" * 50)
    
    for filename in files:
        path = os.path.join(dataset_dir, filename)
        with open(path, "rb") as f:
            image_bytes = f.read()
        
        features = extract_features(image_bytes)
        f_mean = np.mean(features)
        f_std = np.std(features)
        
        print(f"{filename:<25} | {f_mean:<10.4f} | {f_std:<10.4f}")

if __name__ == "__main__":
    analyze_dataset()
