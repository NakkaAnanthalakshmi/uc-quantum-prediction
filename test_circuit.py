import requests
import json

try:
    print("Requesting circuit...")
    response = requests.get("http://localhost:8000/circuit")
    print(f"Status Code: {response.status_code}")
    data = response.json()
    
    if data.get("circuit_diagram"):
        print("SUCCESS: Circuit diagram received (base64 length: " + str(len(data["circuit_diagram"])) + ")")
    else:
        print("FAILURE: No circuit_diagram in response.")
        print("Response:", data)

except Exception as e:
    print(f"Test failed: {e}")
