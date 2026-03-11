import sys
import os
sys.path.append(os.getcwd())

try:
    from backend.database.mongodb_client import db_client
    import time
    
    # Wait a moment for background probe
    time.sleep(2)
    
    if db_client.db is not None:
        count = db_client.db.predictions.count_documents({})
        print(f"DEBUG_COUNT: {count}")
    else:
        print("DEBUG_COUNT: No connection")
except Exception as e:
    print(f"DEBUG_ERROR: {e}")
