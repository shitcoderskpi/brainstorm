const $ = (id) => document.getElementById(id);
// Get the current session ID from the URL
const sessionId = window.location.pathname.split('/').pop();
const wsUrl = `wss://dehobitto.xyz/home/canvas/${sessionId}/ws`;
console.log("Connecting to WebSocket:", wsUrl);
const socket = new WebSocket(wsUrl);

// consts size
const viewWidth = window.innerWidth * 0.98;
const viewHeight = window.innerHeight * 0.95;

// create fabric canvas
const canvas = new fabric.Canvas($('canvas'), {
    isDrawingMode: true,
    width: viewWidth,
    height: viewHeight
});

// clear padding
const canvasWrapper = canvas.wrapperEl;
canvasWrapper.style.position = 'initial';
canvasWrapper.style.margin = '0';

// Get reference to the dot pattern element
const dotPattern = document.querySelector('.dot-pattern');

// Base grid size for the dot pattern
const BASE_GRID_SIZE = 64;
// Dot size in pixels
const DOT_SIZE = 2; 
// Zoom breakpoints where grid size changes
const GRID_BREAKPOINTS = [0.25, 0.5, 1, 2, 4];
// Gray color for dots
const DOT_COLOR = "rgba(120, 120, 120, 0.2)";

// create brush
canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
fabric.Object.prototype.transparentCorners = false;
canvas.freeDrawingBrush.width = 5;
canvas.freeDrawingBrush.color = 'black'

// added id here, so its not lost when toObject called
fabric.Object.prototype.toObject = (function (toObject) {
    return function (propertiesToInclude) {
        return {
            ...toObject.call(this, propertiesToInclude),
            id: this.id,
        };
    };
})(fabric.Object.prototype.toObject);

// we find obj by id
function findObject(id) {
    return canvas._objects.find(obj => obj && obj.id === id);
}

$("set-pencil-style").onclick = function () {
    console.log("Pencil mode");

    canvas.isDrawingMode = true;
}

$("set-cursor-style").onclick = function () {
    console.log("Moving mode");

    canvas.isDrawingMode = false;
}

//Send data when obj moved
canvas.on('object:modified', function (e) {
    const movedObject = e.target;

    const data = {
        left: movedObject.left,
        top: movedObject.top,
        scaleX: movedObject.scaleX,
        scaleY: movedObject.scaleY,
        id: movedObject.id
    };

    console.log(data.id, " modified");

    sendMoveData(data);
})

// when we create path, set id and send it to everyone
canvas.on('path:created', function (e) {
    const newId = crypto.randomUUID();
    e.path.set({ id: newId });

    console.log(newId, " assigned to", e.path);

    const pathData = e.path.toObject();

    console.log(pathData.id, " sent");
    console.log(e.path.id, " drawn");

    sendDrawingData(pathData);
});

// socket handler, pretty understandable
socket.onmessage = function (event) {
    const message = JSON.parse(event.data);

    console.log("Got a message ", message.type);
    console.log(message);

    if (message.type === 'move') {
        let movedObject = findObject(message.data.id);

        if (!movedObject) {
            console.warn("Object with id", message.data.id, "not found");
            return;
        }

        movedObject.set({
            left: message.left,
            top: message.top,
            scaleX: message.scaleX,
            scaleY: message.scaleY
        });

        console.log(
            message.type, " type",
            message.id, " id request",
            movedObject.id, " id response");

        // need to redraw when changed
        canvas.renderAll();
    }else if(message.type === 'drawing')
    {
        const path = new fabric.Path(message.path.path);
        path.set({
            left: message.path.left,
            top: message.path.top,
            fill: message.path.fill,
            stroke: message.path.stroke,
            strokeWidth: message.path.strokeWidth,
            id: message.path.id
        });

        console.log(
            message.type, " type",
            message.id, " id sent",
            path.id, " id got");

        canvas.add(path);
        canvas.renderAll();
    }
};

function sendDrawingData(pathData) {
    socket.send(JSON.stringify({
        type: 'drawing',
        path: pathData
    }));
}

function sendMoveData(data) {
    socket.send(JSON.stringify({
        type: 'move',
        data: data
    }));
}

// Function to determine grid size based on zoom level (Figma-style)
function getFigmaStyleGridSize(zoom) {
    let gridSize = BASE_GRID_SIZE;

    if (zoom <= GRID_BREAKPOINTS[0]) {
        gridSize = BASE_GRID_SIZE * 4;
    } else if (zoom <= GRID_BREAKPOINTS[1]) {
        gridSize = BASE_GRID_SIZE * 2;
    } else if (zoom <= GRID_BREAKPOINTS[2]) {
        gridSize = BASE_GRID_SIZE;
    } else if (zoom <= GRID_BREAKPOINTS[3]) {
        gridSize = BASE_GRID_SIZE / 2;
    } else if (zoom <= GRID_BREAKPOINTS[4]) {
        gridSize = BASE_GRID_SIZE / 4;
    } else {
        gridSize = BASE_GRID_SIZE / 8;
    }

    // Ограничение минимального размера сетки
    return Math.max(gridSize, 8);
}

// Function to update dot pattern in Figma style
function updateDotPattern(zoom, vpt) {
    const gridSize = getFigmaStyleGridSize(zoom);
    const dotSize = Math.min(DOT_SIZE, DOT_SIZE * zoom);

    dotPattern.style.backgroundImage = `radial-gradient(circle, ${DOT_COLOR} ${dotSize}px, transparent ${dotSize}px)`;
    dotPattern.style.backgroundSize = `${gridSize}px ${gridSize}px`;

    const offsetX = (vpt[4] / zoom) % gridSize;
    const offsetY = (vpt[5] / zoom) % gridSize;

    dotPattern.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
}


// Function to update dot pattern position
function updateDotPatternPosition(vpt) {
    const zoom = canvas.getZoom();
    updateDotPattern(zoom, vpt);
}

canvas.on('mouse:down', function(opt) {
    var evt = opt.e;
    if (evt.altKey === true) {
        this.isDragging = true;
        this.isDrawingMode = false;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
    }
});

canvas.on('mouse:wheel', function(opt) {
    var delta = opt.e.deltaY;
    var zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.01) zoom = 0.01;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
    var vpt = this.viewportTransform;
    if (zoom < 400 / 1000) {
        vpt[4] = 200 - 1000 * zoom / 2;
        vpt[5] = 200 - 1000 * zoom / 2;
    } else {
        if (vpt[4] >= 0) {
            vpt[4] = 0;
        } else if (vpt[4] < canvas.getWidth() - 1000 * zoom) {
            vpt[4] = canvas.getWidth() - 1000 * zoom;
        }
        if (vpt[5] >= 0) {
            vpt[5] = 0;
        } else if (vpt[5] < canvas.getHeight() - 1000 * zoom) {
            vpt[5] = canvas.getHeight() - 1000 * zoom;
        }
    }

    // Update dot grid when zoom changes
    updateDotPattern(zoom, vpt);
})

canvas.on('mouse:move', function(opt) {
    if (this.isDragging) {
        var e = opt.e;
        var vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;

        // Update dot pattern position
        updateDotPatternPosition(vpt);

        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
    }
});

canvas.on('mouse:up', function(opt) {
    this.setViewportTransform(this.viewportTransform);
    this.isDragging = false;
    this.selection = true;
});

// Initialize dot pattern with default settings
updateDotPattern(1, [1, 0, 0, 1, 0, 0]);