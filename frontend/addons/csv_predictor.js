const API_BASE = "http://localhost:8001";

document.addEventListener('DOMContentLoaded', () => {
    setupDragDrop();
});

function setupDragDrop() {
    const dropZone = document.getElementById('drop-zone');

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-active');
            if (eventName === 'drop') {
                const files = e.dataTransfer.files;
                if (files.length) handleFileUpload({ target: { files } });
            }
        }, false);
    });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.csv')) {
        processCSV(file);
    } else {
        alert('Please upload a valid CSV file');
    }
}

async function loadSample(fileName) {
    try {
        // Now fetching from the frontend directory
        const response = await fetch(`../datasets/unlabeled/${fileName}`);
        if (!response.ok) throw new Error('Could not load sample file');

        const blob = await response.blob();
        const file = new File([blob], fileName, { type: 'text/csv' });
        processCSV(file);
    } catch (error) {
        console.error('Error loading sample:', error);
        alert(`Could not load sample dataset: ${fileName}. Please ensure the file exists in datasets/unlabeled/`);
    }
}

async function processCSV(file) {
    showLoader(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE}/predict-csv-batch`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Batch prediction failed');
        }

        const data = await response.json();
        renderResults(data.results);
    } catch (error) {
        console.error('Batch Prediction Error:', error);
        alert('Error analyzing CSV: ' + error.message);
        showLoader(false);
    }
}

function showLoader(isLoading) {
    document.getElementById('results-placeholder').classList.toggle('hidden', isLoading);
    document.getElementById('results-loader').classList.toggle('hidden', !isLoading);
    document.getElementById('table-container').classList.add('hidden');
    document.getElementById('export-btn').classList.add('hidden');
}

function renderResults(results) {
    const tbody = document.getElementById('results-body');
    const statsEl = document.getElementById('batch-stats');
    const exportBtn = document.getElementById('export-btn');

    tbody.innerHTML = '';
    let posCount = 0;

    results.forEach((res, index) => {
        if (res.IsPositive) posCount++;

        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 50}ms`;

        tr.innerHTML = `
            <td class="p-3 font-mono text-gray-500">${res.Patient_ID}</td>
            <td class="p-3">
                <div class="flex flex-col">
                    <span class="text-[10px] text-gray-500">CRP: ${res.CRP}</span>
                    <span class="text-[10px] text-gray-500">ESR: ${res.ESR}</span>
                </div>
            </td>
            <td class="p-3">
                <span class="status-badge ${res.IsPositive ? 'status-positive' : 'status-healthy'}">
                    ${res.Prediction}
                </span>
            </td>
            <td class="p-3 text-right font-semibold text-white">${res.Confidence.toFixed(1)}%</td>
        `;
        tbody.appendChild(tr);
    });

    statsEl.textContent = `| Total: ${results.length} | UC+: ${posCount} | Healthy: ${results.length - posCount}`;

    document.getElementById('results-loader').classList.add('hidden');
    document.getElementById('table-container').classList.remove('hidden');
    exportBtn.classList.remove('hidden');

    // Setup Export Action
    exportBtn.onclick = () => exportResultsToCSV(results);
}

async function exportResultsToCSV(results) {
    const exportBtn = document.getElementById('export-btn');
    const originalText = exportBtn.textContent;

    exportBtn.textContent = '⏳ Saving...';
    exportBtn.disabled = true;

    // SERVER-SIDE SAVE ONLY
    try {
        const response = await fetch(`${API_BASE}/save-prediction-csv`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: results })
        });

        if (response.ok) {
            const data = await response.json();
            exportBtn.textContent = '✅ Saved to Server';
            exportBtn.classList.replace('bg-emerald-600', 'bg-blue-600');

            setTimeout(() => {
                exportBtn.textContent = originalText;
                exportBtn.disabled = false;
                exportBtn.classList.replace('bg-blue-600', 'bg-emerald-600');
            }, 3000);

            console.log(`Saved: ${data.path}`);
        } else {
            throw new Error('Server rejected the save request');
        }
    } catch (error) {
        console.error('Error saving to server:', error);
        alert('❌ Failed to save to server: ' + error.message);
        exportBtn.textContent = originalText;
        exportBtn.disabled = false;
    }
}
