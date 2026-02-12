import os
import json
import sys
from datetime import datetime

# Add backend to path so we can import our client
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from database.mongodb_client import MongoClient

def sync_local_models_to_cloud():
    print("🚀 Starting One-Time Model Sync to Cloud...")
    
    # 1. Initialize DB Client
    client = MongoClient()
    
    # Atlas Connection String (Shadow Sync)
    CLOUD_URL = "mongodb+srv://ananthalakshminakka157:LahariJimmy%40157@cluster0.xtlvw.mongodb.net/?appName=Cluster0"
    
    # Wait for connection (it runs in background thread)
    import time
    max_wait = 10
    while not client.is_connected and max_wait > 0:
        print("...waiting for database connection...")
        time.sleep(1)
        max_wait -= 1
        
    if not client.is_connected:
        print("❌ FAILED: Could not connect to MongoDB Atlas. Check your MONGO_URL.")
        return

    # 2. Get local models
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(base_dir, "backend", "saved_models")
    
    if not os.path.exists(model_dir):
        print(f"❌ FAILED: Local models directory not found at {model_dir}")
        return

    local_files = [f for f in os.listdir(model_dir) if f.endswith(".json")]
    print(f"📂 Found {len(local_files)} local models. Syncing now...")

    # 3. Upload each model
    synced_count = 0
    for filename in local_files:
        filepath = os.path.join(model_dir, filename)
        try:
            with open(filepath, "r") as f:
                model_data = json.load(f)
                
            # Use save_trained_model logic
            if client.save_trained_model(model_data):
                synced_count += 1
                print(f"✅ Synced: {filename}")
            else:
                print(f"⚠️ Skipped/Failed: {filename}")
        except Exception as e:
            print(f"❌ Error syncing {filename}: {e}")

    print(f"\n✨ SYNC COMPLETE! {synced_count} models are now in the cloud.")
    print("Refresh your Render app to see them! 🚀")

if __name__ == "__main__":
    sync_local_models_to_cloud()
