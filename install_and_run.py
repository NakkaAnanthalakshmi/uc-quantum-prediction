import subprocess
import sys
import os
import uvicorn

def install(package):
    print(f"Installing {package}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

if __name__ == "__main__":
    print(f"Python Executable: {sys.executable}")
    
    # Check and install matplotlib
    try:
        import matplotlib
        print("matplotlib found.")
    except ImportError:
        print("matplotlib NOT found. Installing...")
        install("matplotlib")
        
    try:
        import pandas
        print("pandas found.")
    except ImportError:
        print("pandas NOT found. Installing...")
        install("pandas")

    try:
        import pylatexenc
        print("pylatexenc found.")
    except ImportError:
        print("pylatexenc NOT found. Installing...")
        install("pylatexenc")
        
    # Ensure backend is in path
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    
    # Run Uvicorn
    print("Starting Server...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
