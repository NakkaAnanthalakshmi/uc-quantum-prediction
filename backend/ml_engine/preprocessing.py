import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import io
import numpy as np

# Load pre-trained ResNet18
# We rely on internet access to download weights being allowed? Usually yes for tool use, but wait.
# If no internet, this will fail.
# User environment usually allows downloading models.
resnet = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
resnet.fc = nn.Identity() # Remove classification layer
resnet.eval()

preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def extract_features(image_bytes):
    """
    Extracts high-level features from an image using ResNet18.
    Returns a numpy array of shape (512,)
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = preprocess(image).unsqueeze(0)
        with torch.no_grad():
            features = resnet(tensor)
        return features.numpy().flatten()
    except Exception as e:
        print(f"Error in feature extraction: {e}")
        raise e
