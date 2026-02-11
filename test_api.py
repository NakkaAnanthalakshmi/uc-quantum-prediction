import requests
import os

# Use the uploaded image path
file_path = "C:/Users/Lahari/.gemini/antigravity/brain/04fd8ad5-6716-438f-bd61-1c7e35d6241d/uploaded_image_1766485249414.png"
if not os.path.exists(file_path):
    # Fallback if file doesn't exist (e.g. testing in a different context), create a dummy image
    from PIL import Image
    img = Image.new('RGB', (100, 100), color = 'red')
    file_path = "dummy.png"
    img.save(file_path)

url = "http://localhost:8000/predict"

try:
    with open(file_path, "rb") as f:
        print(f"Sending request to {url} with {file_path}...")
        response = requests.post(url, files={"file": f})
    
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print("Response JSON:")
    print(data)
    
    if "circuit_diagram" in data and data["circuit_diagram"]:
        print("SUCCESS: Circuit diagram received.")
    else:
        print("WARNING: No circuit diagram in response.")
except Exception as e:
    print(f"Test failed: {e}")
