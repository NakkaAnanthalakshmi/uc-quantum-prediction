const API_URL = 'http://localhost:8001';

document.addEventListener('DOMContentLoaded', () => {
    loadComparisonData();
});

async function loadComparisonData() {
    const grid = document.getElementById('comparison-grid');
    const loading = document.getElementById('loading-state');

    try {
        const res = await fetch(`${API_URL}/compare-circuits`);
        const data = await res.json();

        loading.style.display = 'none';

        if (!data.comparisons || data.comparisons.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: var(--text-dim); grid-column: 1/-1;">No model configurations found to compare.</p>';
            return;
        }

        grid.innerHTML = data.comparisons.map(conf => `
            <div class="model-card">
                <div class="card-header">
                    <h3>${conf.name}</h3>
                    <span class="accuracy-badge">${conf.accuracy}</span>
                </div>
                
                <div class="params-info">
                    <div class="param-item">
                        <label>Reps</label>
                        <span>${conf.reps}</span>
                    </div>
                    <div class="param-item">
                        <label>Entanglement</label>
                        <span>${conf.entanglement}</span>
                    </div>
                    <div class="param-item">
                        <label>Depth</label>
                        <span>${conf.depth} Layers</span>
                    </div>
                </div>

                <div class="circuit-container">
                    <label>Quantum Topology</label>
                    <img src="data:image/png;base64,${conf.diagram}" alt="${conf.name} Circuit">
                </div>
            </div>
        `).join('');

    } catch (e) {
        loading.innerHTML = '<p style="color: #ff5555;">Failed to connect to Quantum Server.</p>';
        console.error('Comparison Load Error:', e);
    }
}
