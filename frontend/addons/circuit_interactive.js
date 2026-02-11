const API_BASE = "http://localhost:8001";

const canvas = document.getElementById('circuitCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('gate-tooltip');

let circuitData = null;
let scale = 1;
let hoverGate = null;

// Config
const CONFIG = {
    gateSize: 40,
    wireSpacing: 60,
    stepSpacing: 70,
    startX: 60,
    startY: 80,
    colors: {
        wire: '#4b5563',
        gateBg: '#1e293b',
        gateBorder: '#64748b',
        text: '#e2e8f0',
        h_gate: '#22d3ee', // Cyan
        rz_gate: '#f472b6', // Pink
        cx_gate: '#818cf8', // Indigo
        zz_gate: '#a78bfa'  // Purple
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // Handle resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial load
    updateCircuit();

    // Mouse Interaction
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', () => hideTooltip());
});

function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    if (circuitData) drawCircuit();
}

async function updateCircuit() {
    // Show Loading
    document.getElementById('loading-overlay').style.opacity = '1';
    document.getElementById('loading-overlay').style.pointerEvents = 'all';

    const reps = document.getElementById('reps-select').value;
    const ent = document.getElementById('ent-select').value;

    try {
        const response = await fetch(`${API_BASE}/circuit-interactive?reps=${reps}&entanglement=${ent}`);
        if (!response.ok) throw new Error("API Error");

        circuitData = await response.json();

        // Update Info
        document.getElementById('circuit-depth').innerText = `Total Depth: ${circuitData.depth}`;

        // Draw
        setTimeout(() => {
            drawCircuit();
            document.getElementById('loading-overlay').style.opacity = '0';
            document.getElementById('loading-overlay').style.pointerEvents = 'none';
        }, 500); // Artificial delay for smooth feel

    } catch (error) {
        console.error("Failed to load circuit:", error);
    }
}

function drawCircuit() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!circuitData) return;

    // Draw Wires (Qubits)
    const nQubits = circuitData.n_qubits;
    ctx.lineWidth = 2;
    ctx.strokeStyle = CONFIG.colors.wire;
    ctx.font = '14px JetBrains Mono';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < nQubits; i++) {
        const y = CONFIG.startY + (i * CONFIG.wireSpacing);

        // Label
        ctx.fillStyle = CONFIG.colors.text;
        ctx.fillText(`q[${i}]`, CONFIG.startX - 15, y);

        // Wire
        ctx.beginPath();
        ctx.moveTo(CONFIG.startX, y);
        ctx.lineTo(canvas.width - 20, y);
        ctx.stroke();
    }

    // Draw Gates
    let x = CONFIG.startX + CONFIG.stepSpacing;
    const gates = circuitData.gates;

    // We need to track current X position for each qubit to avoid collisions
    // Simple approach: Linear flow for this MVP
    // Better: Topological sort, but simple list iteration works for basic linear layouts

    // For this simple view, we just space out every gate somewhat linearly
    // In a real circuit, parallel gates share X. 
    // Here we will just increment X for every gate to keep it simple and readable

    gates.forEach((gate, idx) => {
        // Find Qubit Y positions
        const qIdxs = gate.qubits;
        const yPos = qIdxs.map(q => CONFIG.startY + (q * CONFIG.wireSpacing));

        const gateColor = getGateColor(gate.name);

        gate.renderX = x; // Svae for hit testing
        gate.renderY = Math.min(...yPos) - (CONFIG.gateSize / 2);

        // Draw Connection Line for Multi-Qubit gates
        if (qIdxs.length > 1) {
            ctx.beginPath();
            ctx.moveTo(x, Math.min(...yPos));
            ctx.lineTo(x, Math.max(...yPos));
            ctx.strokeStyle = gateColor;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw Nodes
        qIdxs.forEach(q => {
            const y = CONFIG.startY + (q * CONFIG.wireSpacing);

            // Draw Box
            ctx.fillStyle = CONFIG.colors.gateBg;
            ctx.strokeStyle = gateColor;
            ctx.lineWidth = 2;

            const sz = CONFIG.gateSize;

            // Glow if hovered
            if (hoverGate === gate) {
                ctx.shadowColor = gateColor;
                ctx.shadowBlur = 15;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
            ctx.strokeRect(x - sz / 2, y - sz / 2, sz, sz);

            // Text
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 12px Inter';
            ctx.fillText(gate.name.toUpperCase(), x, y);

            ctx.shadowBlur = 0; // Reset
        });

        x += CONFIG.stepSpacing;

        // Wrap if too long? For now, canvas just cuts off (overflow-x scroll could be added)
    });
}

function getGateColor(name) {
    if (name.includes('h')) return CONFIG.colors.h_gate;
    if (name.includes('rz') || name.includes('p')) return CONFIG.colors.rz_gate;
    if (name.includes('cx') || name.includes('sc')) return CONFIG.colors.cx_gate;
    if (name.includes('zz')) return CONFIG.colors.zz_gate;
    return CONFIG.colors.gateBorder;
}

function onMouseMove(e) {
    if (!circuitData) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found = null;

    // Hit Test
    for (const gate of circuitData.gates) {
        // Check each qubit node of the gate
        for (const q of gate.qubits) {
            const y = CONFIG.startY + (q * CONFIG.wireSpacing);
            const x = gate.renderX;
            const sz = CONFIG.gateSize;

            if (mx >= x - sz / 2 && mx <= x + sz / 2 &&
                my >= y - sz / 2 && my <= y + sz / 2) {
                found = gate;
                break;
            }
        }
        if (found) break;
    }

    if (found !== hoverGate) {
        hoverGate = found;
        drawCircuit(); // Redraw for glow effect

        if (found) showTooltip(found, e.clientX, e.clientY);
        else hideTooltip();
    } else if (found) {
        // Tooltip stays in same position (centered at bottom), no need to update
    }
}

const GATE_DESCRIPTIONS = {
    'h': {
        name: 'H Gate',
        op: 'Hadamard Transform',
        desc: 'Creates superposition by mapping basis states |0> and |1> to equal probability states |+> and |->.'
    },
    'rz': {
        name: 'RZ Gate',
        op: 'Z-Rotation',
        desc: 'Rotates the qubit state around the Z-axis of the Bloch sphere by the specified angle θ, encoding the feature data.'
    },
    'cx': {
        name: 'CNOT Gate',
        op: 'Entanglement',
        desc: 'Controlled-NOT gate. Flips the target qubit if the control qubit is |1>, creating quantum entanglement between qubits.'
    },
    'zz': {
        name: 'ZZ Gate',
        op: 'Simultaneous Rotation',
        desc: 'Two-qubit rotation around the ZZ-axis. Used in the Feature Map to encode correlations between features.'
    }
};

function showTooltip(gate, mx, my) {
    tooltip.classList.remove('hidden');
    // Force reflow
    void tooltip.offsetWidth;
    tooltip.classList.add('visible');

    // Get Info
    const info = GATE_DESCRIPTIONS[gate.name.toLowerCase()] || {
        name: gate.name.toUpperCase() + ' Gate',
        op: 'Quantum Operation',
        desc: 'A quantum logic gate acting on the qubits.'
    };

    document.getElementById('tooltip-title').innerText = info.name;
    document.getElementById('tooltip-op').innerText = info.op;
    document.getElementById('tooltip-desc').innerText = info.desc;
    document.getElementById('tooltip-qubit').innerText = `Qubits: [${gate.qubits.join(', ')}]`;

    let paramText = "None";
    if (gate.params && gate.params.length > 0) {
        paramText = gate.params.map(p => typeof p === 'number' ? `θ = ${p.toFixed(3)}` : p).join(', ');
    }
    document.getElementById('tooltip-param').innerText = paramText;

    // Calculate position based on Gate Center, not mouse
    const rect = canvas.getBoundingClientRect();

    // Gate Center X in Screen Coords
    const screenX = rect.left + gate.renderX;

    // Gate Top Y in Screen Coords
    const minY = Math.min(...gate.qubits.map(q => CONFIG.startY + (q * CONFIG.wireSpacing)));
    const screenY = rect.top + minY - (CONFIG.gateSize / 2);

    positionTooltipCentral(screenX, screenY);
}

function positionTooltipCentral(gateCenterX, gateTopY) {
    // Tooltip is absolutely positioned within the canvas container div
    // So we need to use positions relative to that container, not screen coordinates

    const tooltipWidth = 320;
    const tooltipHeight = tooltip.offsetHeight || 200;

    // Center horizontally in the canvas
    const left = (canvas.width / 2) - (tooltipWidth / 2);

    // Position higher up in the canvas
    const top = canvas.height - tooltipHeight - 240;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function hideTooltip() {
    tooltip.classList.remove('visible');
    setTimeout(() => {
        if (!hoverGate) tooltip.classList.add('hidden');
    }, 150);
}
