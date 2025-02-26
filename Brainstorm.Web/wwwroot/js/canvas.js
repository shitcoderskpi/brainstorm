let userId = localStorage.getItem("userId");
if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("userId", userId);
}

const canvas = document.getElementById("canvas");
const socket = new WebSocket("wss://dehobitto.xyz/ws");

canvas.width = window.innerWidth * 0.98;
canvas.height = window.innerHeight * 0.95;

canvas.addEventListener('mousedown', mouseDown, false);
canvas.addEventListener('mousemove', mouseMove, false);
canvas.addEventListener('mouseup', mouseUp, false);
canvas.addEventListener('mouseleave', mouseLeave, false);

const ctx = canvas.getContext('2d');

ctx.lineWidth = 5;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';

let isDrawing = false;

// create an in-memory canvas
let memCanvas = document.createElement('canvas');
memCanvas.width = canvas.width;
memCanvas.height = canvas.height;
let memCtx = memCanvas.getContext('2d');
let currLine = [];
let incomingLines = new Map();

function mouseDown(e) {
    let m = getMouse(e, canvas);
    currLine.push({
        x: m.x,
        y: m.y
    });
    isDrawing = true;
}

function mouseMove(e) {
    if (isDrawing) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // put back the saved content
        ctx.drawImage(memCanvas, 0, 0);
        let m = getMouse(e, canvas);
        let point = {
            x: m.x,
            y: m.y
        }
        currLine.push(point);
        let data = {
            points: currLine,
            id: userId,
        }
        socket.send(JSON.stringify(data));
        drawPoints(ctx, currLine);
    }
}

function mouseLeave() {
    if (!isDrawing) return;
    mouseUp();
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "end")
    {
        incomingLines.delete(data.id);
        memCtx.clearRect(0, 0, canvas.height, canvas.height);
        memCtx.drawImage(canvas, 0, 0);
        return;
    }
    incomingLines.set(data.id, data.points);
    drawIncoming();
}

function mouseUp() {
    if (isDrawing) {
        isDrawing = false;
        let data = {
            type: "end",
            id: userId
        }
        socket.send(JSON.stringify(data));
        // When the pen is done, save the resulting context
        // to the in-memory canvas
        memCtx.clearRect(0, 0, canvas.height, canvas.height);
        memCtx.drawImage(canvas, 0, 0);
        currLine = [];
    }
}

// clear both canvases!
function clear() {
    context.clearRect(0, 0, 300, 300);
    memCtx.clearRect(0, 0, 300, 300);
}



function drawIncoming() {
    incomingLines.forEach((line) => {
        drawPoints(ctx, line);
    })
}
function drawPoints(ctx, points) {
    // draw a basic circle instead
    if (points.length < 6) {
        let b = points[0];
        ctx.beginPath(), ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0), ctx.closePath(), ctx.fill();
        return
    }
    ctx.beginPath(), ctx.moveTo(points[0].x, points[0].y);
    // draw a bunch of quadratics, using the average of two points as the control point
    let i;
    for (i = 1; i < points.length - 2; i++) {
        const c = (points[i].x + points[i + 1].x) / 2,
            d = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, c, d)
    }
    ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y), ctx.stroke()
}

// Creates an object with x and y defined,
// set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky,
// we have to worry about padding and borders
// takes an event and a reference to the canvas
function getMouse(e, canvas) {
    let element = canvas, offsetX = 0, offsetY = 0, mx, my;

    // Compute the total offset. It's possible to cache this if you want
    if (element.offsetParent !== undefined) {
        do {
            offsetX += element.offsetLeft;
            offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
    }

    mx = e.pageX - offsetX;
    my = e.pageY - offsetY;

    // We return a simple javascript object with x and y defined
    return {x: mx, y: my};
}