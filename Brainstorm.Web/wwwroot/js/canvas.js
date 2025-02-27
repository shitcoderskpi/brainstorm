let userId = localStorage.getItem("userId");    // Take id from storage
if (!userId) {                                               // if no id
    userId = crypto.randomUUID();                            // than create one
    localStorage.setItem("userId", userId);                  // and set it
}



const $ = (id) => document.getElementById(id);
const socket = new WebSocket("wss://dehobitto.xyz/ws");

const viewWidth = window.innerWidth * 0.98;
const viewHeight = window.innerHeight * 0.95;

const canvas = new fabric.Canvas($('canvas', { renderOnAddRemove: false }), {
    isDrawingMode: false,
    width: viewWidth,
    height: viewHeight
});

canvas.objects = new Map();

const canvasWrapper = canvas.wrapperEl;
canvasWrapper.style.position = 'initial'; 
canvasWrapper.style.margin = '0';

canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
fabric.Object.prototype.transparentCorners = false;
canvas.freeDrawingBrush.width = 5;

$("set-pencil-style").onclick = function () {
    console.log("set pencil style");
    canvas.isDrawingMode = true;
}

$("set-cursor-style").onclick = function () {
    console.log("set pencil style");
    canvas.isDrawingMode = false;
}

function sendDrawingData(pathData) {
    socket.send(JSON.stringify({
        type: 'drawing',
        path: pathData
    }));
}

// Слушаем событие рисования и отправляем данные о каждой точке
canvas.on('path:created', function (e) {
    const newId = crypto.randomUUID();
    e.path.set({ id: newId });
    console.log("Assigned ID:", newId, "to path", e.path);
    const pathData = e.path.toObject();
    pathData.id = newId;
    console.log("ID SENDED", pathData.id);
    sendDrawingData(pathData);  // Отправляем данные о только что нарисованном пути
});

canvas.on('object:modified', function (e) {
    const movedObject = e.target;

    const data = {
        type: 'move',
        left: movedObject.left,
        top: movedObject.top,
        scaleX: movedObject.scaleX,
        scaleY: movedObject.scaleY,
        id: movedObject.id
    };
    
    console.log("IDDDDDDDDDDDDDDDD", movedObject);

    sendMoveData(data);
})

function sendMoveData(data) {
    socket.send(JSON.stringify(data));
}

socket.onmessage = function (event) {
    const message = JSON.parse(event.data);
    
    if (message.type === 'move') {
        let movedObject = findObject(message.id);

        movedObject.set({
            left: message.left,
            top: message.top,
            scaleX: message.scaleX,
            scaleY: message.scaleY
        });
        
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
        canvas.add(path);
        console.log("All objects:", canvas._objects.map(obj => obj));
    }
};

function findObject(id) {
    const ids = canvas._objects.find(obj => obj && obj.id === id);
    return ids;
}
