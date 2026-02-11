import csv
import random
import os

# Define the 25 clinical parameters
parameters = [
    "Patient_ID", "RBC", "WBC", "PLT", "HGB", "HCT", "MCHC", "PCT", "PDW", "MPV", 
    "PLCR", "NEUT", "Lymphocytes", "MONO", "CRP", "ESR", "Fibrinogen", "SI", 
    "Ferritin", "TP", "Albumin", "A1G", "A2G", "Beta1", "Beta2", "Gamma", "Label"
]

def generate_patient_data(patient_id, label):
    # Generate realistic-looking values for clinical parameters
    # label: 1 for UC, 0 for Healthy
    data = {
        "Patient_ID": f"P{patient_id:03d}",
        "RBC": round(random.uniform(3.5, 5.5), 2),
        "WBC": round(random.uniform(4.0, 11.0) * (1.5 if label else 1.0), 2), # Elevated in UC
        "PLT": round(random.uniform(150, 450) * (1.2 if label else 1.0), 0),
        "HGB": round(random.uniform(11, 16) * (0.8 if label else 1.0), 1), # Lower in UC (anemia)
        "HCT": round(random.uniform(35, 45), 1),
        "MCHC": round(random.uniform(31, 37), 1),
        "PCT": round(random.uniform(0.1, 0.5), 2),
        "PDW": round(random.uniform(10, 20), 1),
        "MPV": round(random.uniform(7, 12), 1),
        "PLCR": round(random.uniform(15, 45), 1),
        "NEUT": round(random.uniform(40, 75) * (1.2 if label else 1.0), 1),
        "Lymphocytes": round(random.uniform(20, 45), 1),
        "MONO": round(random.uniform(2, 10), 1),
        "CRP": round(random.uniform(0, 10) * (10 if label else 1.0), 2), # Significantly elevated in UC
        "ESR": round(random.uniform(0, 20) * (5 if label else 1.0), 0), # Elevated in UC
        "Fibrinogen": round(random.uniform(200, 400), 0),
        "SI": round(random.uniform(50, 170), 0),
        "Ferritin": round(random.uniform(20, 300), 0),
        "TP": round(random.uniform(6, 8), 1),
        "Albumin": round(random.uniform(3.5, 5.0) * (0.8 if label else 1.0), 1), # Lower in UC
        "A1G": round(random.uniform(0.1, 0.3), 2),
        "A2G": round(random.uniform(0.5, 1.0), 2),
        "Beta1": round(random.uniform(0.4, 0.9), 2),
        "Beta2": round(random.uniform(0.2, 0.5), 2),
        "Gamma": round(random.uniform(0.7, 1.5), 2),
        "Label": "Ulcerative Colitis" if label else "Healthy"
    }
    return data

def main():
    dataset_dir = "datasets"
    if not os.path.exists(dataset_dir):
        os.makedirs(dataset_dir)
    
    file_path = os.path.join(dataset_dir, "clinical_blood_results.csv")
    
    with open(file_path, mode="w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=parameters)
        writer.writeheader()
        
        # Generate 10 UC patients and 10 Healthy patients
        for i in range(1, 11):
            writer.writerow(generate_patient_data(i, 1))
        for i in range(11, 21):
            writer.writerow(generate_patient_data(i, 0))
            
    print(f"Successfully created clinical dataset at: {file_path}")

if __name__ == "__main__":
    main()
