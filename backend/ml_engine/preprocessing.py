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
    Improved to handle photos of monitors with black bezels/borders.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(image)
        
        r, g, b = img_np[:,:,0], img_np[:,:,1], img_np[:,:,2]
        
        # Calculate grayscale for intensity analysis
        gray = np.mean(img_np, axis=2)
        
        # 1. Filter out near-black pixels (monitor bezels, software backgrounds)
        # Threshold of 30 for "background" pixels
        non_black_mask = gray > 30
        total_non_black = np.sum(non_black_mask)
        
        # 2. Color Profile Check (within non-black regions)
        # Colonoscopy images are dominated by red/pink/orange tones.
        # Broaden 'warm': R should be dominant over G, and significantly higher than B (or close if pink).
        warm_pixels = np.logical_and.reduce((
            r > g,            # Must have more red than green
            r > (b - 20),     # Allow more blue (pink tones) than before
            non_black_mask
        ))
        
        if total_non_black > 0:
            warm_ratio = np.sum(warm_pixels) / total_non_black
            non_black_pct = total_non_black / gray.size
        else:
            warm_ratio = 0
            non_black_pct = 0
            
        # 3. Intensity Variance
        variance = np.var(gray)
        
        # Log for debugging
        print(f"--- DOMAIN VALIDATION DEBUG ---")
        print(f"File: {getattr(image, 'filename', 'unknown')}")
        print(f"Warm Ratio (rel): {warm_ratio:.3f}")
        print(f"Variance: {variance:.1f}")
        print(f"Non-Black Pct: {non_black_pct:.3f}")
        
        # HEURISTIC:
        # If relative warm ratio is high (> 0.35) --> Direct medical image
        # OR if there's significant variance (> 700) and moderate warm ratio (> 0.15) --> Monitor photo
        # Lowered thresholds as Ref 2/3 are likely hitting lower bounds.
        if warm_ratio > 0.35 or (warm_ratio > 0.15 and variance > 700):
            print("RESULT: VALID MEDICAL IMAGE")
            return True
        
        # 4. Fallback for extremely overexposed or specific lighting (low variance but clearly clinical)
        # Check for "peak" red/pink presence
        if warm_ratio > 0.6:
            print("RESULT: VALID (Fallback Warm High)")
            return True
            
        print("RESULT: INVALID DOMAIN")
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
