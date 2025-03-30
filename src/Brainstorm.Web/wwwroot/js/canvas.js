const $ = (id) => document.getElementById(id);
// SUSPICIOUS!!!!!!!
// PAY ATTENTION IF DOES NOT WORK!!!!!!!!!!!!!!
const current_location = window.location; // <- this
console.log(current_location.toString().replace("http://", "ws://") + "/ws") // <- and this
const socket = new WebSocket(current_location.toString().replace("http://", "ws://") + "/ws"); // <- also this

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