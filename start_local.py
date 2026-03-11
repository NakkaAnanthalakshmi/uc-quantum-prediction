import subprocess
import time
import sys
import os

def start_servers():
    print("--- Clinical Quantum Startup Engine ---")
    
    # 1. Start Backend (Port 8001)
    print("CORE: Starting Backend on Port 8001...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8001"],
        stdout=None,
        stderr=None
    )
    
    # Give backend a moment to bind
    time.sleep(2)
    
    # 2. Start Frontend (Port 3000)
    print("UI: Starting Frontend on Port 3000...")
    frontend_dir = os.path.join(os.getcwd(), 'frontend')
    frontend_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", "3000"],
        cwd=frontend_dir,
        stdout=None,
        stderr=None
    )
    
    print("\nSUCCESS: Both services are launching!")
    print(f"-> LOCAL FRONTEND: http://localhost:3000")
    print(f"-> LOCAL BACKEND:  http://localhost:8001/health")
    print("\nIMPORTANT: Keep this window open. Press Ctrl+C to stop both servers.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nSHUTDOWN: Stopping servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Done.")

if __name__ == "__main__":
    start_servers()
