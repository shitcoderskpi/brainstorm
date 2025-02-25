const canvas = document.getElementById("glcanvas");
const socket = new WebSocket("wss://localhost:7042/ws");

canvas.width = window.innerWidth * 0.98;
canvas.height = window.innerHeight * 0.95;

canvas.addEventListener('mousedown', mouseDown, false);
canvas.addEventListener('mousemove', mouseMove, false);
canvas.addEventListener('mouseup', mouseUp, false);
canvas.addEventListener('mouseleave', mouseUp, false);

var ctx = canvas.getContext('2d');

ctx.lineWidth = 5;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';

var isDrawing = false;
var lastx = 0;
var lasty = 0;

// create an in-memory canvas
var memCanvas = document.createElement('canvas');
memCanvas.width = canvas.width;
memCanvas.height = canvas.height;
var memCtx = memCanvas.getContext('2d');
var points = [];
var lines = [];

function mouseDown(e) {
    var m = getMouse(e, canvas);
    points.push({
        x: m.x,
        y: m.y
    });
    isDrawing = true;
};

function mouseMove(e) {
    if (isDrawing) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // put back the saved content
        ctx.drawImage(memCanvas, 0, 0);
        var m = getMouse(e, canvas);
        let point = {
            x: m.x,
            y: m.y
        }
        points.push(point);
        socket.send(JSON.stringify(point));
        drawPoints(ctx, points);
    }
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    points.push(data);
    drawPoints(ctx, points);
}

function mouseUp(e) {
    if (isDrawing) {
        isDrawing = false;
        socket.send(JSON.stringify("end"));
        // When the pen is done, save the resulting context
        // to the in-memory canvas
        memCtx.clearRect(0, 0, canvas.height, canvas.height);
        memCtx.drawImage(canvas, 0, 0);
        points = [];
    }
};

// clear both canvases!
function clear() {
    context.clearRect(0, 0, 300, 300);
    memCtx.clearRect(0, 0, 300, 300);
};




function drawPoints(ctx, points) {
    // draw a basic circle instead
    if (points.length < 6) {
        var b = points[0];
        ctx.beginPath(), ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0), ctx.closePath(), ctx.fill();
        return
    }
    ctx.beginPath(), ctx.moveTo(points[0].x, points[0].y);
    // draw a bunch of quadratics, using the average of two points as the control point
    for (i = 1; i < points.length - 2; i++) {
        var c = (points[i].x + points[i + 1].x) / 2,
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
    var element = canvas, offsetX = 0, offsetY = 0, mx, my;

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
