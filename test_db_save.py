from backend.database.mongodb_client import db_client
import bson

print("Testing XAI save...")
try:
    db_client.save_xai_analysis(
        patient_id="test_patient",
        original_image=b"test",
        saliency_map=b"test",
        analysis={"test": "data"}
    )
    print("XAI save successful")
except Exception as e:
    print(f"XAI save failed: {e}")

print("Testing Ensemble save...")
try:
    db_client.save_ensemble_result(
        weights={"A": 0.5, "B": 0.5},
        results=[],
        final_decision={"prediction": "Test", "confidence": 99.9}
    )
    print("Ensemble save successful")
except Exception as e:
    print(f"Ensemble save failed: {e}")
