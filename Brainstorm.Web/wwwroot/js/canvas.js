const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const socket = new WebSocket("wss://dehobitto.xyz/ws");

let drawing = false, moving = false;
let lastX = 0, lastY = 0;
let scale = 1, offsetX = 0, offsetY = 0;
let lines = [];
let incomingLines = []; // Буфер входящих линий

ready(initCanvas())

function ready(fn){
    if (document.readyState === "complete"){
        fn();
    } else
    {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

function initCanvas() {
    const { innerWidth, innerHeight } = window;
    canvas.setAttribute('width', innerWidth);
    canvas.setAttribute('height', innerHeight);
}


// 🎨 Получение координат в масштабе
function getCanvasCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left - offsetX) / scale,
        y: (event.clientY - rect.top - offsetY) / scale
    };
}

// 🎨 Рисование линии
function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// 🔄 Отрисовка с буферизацией
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    // Отрисовываем линии
    lines.forEach(line => drawLine(line.fromX, line.fromY, line.toX, line.toY));
    ctx.restore();
}

// 🕒 Оптимизация рендеринга (30 FPS)
function processIncoming() {
    if (incomingLines.length > 0) {
        lines.push(...incomingLines);
        incomingLines = []; // Очищаем буфер
        redrawCanvas();
    }
    requestAnimationFrame(processIncoming);
}
requestAnimationFrame(processIncoming); // Запускаем рендер

// 🎨 Мышь
canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) { // Левая кнопка — рисование
        drawing = true;
        const coords = getCanvasCoords(event);
        lastX = coords.x;
        lastY = coords.y;
    } else if (event.button === 1) { // Средняя кнопка — перемещение
        moving = true;
        lastX = event.clientX;
        lastY = event.clientY;
        event.preventDefault();
    }
});

canvas.addEventListener("mousemove", (event) => {
    if (drawing) {
        const coords = getCanvasCoords(event);
        const data = { fromX: lastX, fromY: lastY, toX: coords.x, toY: coords.y };

        //socket.send(JSON.stringify(data));
        lines.push(data); // Локальное рисование
        redrawCanvas(); // 🔥 ВАЖНО: добавил перерисовку после локального рисования

        lastX = coords.x;
        lastY = coords.y;
    } else if (moving) { // Двигаем канвас
        offsetX += event.clientX - lastX;
        offsetY += event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        redrawCanvas();
    }
});

canvas.addEventListener("mouseup", () => { drawing = false; moving = false; });
canvas.addEventListener("mouseleave", () => { drawing = false; moving = false; });

// 🔄 Масштабирование (ZOOM)
canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const zoomFactor = 1.1;
    const mouseX = event.offsetX, mouseY = event.offsetY;

    if (event.deltaY < 0) {
        scale *= zoomFactor;
        offsetX = mouseX - (mouseX - offsetX) * zoomFactor;
        offsetY = mouseY - (mouseY - offsetY) * zoomFactor;
    } else {
        scale /= zoomFactor;
        offsetX = mouseX - (mouseX - offsetX) / zoomFactor;
        offsetY = mouseY - (mouseY - offsetY) / zoomFactor;
    }

    redrawCanvas();
});

// 📡 Приём данных с WebSocket
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    incomingLines.push(data); // Добавляем в буфер
};