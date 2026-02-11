from qiskit.circuit.library import ZZFeatureMap
import numpy as np

fm = ZZFeatureMap(4)
print(f"Attributes: {dir(fm)}")
print(f"Type: {type(fm)}")
try:
    print(f"has assign: {hasattr(fm, 'assign_parameters')}")
    print(f"has bind: {hasattr(fm, 'bind_parameters')}")
except Exception as e:
    print(f"Error checking: {e}")
