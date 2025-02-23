const canvas = document.getElementById("glcanvas");
//const socket = new WebSocket("wss://dehobitto.xyz/ws");
const socket = new WebSocket("wss://localhost:7042/ws");

canvas.width = window.innerWidth / 100 * 98;
canvas.height = window.innerHeight / 100 * 95;

const gl = canvas.getContext("webgl");

if (!gl) {
    
    alert("WebGL не поддерживается!");
}

// Вершинный шейдер (принимает координаты)
const vertexShaderSource = `
            attribute vec2 a_position;
            void main() {
                gl_PointSize = 5.0;
                gl_Position = vec4(a_position, 0, 1);
            }
        `;

// Фрагментный шейдер (цвет пикселей)
const fragmentShaderSource = `
            precision mediump float;
            void main() {
                gl_FragColor = vec4(0, 0, 0, 1); // Красный цвет
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
gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE)

// Ловим координаты кликов
const lines = [];
let line = [];

canvas.addEventListener("mousemove", (event) => {
    if (event.buttons !== 1) return; // Проверяем, нажата ли ЛКМ

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - 5) / canvas.width * 2 - 1;
    const y = (rect.top - event.clientY + 5) / canvas.height * 2 + 1;
    
    line.push(x, y);
    lines.push(line);
    
    socket.send(JSON.stringify(line));
    
    draw();
});

function draw() {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    
    for (let i = 0; i < lines.length; i++) {
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines[i]), gl.STATIC_DRAW);
        const positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_STRIP, 0, lines[i].length / 2);
    }
}

canvas.addEventListener("mouseup", (event)=>
{
    lines.push(line);
    line = [];
});

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(data);
    lines.push(data); // Добавляем в буфер
    draw();
};

// Настраиваем WebGL
gl.clearColor(1, 1, 1, 1);
gl.clear(gl.COLOR_BUFFER_BIT);