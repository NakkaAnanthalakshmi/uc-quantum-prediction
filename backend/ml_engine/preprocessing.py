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

def is_medical_image(image_bytes):
    """
    Heuristic to check if an image is likely a colonoscopy or medical image.
    Uses color distribution and basic texture analysis.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(image)
        
        # 1. Color Profile Check
        # Colonoscopy images are dominated by red/pink/orange tones.
        # We calculate the average R, G, B values.
        # r_avg, g_avg, b_avg = np.mean(img_np, axis=(0, 1))
        
        # More robust: check if R > G > B for most pixels
        r, g, b = img_np[:,:,0], img_np[:,:,1], img_np[:,:,2]
        
        # Calculate percentage of "warm" pixels (common in endoscopy)
        warm_pixels = np.logical_and(r > g, g > b)
        warm_ratio = np.sum(warm_pixels) / (img_np.shape[0] * img_np.shape[1])
        
        # 2. Intensity Variance (Medical images have high contrast/vignetting)
        gray = np.mean(img_np, axis=2)
        variance = np.var(gray)
        
        # Log for debugging
        print(f"DEBUG DOMAIN: warm_ratio={warm_ratio:.2f}, variance={variance:.2f}")
        
        # HEURISTIC:
        # Colonoscopy images typically have a high warm_ratio (> 0.4) 
        # and a significant intensity variance.
        # Generic person images usually have more balanced R/G/B or different dominant colors.
        if warm_ratio > 0.45 or (warm_ratio > 0.3 and variance > 1000):
            return True
        return False
    except Exception as e:
        print(f"Error in image validation: {e}")
        return True # Default to True to avoid blocking valid cases on error

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
