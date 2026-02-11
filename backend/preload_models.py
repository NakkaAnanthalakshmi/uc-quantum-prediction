import torchvision.models as models
import os

print("BUILD PHASE: Pre-loading ResNet18 weights...")
try:
    # This triggers the download and caches it in /root/.cache/torch/hub/checkpoints
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    print("SUCCESS: ResNet18 weights downloaded and cached.")
except Exception as e:
    print(f"FAILURE: Could not download model during build: {e}")
    # We do not exit with error, allowing runtime retry, but logs will show failure
