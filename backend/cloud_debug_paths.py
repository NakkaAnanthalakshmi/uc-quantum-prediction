import os

def check_paths():
    print("--- Path Debugger ---")
    
    # Check CWD
    cwd = os.getcwd()
    print(f"CWD: {cwd}")
    
    # Check file location
    file_path = os.path.abspath(__file__)
    print(f"File: {file_path}")
    
    # Check datasets relative to this file
    base_dir = os.path.dirname(os.path.dirname(file_path))
    dataset_dir = os.path.join(base_dir, "datasets")
    print(f"Expected Dataset Dir: {dataset_dir}")
    
    if os.path.exists(dataset_dir):
        print(f"✅ FOUND at {dataset_dir}")
        print(f"Contents: {os.listdir(dataset_dir)[:5]}")
    else:
        print(f"❌ NOT FOUND at {dataset_dir}")
        
    # Check relative path
    if os.path.exists("datasets"):
        print(f"✅ FOUND at ./datasets")
    elif os.path.exists("../datasets"):
        print(f"✅ FOUND at ../datasets")
    else:
        print(f"❌ NOT FOUND via relative paths")

if __name__ == "__main__":
    check_paths()
