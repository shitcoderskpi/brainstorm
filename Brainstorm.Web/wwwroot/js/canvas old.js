import { Application } from 'pixi.js';

const canvasOld = document.getElementById("canvas");
const ctx = canvasOld.getContext("2d");
const socket = new WebSocket("wss://dehobitto.xyz/ws");

let isDrawing = false, moving = false;
let lastX = 0, lastY = 0;
let scale = 1, offsetX = 0, offsetY = 0;
let lines = [];
let incomingLines = []; // Буфер входящих линий

/*//Works when everything is loaded
whenLoaded(resizeCanvas())
function whenLoaded(fn){
    if (document.readyState === "complete"){
        fn();
    } else
    {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

//Fullscreen canvas 
function resizeCanvas() {
    const { innerWidth, innerHeight } = window;
    canvasOld.setAttribute('width', innerWidth);
    canvasOld.setAttribute('height', innerHeight);
}*/


// 🎨 Получение координат в масштабе
function getCanvasCoords(event) {
    const rect = canvasOld.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left - offsetX) / scale,
        y: (event.clientY - rect.top - offsetY) / scale
    };
}

// 🎨 Рисование линии
function drawLine(x1, y1, x2, y2) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
        
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    let cpX = x1 * 0.65 + x2 * 0.35;
    let cpY = y1 * 0.65 + y2 * 0.35;
    
    ctx.quadraticCurveTo(cpX, cpY, x2, y2);
    
    ctx.stroke();
}

// 🔄 Отрисовка с буферизацией
function redrawCanvas() {
    ctx.clearRect(0, 0, canvasOld.width, canvasOld.height);
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
canvasOld.addEventListener("mousedown", (event) => {
    if (event.button === 0) { // Левая кнопка — рисование
        isDrawing = true;
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

canvasOld.addEventListener("mousemove", (event) => {
    if (isDrawing) {
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

canvasOld.addEventListener("mouseup", () => { isDrawing = false; moving = false; });
canvasOld.addEventListener("mouseleave", () => { isDrawing = false; moving = false; });

// 🔄 Масштабирование (ZOOM)
canvasOld.addEventListener("wheel", (event) => {
    event.preventDefault();
    const zoomFactor = 1.1;
    const mouseX = event.offsetX, mouseY = event.offsetY;
    
    
    if (event.deltaY < 0 && scale * zoomFactor <= 15) {
        scale *= zoomFactor;
        offsetX = mouseX - (mouseX - offsetX) * zoomFactor;
        offsetY = mouseY - (mouseY - offsetY) * zoomFactor;
    } else if (event.deltaY > 0 && scale / zoomFactor >= 0.3 ) {
        scale /= zoomFactor;
        offsetX = mouseX - (mouseX - offsetX) / zoomFactor;
        offsetY = mouseY - (mouseY - offsetY) / zoomFactor;
    }
    console.log(scale)
    redrawCanvas();
});

// 📡 Приём данных с WebSocket
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    incomingLines.push(data); // Добавляем в буфер
};