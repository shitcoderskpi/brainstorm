const canvas = document.getElementById("glcanvas");
const socket = new WebSocket("wss://dehobitto.xyz/ws");

canvas.width = window.innerWidth * 0.98;
canvas.height = window.innerHeight * 0.95;

const gl = canvas.getContext("webgl");
if (!gl) alert("WebGL не поддерживается!");

const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0, 1);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    void main() {
        gl_FragColor = vec4(0, 0, 0, 1);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

const oldLinesBuffer = gl.createBuffer();
const currentLineBuffer = gl.createBuffer();

let lines = [];         // Хранит старые линии (не обновляется каждый кадр)
let currentLine = [];   // Хранит текущую линию (обновляется на каждом движении)
let isDrawing = false;

function normalizeCoordinates(x, y) {
    const rect = canvas.getBoundingClientRect();
    return [
        (x - rect.left) / canvas.width * 2 - 1,
        -((y - rect.top) / canvas.height * 2 - 1)
    ];
}

gl.clearColor(1, 1, 1, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

canvas.addEventListener("mousedown", () => {
    isDrawing = true;
});

canvas.addEventListener("mouseleave", (e) => {
    if (currentLine.length !== 0) {
        lines.push(currentLine); // Сохраняем копию
    }
    currentLine = [];

    gl.bindBuffer(gl.ARRAY_BUFFER, oldLinesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines.flat().length), gl.STATIC_DRAW);
    drawAllLines();
});

// 🎨 Движение мыши (отрисовка только новой линии)
canvas.addEventListener("mousemove", (event) => {
    if (!isDrawing) return;
    [x, y] = normalizeCoordinates(event.clientX, event.clientY);
    
    currentLine.push(x, y);
    requestAnimationFrame(drawCurrentLine);
});
canvas.addEventListener("mouseup", () => {
    if (currentLine.length !== 0) {
        lines.push(currentLine); // Сохраняем копию
    }
    currentLine = [];
    isDrawing = false;

    gl.bindBuffer(gl.ARRAY_BUFFER, oldLinesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines.flat().length), gl.STATIC_DRAW);
    drawAllLines();
});
function drawAllLines() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, oldLinesBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    for (let i = 0; i < lines.length; i++) {
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines[i]), gl.STATIC_DRAW);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, lines[i].length / 2);
    }
}

function drawCurrentLine() {
    drawAllLines(); // Сначала рисуем фон + старые линии

    gl.bindBuffer(gl.ARRAY_BUFFER, currentLineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(currentLine), gl.STREAM_DRAW);

    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, currentLine.length / 2);
}

// 📡 Обработчик WebSocket
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    lines.push(data);

    gl.bindBuffer(gl.ARRAY_BUFFER, oldLinesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines.flat()), gl.STATIC_DRAW);

    requestAnimationFrame(drawAllLines);
};
