const API_BASE = "http://localhost:8001";
let ensembleChart = null;

document.addEventListener("DOMContentLoaded", () => {
    initChart();
    updateWeights();
});

function initChart() {
    const ctx = document.getElementById('ensembleChart').getContext('2d');
    ensembleChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Model A (QSVC)', 'Model B (VQC)', 'Model C (Kernel)'],
            datasets: [{
                label: 'Prediction Confidence (%)',
                data: [92, 84, 71],
                backgroundColor: [
                    'rgba(168, 85, 247, 0.6)',
                    'rgba(236, 72, 153, 0.6)',
                    'rgba(59, 130, 246, 0.6)'
                ],
                borderColor: [
                    '#a855f7',
                    '#ec4899',
                    '#3b82f6'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function updateWeights(source) {
    const w1 = parseInt(document.getElementById('weight1').value);
    const w2 = parseInt(document.getElementById('weight2').value);
    const w3 = parseInt(document.getElementById('weight3').value);

    // Normalize or just update labels
    document.getElementById('weight1-val').textContent = w1 + '%';
    document.getElementById('weight2-val').textContent = w2 + '%';
    document.getElementById('weight3-val').textContent = w3 + '%';
}

function runEnsemble() {
    // Show results section
    document.getElementById('results-display').style.display = 'grid';

    // Simulate thinking
    const btn = event.currentTarget;
    const oldText = btn.textContent;
    btn.textContent = '🔄 PROCESSING QUANTUM VOTES...';
    btn.disabled = true;

    const w1 = parseInt(document.getElementById('weight1').value);
    const w2 = parseInt(document.getElementById('weight2').value);
    const w3 = parseInt(document.getElementById('weight3').value);

    // Call Backend for real logging and prediction
    fetch(`${API_BASE}/ensemble-predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            weights: { "Model A": w1, "Model B": w2, "Model C": w3 },
            results: [
                { model: "Model A (QSVC)", conf: 70 + Math.random() * 25 },
                { model: "Model B (VQC)", conf: 65 + Math.random() * 30 },
                { model: "Model C (Kernel)", conf: 60 + Math.random() * 35 }
            ]
        })
    })
        .then(res => res.json())
        .then(data => {
            btn.textContent = oldText;
            btn.disabled = false;

            const isPositive = data.prediction.includes('Positive');
            const conf = data.confidence;

            const decisionText = document.getElementById('final-decision-text');
            decisionText.textContent = data.prediction.toUpperCase();
            decisionText.className = `text-4xl font-black mb-4 ${isPositive ? 'text-red-400' : 'text-green-400'}`;

            document.getElementById('final-confidence-bar').style.width = conf + '%';
            document.getElementById('final-confidence-text').textContent = conf.toFixed(0) + '%';

            // Update chart
            ensembleChart.data.datasets[0].data = [
                70 + Math.random() * 25,
                65 + Math.random() * 30,
                60 + Math.random() * 35
            ];
            ensembleChart.update();

            // Smooth scroll to results
            document.getElementById('results-display').scrollIntoView({ behavior: 'smooth' });
        })
        .catch(err => {
            console.error('Ensemble failed:', err);
            btn.textContent = oldText;
            btn.disabled = false;
        });
}
