import os
import sys

print(f"CWD: {os.getcwd()}")
print(f"__file__: {os.path.abspath(__file__)}")

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dataset_dir = os.path.join(base_dir, "datasets")

print(f"Base Dir: {base_dir}")
print(f"Dataset Dir: {dataset_dir}")
print(f"Exists: {os.path.exists(dataset_dir)}")

if os.path.exists(dataset_dir):
    print(f"Contents: {os.listdir(dataset_dir)}")
else:
    print("Dataset directory not found via constructed path.")

# Check relative path too
if os.path.exists("datasets"):
    print(f"Relative 'datasets' exists. Contents: {os.listdir('datasets')}")
else:
    print("Relative 'datasets' not found.")
