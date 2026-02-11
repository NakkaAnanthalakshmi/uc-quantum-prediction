const API_BASE = "http://localhost:8001";

let circuitData = null;
let canvas, ctx;

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById('labCircuitCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    updateCircuit();

    if (window.MathJax) MathJax.typeset();
});

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth || 600;
    canvas.height = Math.max(350, container.clientHeight || 350);
    if (circuitData) drawCircuit();
}

async function updateCircuit() {
    const entanglement = document.getElementById('entanglement-select').value;
    const reps = parseInt(document.getElementById('reps-slider').value);

    document.getElementById('circuit-loading').style.display = 'flex';
    updateMathExplanation(entanglement);

    try {
        const response = await fetch(`${API_BASE}/circuit-interactive?reps=${reps}&entanglement=${entanglement}`);
        circuitData = response.ok ? await response.json() : generateSimulatedCircuit(entanglement, reps);
    } catch (error) {
        circuitData = generateSimulatedCircuit(entanglement, reps);
    }

    drawCircuit();
    updateStats();
    document.getElementById('circuit-loading').style.display = 'none';
}

function generateSimulatedCircuit(entanglement, reps) {
    const gates = [];
    const numQubits = 4;

    for (let rep = 0; rep < reps; rep++) {
        for (let q = 0; q < numQubits; q++) gates.push({ name: 'H', qubits: [q], type: 'hadamard' });
        for (let q = 0; q < numQubits; q++) gates.push({ name: 'RZ', qubits: [q], type: 'rotation' });

        if (entanglement === 'linear') {
            for (let q = 0; q < numQubits - 1; q++) gates.push({ name: 'CX', qubits: [q, q + 1], type: 'cnot' });
        } else if (entanglement === 'circular') {
            for (let q = 0; q < numQubits; q++) gates.push({ name: 'CX', qubits: [q, (q + 1) % numQubits], type: 'cnot' });
        } else {
            for (let q1 = 0; q1 < numQubits; q1++) {
                for (let q2 = q1 + 1; q2 < numQubits; q2++) gates.push({ name: 'CX', qubits: [q1, q2], type: 'cnot' });
            }
        }

        for (let q = 0; q < numQubits; q++) gates.push({ name: 'RX', qubits: [q], type: 'rotation' });
    }

    return { qubits: numQubits, depth: reps * 4, gates: gates };
}

function drawCircuit() {
    if (!ctx || !circuitData) return;

    const width = canvas.width;
    const height = canvas.height;
    const numQubits = circuitData.qubits || 4;
    const gates = circuitData.gates || [];

    // Beautiful gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e1b4b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Add subtle grid pattern
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }
    for (let i = 0; i < height; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }

    const padding = 80;
    const wireSpacing = (height - 2 * padding) / Math.max(1, numQubits - 1);
    const gateSpacing = Math.min(55, (width - 180) / Math.max(1, gates.length));

    // Draw quantum wire labels with glow
    for (let q = 0; q < numQubits; q++) {
        const y = padding + q * wireSpacing;

        // Qubit state badge
        ctx.save();
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 10;

        // Badge background
        const badgeGrad = ctx.createLinearGradient(10, y - 12, 55, y + 12);
        badgeGrad.addColorStop(0, '#4f46e5');
        badgeGrad.addColorStop(1, '#7c3aed');
        ctx.fillStyle = badgeGrad;
        roundRect(ctx, 15, y - 14, 45, 28, 8);
        ctx.fill();

        // Qubit label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`|q${q}⟩`, 37, y);
        ctx.restore();

        // Glowing wire
        ctx.save();
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 4;
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        ctx.restore();

        // Measurement icon
        ctx.fillStyle = '#a78bfa';
        ctx.font = '18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⟨M⟩', width - padding + 30, y);
    }

    // Draw gates with beautiful styling
    let x = padding + gateSpacing;

    gates.forEach((gate, idx) => {
        const qubits = gate.qubits;
        const yPositions = qubits.map(q => padding + q * wireSpacing);

        // Multi-qubit connection with gradient
        if (qubits.length > 1) {
            const minY = Math.min(...yPositions);
            const maxY = Math.max(...yPositions);

            const lineGrad = ctx.createLinearGradient(x, minY, x, maxY);
            lineGrad.addColorStop(0, '#f472b6');
            lineGrad.addColorStop(1, '#a855f7');

            ctx.save();
            ctx.shadowColor = '#f472b6';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = lineGrad;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, minY);
            ctx.lineTo(x, maxY);
            ctx.stroke();
            ctx.restore();

            // Control dot
            ctx.save();
            ctx.shadowColor = '#f472b6';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.arc(x, minY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Target circle
            ctx.save();
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, maxY, 14, 0, Math.PI * 2);
            ctx.stroke();
            // Plus sign
            ctx.beginPath();
            ctx.moveTo(x - 9, maxY);
            ctx.lineTo(x + 9, maxY);
            ctx.moveTo(x, maxY - 9);
            ctx.lineTo(x, maxY + 9);
            ctx.stroke();
            ctx.restore();
        } else {
            // Single qubit gate
            const y = yPositions[0];
            const sz = 40;

            // Get gate colors
            let color1, color2, glowColor;
            const gName = (gate.name || '').toUpperCase();

            if (gName === 'H') {
                color1 = '#06b6d4'; color2 = '#22d3ee'; glowColor = '#22d3ee';
            } else if (gName.includes('RZ')) {
                color1 = '#8b5cf6'; color2 = '#a78bfa'; glowColor = '#a78bfa';
            } else if (gName.includes('RX') || gName.includes('RY')) {
                color1 = '#ec4899'; color2 = '#f472b6'; glowColor = '#f472b6';
            } else {
                color1 = '#6366f1'; color2 = '#818cf8'; glowColor = '#818cf8';
            }

            // Gate with glow
            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 12;

            // Gradient fill
            const gateGrad = ctx.createLinearGradient(x - sz / 2, y - sz / 2, x + sz / 2, y + sz / 2);
            gateGrad.addColorStop(0, color1);
            gateGrad.addColorStop(1, color2);
            ctx.fillStyle = gateGrad;

            roundRect(ctx, x - sz / 2, y - sz / 2, sz, sz, 10);
            ctx.fill();

            // Border
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            // Gate label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(gName, x, y);
        }

        x += gateSpacing;
    });
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function updateMathExplanation(entanglement) {
    const descEl = document.getElementById('entanglement-desc');
    const formulaEl = document.getElementById('entanglement-formula');

    const explanations = {
        linear: ['Linear: Adjacent CNOT gates create correlations between neighboring qubits.', '\\( CNOT_{01} \\cdot CNOT_{12} \\cdot CNOT_{23} \\)'],
        circular: ['Circular: Ring topology with CNOT from last to first qubit.', '\\( CNOT_{01} \\cdot CNOT_{12} \\cdot CNOT_{23} \\cdot CNOT_{30} \\)'],
        full: ['Full: All-to-all connectivity for maximum expressivity.', '\\( \\prod_{i<j} CNOT_{ij} \\)']
    };

    const [desc, formula] = explanations[entanglement] || explanations.linear;
    descEl.textContent = desc;
    formulaEl.innerHTML = formula;

    if (window.MathJax) {
        MathJax.typesetClear([formulaEl]);
        MathJax.typeset([formulaEl]);
    }
}

function updateStats() {
    if (!circuitData) return;
    document.getElementById('gate-count').textContent = `Gates: ${circuitData.gates?.length || '--'}`;
    document.getElementById('circuit-depth').textContent = `Depth: ${circuitData.depth || '--'}`;
}

function selectEntanglement(type) {
    document.getElementById('entanglement-select').value = type;
    updateCircuit();
}
