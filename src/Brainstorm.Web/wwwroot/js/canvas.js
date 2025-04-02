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

