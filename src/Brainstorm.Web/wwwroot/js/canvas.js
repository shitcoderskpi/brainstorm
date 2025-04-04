const $ = (id) => document.getElementById(id);
// SUSPICIOUS!!!!!!!
// PAY ATTENTION IF DOES NOT WORK!!!!!!!!!!!!!!

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
    isDrawingMode: false,
    width: viewWidth,
    height: viewHeight
});

// clear padding
const canvasWrapper = canvas.wrapperEl;
canvasWrapper.style.position = 'initial';
canvasWrapper.style.margin = '0';

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


    deleteModeActive = false;
    canvas.isDrawingMode = true;
}

$("set-cursor-style").onclick = function () {
    console.log("Moving mode");


    deleteModeActive = false;
    canvas.isDrawingMode = false;
}

let deleteModeActive = false;

$("set-delete-style").onclick = function () {

    canvas.isDrawingMode = false;
    deleteModeActive = true;
    console.log("Delete mode on.");
    canvas.selection =true;
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

canvas.on('selection:created', function () {
    if (!deleteModeActive) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    const objectIds = activeObjects.map(obj => obj.id);
    console.log("Delete objects:", objectIds);

    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();

    sendDeleteData(objectIds);
});

canvas.on('mouse:down', function (event)
{
    if (!deleteModeActive) return;

    const target = event.target;
    if (target)
    {
        console.log("Delete object:", target.id);
        canvas.remove(target);
        sendDeleteData([target.id]);
    }
});

// socket handler, pretty understandable
socket.onmessage = function (event) {
    const message = JSON.parse(event.data);

    console.log("Got a message ", message.type);
    console.log(message);

    if (message.type === 'move') {
        let movedObject = findObject(message.data.id);

        if (!movedObject) {
            console.warn("Объект с id", message.data.id, "не найден");
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
    else if (message.type === 'delete')
    {
        message.ids.forEach(id => {
            let objectToRemove = findObject(id);
            if (objectToRemove)
            {
                console.log("Delete received object:", id);
                canvas.remove(objectToRemove);
            } else
            {
                console.warn("Object to delete not found:", id);
            }
        });

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
const initSmoothControls = () => {
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let isAltPressed = false;
    
    const handleKeyDown = (e) => {
        if (e.key === 'Alt' && !e.repeat) {
            isAltPressed = true;
            canvas.selection = false;
            canvas.defaultCursor = 'grab';
            e.preventDefault();
        }
    };

    const handleKeyUp = (e) => {
        if (e.key === 'Alt') {
            isAltPressed = false;
            canvas.selection = true;
            canvas.defaultCursor = 'default';
            e.preventDefault();
        }
    };
function sendDeleteData(objectIds)
{
    socket.send(JSON.stringify({
        type: 'delete',
        ids: objectIds
    }));
}

const colorPicker = document.getElementById("color-picker");
const colorInput = document.getElementById("color-input");

colorPicker.addEventListener("input", function () {
    colorInput.value = this.value;
    canvas.freeDrawingBrush.color = this.value;
});

colorInput.addEventListener("input", function () {
    if (/^#[0-9A-F]{6}$/i.test(this.value)) {
        colorPicker.value = this.value;
        canvas.freeDrawingBrush.color = this.value;
    }
});

let selectedShape = null; 

$("create-square").onclick = function ()
{
    console.log("Select square");
    canvas.isDrawingMode = false;
    deleteModeActive = false;
    selectedShape = "square"; 
}

$("create-rectangle").onclick = function ()
{
    console.log("Select rectangle");
    canvas.isDrawingMode = false;
    deleteModeActive = false;
    selectedShape = "rectangle";
}

$("create-circle").onclick = function ()
{
    console.log("Select circle");
    canvas.isDrawingMode = false;
    deleteModeActive = false;
    selectedShape = "circle"; 
}

$("create-triangle").onclick = function ()
{
    console.log("Select triangle");
    canvas.isDrawingMode = false;
    deleteModeActive = false;
    selectedShape = "triangle"; 
}
$("create-parallelogram").onclick = function ()
{
    console.log("Select parallelogram");
    canvas.isDrawingMode = false;
    deleteModeActive = false;
    selectedShape = "parallelogram"; 
}

$("create-trapezoid").onclick = function ()
{
    console.log("Select trapezoid");
    canvas.isDrawingMode = false;
    deleteModeActive = false;
    selectedShape = "trapezoid";
}

$("create-star").onclick = function ()
{
    console.log("Select star");
    canvas.isDrawingMode = false;
    deleteModeActive = false;
    selectedShape = "star";
}

$("create-hexagon").onclick = function ()
{
    console.log("Select hexagon");
    canvas.isDrawingMode = false;
    deleteModeActive = false;
    selectedShape = "hexagon";
}

$("create-pentagon").onclick = function ()
{
    console.log("Select pentagon");
    canvas.isDrawingMode = false;
    deleteModeActive = false;
    selectedShape = "pentagon";
}

$("create-rhombus").onclick = function ()
{
    console.log("Select rhombus");
    canvas.isDrawingMode = false;
    deleteModeActive = false;
    selectedShape = "rhombus";
}

canvas.on("mouse:down", function (event)
{
    if (!selectedShape) return; 

    const pointer = canvas.getPointer(event.e); 
    const id = crypto.randomUUID(); 
    createShape(selectedShape, pointer, id);
    selectedShape = null; 
});

function createShape(shapeType, pointer, id)
{
    let shape;
    switch (shapeType)
    {
        case "square":
            shape = square(pointer, id);
            break;
        case "rectangle":
            shape = rectangle(pointer, id);
            break;
        case "circle":
            shape = circle(pointer, id);
            break;
        case "triangle":
            shape = triangle(pointer, id);
            break;
        case "parallelogram":
            shape = parallelogram(pointer, id);
            break;
        case "trapezoid":
            shape = trapezoid(pointer, id);
            break;
        case "star":
            shape = star(pointer, id);
            break;
        case "hexagon":
            shape = hexagon(pointer, id);
            break;
        case "pentagon":
            shape = pentagon(pointer, id);
            break;
        case "rhombus":
            shape = rhombus(pointer, id);
            break;
        default:
            return;
    }

    if (shape)
    {
        canvas.add(shape);
        canvas.renderAll();
        sendDrawingData(shape.toObject());
    }
}

function square(pointer, id)
{
    return new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 100,
        height: 100,
        fill: 'transparent',
        stroke: 'black',
        id: id
    });
}

function rectangle(pointer, id)
{
    return new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 150,
        height: 100,
        fill: 'transparent',
        stroke: 'black',
        id: id
    });
}

function circle(pointer, id)
{
    return new fabric.Circle({
        left: pointer.x,
        top: pointer.y,
        radius: 50,
        fill: 'transparent',
        stroke: 'black',
        id: id
    });
}

function triangle(pointer, id)
{
    return new fabric.Triangle({
        left: pointer.x,
        top: pointer.y,
        width: 100,
        height: 100,
        fill: 'transparent',
        stroke: 'black',
        id: id
    });
}
function parallelogram(pointer, id)
{
    return new fabric.Polygon([
        { x: pointer.x,       y: pointer.y       },
        { x: pointer.x + 150, y: pointer.y       },
        { x: pointer.x + 120, y: pointer.y + 100 },
        { x: pointer.x - 30,  y: pointer.y + 100 }
    ], {
        fill: 'transparent',
        stroke: 'black',
        id: id
    });
}

function trapezoid(pointer, id)
{
    return new fabric.Polygon([
        { x: pointer.x,       y: pointer.y + 100 }, 
        { x: pointer.x + 150, y: pointer.y + 100 }, 
        { x: pointer.x + 120, y: pointer.y       }, 
        { x: pointer.x + 30,  y: pointer.y       }
    ], {
        fill: 'transparent',
        stroke: 'black',
        id: id
    });
}

function star(pointer, id)
{
    const points = [];
    const outerRadius = 50;
    const innerRadius = 25;
    const numPoints = 10;

    for (let i = 0; i < numPoints; i++)
    {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / 5) * i;
        const x = pointer.x + radius * Math.sin(angle);
        const y = pointer.y - radius * Math.cos(angle);
        points.push({ x: x, y: y });
    }

    return new fabric.Polygon(points,
    {
        fill: 'transparent',
        stroke: 'black',
        id: id
    });
}

function hexagon(pointer, id)
{
    const sideLength = 50;
    const points = [];
    for (let i = 0; i < 6; i++)
    {
        points.push({
            x: pointer.x + sideLength * Math.cos(i * Math.PI / 3),
            y: pointer.y + sideLength * Math.sin(i * Math.PI / 3)
        });
    }
    return new fabric.Polygon(points,
    {
        fill: 'transparent',
        stroke: 'black',
        id: id
    });
}

function pentagon(pointer, id)
{
    const radius = 50;
    const points = [];
    for (let i = 0; i < 5; i++)
    {
        points.push({
            x: pointer.x + radius * Math.cos(i * 2 * Math.PI / 5),
            y: pointer.y + radius * Math.sin(i * 2 * Math.PI / 5)
        });
    }
    const pentagon = new fabric.Polygon(points,
    {
        fill: 'transparent',
        stroke: 'black',
        id: id
    });
    pentagon.rotate(-90);
    return pentagon;
}

function rhombus(pointer, id)
{
    return new fabric.Polygon([
        { x: pointer.x, y: pointer.y - 50 },
        { x: pointer.x + 50, y: pointer.y },
        { x: pointer.x, y: pointer.y + 50 },
        { x: pointer.x - 50, y: pointer.y }
    ], {
        fill: 'transparent',
        stroke: 'black',
        id: id
    });
}

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    canvas.on('mouse:wheel', function(opt) {
        opt.e.preventDefault();
        const delta = -Math.sign(opt.e.deltaY) * 0.1; // Увеличенный коэффициент
        const zoomFactor = 1.2; // Более агрессивный множитель зума

        const newZoom = delta > 0
            ? canvas.getZoom() * zoomFactor
            : canvas.getZoom() / zoomFactor;

        const clampedZoom = Math.min(50, Math.max(0.1, newZoom));

        canvas.zoomToPoint({
            x: opt.e.offsetX,
            y: opt.e.offsetY
        }, clampedZoom);
    });
    
    canvas.on('mouse:down', (opt) => {
        if (isAltPressed && opt.e.button === 0) {
            isDragging = true;
            lastX = opt.e.clientX;
            lastY = opt.e.clientY;
            canvas.defaultCursor = 'grabbing';
            opt.e.preventDefault();
        }
    });
    
    canvas.on('mouse:up', () => {
        if (isDragging) {
            isDragging = false;
            canvas.defaultCursor = isAltPressed ? 'grab' : 'default';
        }
    });
    
    canvas.wrapperEl.addEventListener('contextmenu', (e) => {
        if (isAltPressed) e.preventDefault();
    });
};

initSmoothControls();