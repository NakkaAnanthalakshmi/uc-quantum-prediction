from backend.database.mongodb_client import db_client
from bson import ObjectId

print("--- XAI RECORDS ---")
xai_recs = list(db_client.db.xai_results.find())
print(f"Total XAI: {len(xai_recs)}")
for r in xai_recs:
    has_conclusion = "analysis" in r and "conclusion" in r["analysis"]
    print(f"ID: {r['_id']}, Patient: {r.get('patient_id')}, Timestamp: {r.get('timestamp')}, Valid: {has_conclusion}")

print("\n--- ENSEMBLE RECORDS ---")
ens_recs = list(db_client.db.ensemble_logs.find())
print(f"Total ENS: {len(ens_recs)}")
for r in ens_recs:
    is_test = r.get("final_decision", {}).get("prediction") == "Test"
    print(f"ID: {r['_id']}, Weights: {r.get('weights')}, Timestamp: {r.get('timestamp')}, IsTest: {is_test}")

# Cleanup test records
print("\n--- CLEANUP ---")
res_xai = db_client.db.xai_results.delete_many({"patient_id": "test_patient"})
res_ens = db_client.db.ensemble_logs.delete_many({"final_decision.prediction": "Test"})
print(f"Deleted {res_xai.deleted_count} XAI test records")
print(f"Deleted {res_ens.deleted_count} ENS test records")
