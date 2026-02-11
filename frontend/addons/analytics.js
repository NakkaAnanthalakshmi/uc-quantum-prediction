// API Base URL
const API_BASE = "http://localhost:8001";

let globalData = null;
let rocrChart = null;
let histChart = null;
let currentMode = 'image';

document.addEventListener("DOMContentLoaded", () => {
    fetchAnalyticsData();
});

async function fetchAnalyticsData() {
    try {
        const response = await fetch(`${API_BASE}/model-analytics`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        globalData = await response.json();

        // Initial render
        renderHistory(globalData.history);
        switchMode('image');

    } catch (error) {
        console.error("Failed to load analytics:", error);
    }
}

window.switchMode = function (mode) {
    currentMode = mode;
    if (!globalData) return;

    // Update Buttons
    const btnImg = document.getElementById('btn-image');
    const btnClin = document.getElementById('btn-clinical');

    if (mode === 'image') {
        btnImg.className = "px-6 py-2 rounded-full border border-cyan-500 bg-cyan-500/20 text-cyan-300 font-bold shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all";
        btnClin.className = "px-6 py-2 rounded-full border border-gray-700 bg-gray-800 text-gray-400 font-bold hover:text-white transition-all";
    } else {
        btnClin.className = "px-6 py-2 rounded-full border border-purple-500 bg-purple-500/20 text-purple-300 font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all";
        btnImg.className = "px-6 py-2 rounded-full border border-gray-700 bg-gray-800 text-gray-400 font-bold hover:text-white transition-all";
    }

    const data = globalData[mode];
    updateKPIs(data);
    renderROC(data);
    renderConfusionMatrix(data);
}

function updateKPIs(data) {
    if (data && data.roc && data.roc.auc) {
        document.getElementById('auc-score').innerText = data.roc.auc.toFixed(3);
    } else {
        document.getElementById('auc-score').innerText = "0.00";
    }

    if (data && data.n_samples !== undefined) {
        document.getElementById('training-samples-count').innerText = data.n_samples;
        document.getElementById('training-samples-desc').innerText = currentMode === 'image' ? "Balanced High-Fidelity Images" : "Clinical Patient Records";
    }
}

function renderROC(data) {
    const ctxRoc = document.getElementById('rocChart').getContext('2d');

    if (rocrChart) rocrChart.destroy();

    const color = currentMode === 'image' ? '#22d3ee' : '#a855f7'; // Cyan vs Purple
    const bg = currentMode === 'image' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(168, 85, 247, 0.1)';

    rocrChart = new Chart(ctxRoc, {
        type: 'line',
        data: {
            labels: data.roc.fpr,
            datasets: [{
                label: `ROC Curve (AUC = ${data.roc.auc ? data.roc.auc.toFixed(2) : '0.00'})`,
                data: data.roc.tpr,
                borderColor: color,
                backgroundColor: bg,
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 0
            }, {
                label: 'Random Guess',
                data: data.roc.fpr,
                borderColor: '#4b5563',
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'False Positive Rate', color: '#9ca3af' },
                    grid: { color: 'rgba(75, 85, 99, 0.2)' },
                    ticks: { color: '#9ca3af' }
                },
                y: {
                    title: { display: true, text: 'True Positive Rate', color: '#9ca3af' },
                    grid: { color: 'rgba(75, 85, 99, 0.2)' },
                    ticks: { color: '#9ca3af' },
                    min: 0, max: 1
                }
            },
            plugins: {
                legend: { labels: { color: '#e5e7eb' } }
            }
        }
    });
}

function renderHistory(historyData) {
    const ctxHist = document.getElementById('historyChart').getContext('2d');
    const epochs = historyData.accuracy.map((_, i) => `Epoch ${i + 1}`);

    if (histChart) histChart.destroy();

    histChart = new Chart(ctxHist, {
        type: 'line',
        data: {
            labels: epochs,
            datasets: [{
                label: 'Accuracy',
                data: historyData.accuracy,
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                borderWidth: 2,
                tension: 0.3
            }, {
                label: 'Loss',
                data: historyData.loss,
                borderColor: '#f43f5e',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    grid: { color: 'rgba(75, 85, 99, 0.2)' },
                    ticks: { color: '#9ca3af' },
                    min: 0, max: 1
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e5e7eb' } }
            }
        }
    });
}

function renderConfusionMatrix(data) {
    const cm = data.confusion_matrix;
    const tn = cm[0][0], fp = cm[0][1];
    const fn = cm[1][0], tp = cm[1][1];

    const maxVal = Math.max(tn, fp, fn, tp, 1);

    const getBg = (val, isGood) => {
        const alpha = Math.max(0.1, val / maxVal);
        return isGood
            ? `rgba(34, 197, 94, ${alpha})`
            : `rgba(239, 68, 68, ${alpha})`;
    };

    const container = document.getElementById('confusion-matrix-container');
    container.innerHTML = `
        <div class="cm-cell border border-green-500/30" style="background: ${getBg(tn, true)}">
            <span class="cm-label">True Negative</span>
            <span class="cm-value">${tn}</span>
        </div>
        <div class="cm-cell border border-red-500/30" style="background: ${getBg(fp, false)}">
            <span class="cm-label">False Positive</span>
            <span class="cm-value">${fp}</span>
        </div>
        <div class="cm-cell border border-red-500/30" style="background: ${getBg(fn, false)}">
            <span class="cm-label">False Negative</span>
            <span class="cm-value">${fn}</span>
        </div>
        <div class="cm-cell border border-green-500/30" style="background: ${getBg(tp, true)}">
            <span class="cm-label">True Positive</span>
            <span class="cm-value">${tp}</span>
        </div>
    `;
}
