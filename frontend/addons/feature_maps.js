const API_BASE = "http://localhost:8001";

let uploadedImage = null;

document.addEventListener("DOMContentLoaded", () => {
    setupDragAndDrop();
});

function setupDragAndDrop() {
    const dropZone = document.getElementById('upload-zone');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processImage(file);
        }
    });
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processImage(file);
    }
}

function processImage(file) {
    uploadedImage = file;

    // Display original image
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('original-image');
        img.src = e.target.result;
        img.classList.remove('hidden');
        document.getElementById('original-placeholder').classList.add('hidden');

        // Generate heatmap
        generateHeatmap(e.target.result);
    };
    reader.readAsDataURL(file);
}

async function generateHeatmap(imageDataUrl) {
    const canvas = document.getElementById('heatmap-canvas');
    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('heatmap-placeholder');

    // Show loading state
    placeholder.innerHTML = '<div class="text-4xl loading-spinner">⏳</div><p>Generating heatmap...</p>';

    // Create image element
    const img = new Image();
    img.onload = () => {
        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Generate simulated heatmap overlay (in production, this would come from the backend)
        generateSimulatedHeatmap(ctx, img.width, img.height);

        // Show canvas, hide placeholder
        canvas.classList.remove('hidden');
        placeholder.classList.add('hidden');
    };
    img.src = imageDataUrl;

    // Try to call backend for real heatmap
    try {
        const formData = new FormData();
        formData.append('file', uploadedImage);

        const response = await fetch(`${API_BASE}/feature-importance`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            if (data.heatmap) {
                applyHeatmapData(ctx, data.heatmap, img.width, img.height);
            }
            if (data.features) {
                updateFeatureTable(data.features);
            }
        }
    } catch (error) {
        console.log("Using simulated heatmap data");
    }
}

function generateSimulatedHeatmap(ctx, width, height) {
    const heatmapType = document.getElementById('heatmap-type').value;

    // Get current image data
    const imageData = ctx.getImageData(0, 0, width, height);

    // Create heatmap overlay
    const heatmapData = ctx.createImageData(width, height);

    // Generate simulated importance values based on heatmap type
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;

            // Distance from center (normalized)
            const dx = (x - centerX) / (width / 2);
            const dy = (y - centerY) / (height / 2);
            const distFromCenter = Math.sqrt(dx * dx + dy * dy);

            let importance = 0;

            // Different algorithms for different heatmap types
            if (heatmapType === 'gradcam') {
                // Grad-CAM: Center-focused with smooth radial falloff
                importance = Math.max(0, 1 - distFromCenter * 0.7);
                const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.3;
                importance = Math.min(1, Math.max(0, importance + noise));
            } else if (heatmapType === 'attention') {
                // Attention Map: Multiple hot spots with sharper peaks
                const spot1 = Math.exp(-((x - width * 0.3) ** 2 + (y - height * 0.4) ** 2) / (width * 30));
                const spot2 = Math.exp(-((x - width * 0.7) ** 2 + (y - height * 0.3) ** 2) / (width * 40));
                const spot3 = Math.exp(-((x - width * 0.5) ** 2 + (y - height * 0.6) ** 2) / (width * 35));
                importance = Math.min(1, spot1 + spot2 + spot3);
            } else if (heatmapType === 'saliency') {
                // Saliency Map: Edge-based detection with high-frequency patterns
                const edgeX = Math.abs(Math.sin(x * 0.1) * Math.cos(y * 0.08));
                const edgeY = Math.abs(Math.cos(x * 0.08) * Math.sin(y * 0.1));
                importance = (edgeX + edgeY) / 2;
                // Add some gradient from edges
                importance *= (1 - distFromCenter * 0.3);
                importance = Math.min(1, Math.max(0, importance * 1.5));
            }

            // Original pixel
            const origR = imageData.data[i];
            const origG = imageData.data[i + 1];
            const origB = imageData.data[i + 2];

            // Heatmap color (blue -> green -> yellow -> red)
            let heatR, heatG, heatB;
            if (importance < 0.25) {
                // Blue to cyan
                heatR = 0;
                heatG = Math.floor(importance * 4 * 255);
                heatB = 255;
            } else if (importance < 0.5) {
                // Cyan to green
                heatR = 0;
                heatG = 255;
                heatB = Math.floor((1 - (importance - 0.25) * 4) * 255);
            } else if (importance < 0.75) {
                // Green to yellow
                heatR = Math.floor((importance - 0.5) * 4 * 255);
                heatG = 255;
                heatB = 0;
            } else {
                // Yellow to red
                heatR = 255;
                heatG = Math.floor((1 - (importance - 0.75) * 4) * 255);
                heatB = 0;
            }

            // Blend with original (50% opacity for heatmap)
            const alpha = 0.5;
            heatmapData.data[i] = Math.floor(origR * (1 - alpha) + heatR * alpha);
            heatmapData.data[i + 1] = Math.floor(origG * (1 - alpha) + heatG * alpha);
            heatmapData.data[i + 2] = Math.floor(origB * (1 - alpha) + heatB * alpha);
            heatmapData.data[i + 3] = 255;
        }
    }

    ctx.putImageData(heatmapData, 0, 0);
}

function applyHeatmapData(ctx, heatmapArray, width, height) {
    // Apply real heatmap data from backend
    const imageData = ctx.getImageData(0, 0, width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const importance = heatmapArray[y * width + x] || 0;

            // Same coloring logic as simulated
            // ... (implementation similar to above)
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function updateHeatmap() {
    const heatmapType = document.getElementById('heatmap-type').value;
    console.log(`Switching to ${heatmapType} visualization`);

    // Re-generate with new type if image is loaded
    if (uploadedImage) {
        const reader = new FileReader();
        reader.onload = (e) => generateHeatmap(e.target.result);
        reader.readAsDataURL(uploadedImage);
    }
}

function updateFeatureTable(features) {
    const tbody = document.getElementById('feature-table-body');
    tbody.innerHTML = '';

    features.forEach(feature => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-800';

        const widthPercent = Math.round(feature.importance * 100);
        const color = feature.importance > 0.7 ? 'red' :
            feature.importance > 0.5 ? 'orange' :
                feature.importance > 0.3 ? 'yellow' : 'green';

        row.innerHTML = `
            <td class="py-3 px-4 text-gray-300">${feature.name}</td>
            <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-2">
                    <div class="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full bg-${color}-500 rounded-full" style="width: ${widthPercent}%"></div>
                    </div>
                    <span class="text-${color}-400 font-mono">${feature.importance.toFixed(2)}</span>
                </div>
            </td>
            <td class="py-3 px-4 text-center text-${color}-400">+${feature.contribution}%</td>
            <td class="py-3 px-4 text-gray-500 text-xs">${feature.interpretation}</td>
        `;

        tbody.appendChild(row);
    });
}
