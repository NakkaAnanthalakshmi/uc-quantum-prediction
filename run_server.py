import uvicorn
import sys
import os

if __name__ == "__main__":
    print(f"Running with Python: {sys.executable}")
    print(f"Current Working Directory: {os.getcwd()}")
    
    # Ensure backend is in path
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    
    # Run Uvicorn
    # NOTE: reload=True can cause extra processes and unexpected restarts on Windows.
    # Keep it off for reliable local serving.
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8001, reload=False)
