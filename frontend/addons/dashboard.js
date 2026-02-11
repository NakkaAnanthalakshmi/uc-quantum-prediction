const API_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : 'http://localhost:8001';

let currentSessionParams = {
    reps: 2,
    entanglement: 'linear',
    accuracy: 'N/A'
};

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();

    document.getElementById('start-training').addEventListener('click', runTraining);
    document.getElementById('save-btn').addEventListener('click', saveModel);
    document.getElementById('refresh-files').addEventListener('click', (e) => {
        e.preventDefault();
        loadDatasetFiles();
    });

    // Clinical Search Implementation
    const searchInput = document.getElementById('diagnostic-search-input');
    const searchBtn = document.getElementById('search-btn');
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', runClinicalSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') runClinicalSearch();
        });
    }
});

async function runClinicalSearch() {
    const query = document.getElementById('diagnostic-search-input').value;
    const resultsDropdown = document.getElementById('search-results-dropdown');

    if (!query) {
        resultsDropdown.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/diagnostic-search?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            resultsDropdown.style.display = 'block';
            resultsDropdown.innerHTML = data.results.map(r => `
                <div style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; transition: background 0.3s;" 
                    onmouseover="this.style.background='rgba(59, 130, 246, 0.1)'" onmouseout="this.style.background='transparent'">
                    <div>
                        <div style="font-weight: 700; color: var(--accent-purple);">${r.patient_id}</div>
                        <div style="font-size: 0.8rem; color: var(--text-dim);">${r.timestamp} • ${r.prediction}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <span style="font-size: 0.75rem; background: rgba(59,130,246,0.2); color: var(--accent-blue); padding: 0.2rem 0.5rem; border-radius: 4px;">Conf: ${r.confidence}</span>
                        <button class="back-btn" style="padding: 0.3rem 0.6rem; font-size: 0.7rem;" onclick="window.location.href='../index.html?load_patient=${r.patient_id}'">OPEN</button>
                    </div>
                </div>
            `).join('');
        } else {
            resultsDropdown.style.display = 'block';
            resultsDropdown.innerHTML = '<p style="padding: 1rem; color: var(--text-dim); text-align: center; font-size: 0.9rem;">No matching diagnostic records found.</p>';
        }
    } catch (e) {
        console.error('Search error:', e);
    }
}

async function loadDashboardData() {
    await loadComparison();
    await loadInventory();
    await loadDatasetFiles();
}

async function loadDatasetFiles() {
    const checklist = document.getElementById('file-checklist');
    try {
        const res = await fetch(`${API_URL}/dataset-files`);
        const data = await res.json();

        if (!data.files || data.files.length === 0) {
            checklist.innerHTML = '<p style="color: var(--text-dim); font-size: 0.75rem;">No files found in /datasets</p>';
            return;
        }

        checklist.innerHTML = data.files.map(file => `
            <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; font-size: 0.8rem; cursor: pointer; color: var(--text-dim);">
                <input type="checkbox" class="dataset-file" value="${file}" checked style="accent-color: var(--accent-purple);">
                <span>${file}</span>
            </label>
        `).join('');
    } catch (e) {
        checklist.innerHTML = '<p style="color: #ff5555; font-size: 0.75rem;">Error loading files.</p>';
    }
}

async function setConfig(name, reps, entanglement) {
    currentSessionParams.reps = reps;
    currentSessionParams.entanglement = entanglement;
    alert(`Configuration Switched to: ${name}\n(Reps: ${reps}, Entanglement: ${entanglement})`);
}

async function loadComparison() {
    try {
        const res = await fetch(`${API_URL}/compare`);
        const data = await res.json();
        const tbody = document.getElementById('comparison-body');

        tbody.innerHTML = data.configurations.map(conf => {
            const reps = conf.name.includes('Linear') ? 2 : 3;
            const ent = conf.name.includes('Linear') ? 'linear' : 'circular';
            return `
                <tr>
                    <td>${conf.name}</td>
                    <td><span class="metric-tag">${conf.accuracy}</span></td>
                    <td>${conf.circuit_depth} layers</td>
                    <td><button class="back-btn" onclick="setConfig('${conf.name}', ${reps}, '${ent}')">USE</button></td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Failed to load comparison data');
    }
}

async function loadInventory() {
    const container = document.getElementById('model-inventory');
    try {
        const res = await fetch(`${API_URL}/models`);
        const data = await res.json();

        if (!data.saved || data.saved.length === 0) {
            container.innerHTML = '<p style="color: var(--text-dim); font-size: 0.85rem;">No saved models found in backend/saved_models/</p>';
            return;
        }

        container.innerHTML = data.saved.map(model => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; font-size: 0.95rem;">${model.name}</div>
                    <div style="color: var(--text-dim); font-size: 0.75rem;">${model.date} • Acc: ${model.accuracy} • R:${model.params.reps} E:${model.params.entanglement}</div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="back-btn" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="alert('Model ${model.id} loaded successfully')">LOAD FILE</button>
                    <button class="back-btn" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; border-color: rgba(255, 85, 85, 0.3); color: #ff5555;" onmouseover="this.style.background='rgba(255, 85, 85, 0.1)'" onmouseout="this.style.background='transparent'" onclick="deleteModel('${model.id}')">DELETE</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p style="color: #ff5555; font-size: 0.85rem;">Error loading model inventory.</p>';
    }
}

async function deleteModel(modelId) {
    if (!confirm(`Are you sure you want to delete model ${modelId}?`)) return;

    try {
        const res = await fetch(`${API_URL}/delete-model/${modelId}`, { method: 'DELETE' });
        const data = await res.json();
        alert(data.message);
        loadInventory(); // Refresh the list
    } catch (e) {
        alert('Failed to delete model.');
    }
}

async function runTraining() {
    const selected = Array.from(document.querySelectorAll('.dataset-file:checked')).map(cb => cb.value);
    if (selected.length === 0) return alert('Please select at least one file to train on!');

    const btn = document.getElementById('start-training');
    const bar = document.getElementById('training-progress');
    const val = document.getElementById('progress-val');
    const log = document.getElementById('epoch-log');

    btn.disabled = true;
    btn.innerText = 'TRAINING...';
    log.innerHTML = 'Establishing Quantum Link...<br>';

    try {
        const res = await fetch(`${API_URL}/train`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                selected_files: selected,
                reps: currentSessionParams.reps,
                entanglement: currentSessionParams.entanglement
            })
        });
        const data = await res.json();

        if (data.status === 'Error') {
            alert(data.message);
            btn.disabled = false;
            btn.innerText = 'FIX SELECTION & RETRY';
            return;
        }

        log.innerHTML = `Loaded Dataset: ${data.processed_count} files selected.<br><br>`;

        let i = 0;

        const interval = setInterval(() => {
            if (i >= data.history.length) {
                clearInterval(interval);
                btn.disabled = false;
                btn.innerText = 'TRAINING COMPLETE';
                log.innerHTML += '<br><b>Dataset processed. Model optimized.</b>';

                // Track the final accuracy for saving
                currentSessionParams.accuracy = data.history[data.history.length - 1].accuracy;

                return;
            }

            const step = data.history[i];
            const percent = ((i + 1) / data.history.length) * 100;

            bar.style.width = `${percent}%`;
            val.innerText = `${Math.round(percent)}%`;

            if (step.source.endsWith('.csv')) {
                log.innerHTML += `[${step.epoch}] ${step.source}: Patient ${step.id} -> ${step.status} (${step.accuracy})<br>`;
            } else {
                log.innerHTML += `[${step.epoch}] ${step.source}: ID ${step.id} -> ${step.status} (${step.accuracy})<br>`;
            }

            log.scrollTop = log.scrollHeight;

            i++;
        }, 800);

    } catch (e) {
        alert('Training failed.');
        btn.disabled = false;
        btn.innerText = 'RETRY';
    }
}

async function saveModel() {
    const nameInput = document.getElementById('save-name');
    const name = nameInput.value;
    if (!name) return alert('Please enter a model name');
    if (currentSessionParams.accuracy === 'N/A') return alert('Please run a Training Cycle before saving!');

    const query = new URLSearchParams({
        model_name: name,
        accuracy: currentSessionParams.accuracy,
        reps: currentSessionParams.reps,
        entanglement: currentSessionParams.entanglement
    }).toString();

    try {
        const res = await fetch(`${API_URL}/save-model?${query}`, { method: 'POST' });
        const data = await res.json();
        alert(data.message);
        nameInput.value = '';
        loadInventory(); // Refresh the list
    } catch (e) {
        alert('Save failed.');
    }
}
