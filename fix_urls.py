import os
import re

frontend_dir = r"D:\quantum project\frontend"
target_pattern = r'http://localhost:8001'
replacement = "window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8001' : '/api'"

files_to_update = [
    "addons/analytics.js",
    "addons/compare.js",
    "addons/circuit_interactive.js",
    "addons/multi_compare.js",
    "addons/quantum_lab.js",
    "addons/feature_maps.js",
    "addons/explainable_ai.js",
    "addons/ensemble.js",
    "addons/csv_predictor.js",
    "addons/dashboard.js"
]

for file_rel_path in files_to_update:
    file_path = os.path.join(frontend_dir, file_rel_path.replace("/", os.sep))
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Determine if it's double or single quotes
        if f'"{target_pattern}"' in content:
            new_content = content.replace(f'"{target_pattern}"', replacement)
        elif f"'{target_pattern}'" in content:
            new_content = content.replace(f"'{target_pattern}'", replacement)
        else:
            new_content = content.replace(target_pattern, replacement)
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {file_rel_path}")

# Special case for db_explorer.html
db_path = os.path.join(frontend_dir, "addons", "db_explorer.html")
if os.path.exists(db_path):
    with open(db_path, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = content.replace('"http://localhost:8001"', replacement)
    with open(db_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated: addons/db_explorer.html")
