/* Hi, so how it works
*  We drawing the client line, everytime mouse moves we draw it and save the rest to the memcanvas 
*  Why? Because when canvas drawed like image (ctx.drawImage) then it has AA and its sooooooooo smoooooooth
*  And with the remote ones the same story
*  Anything more detailed is down below
* */


// Creating private id, must be useful later
// It can be changed tho, but it does not change anything for now, need to move it to server later

let userId = localStorage.getItem("userId");    // Take id from storage
if (!userId) {                                               // if no id
    userId = crypto.randomUUID();                            // than create one
    localStorage.setItem("userId", userId);                  // and set it
}

const canvas = document.getElementById("canvas");   // Get canvas
const socket = new WebSocket("wss://dehobitto.xyz/ws");     // create socket, handled by WebSocketHandler.cs

canvas.width = window.innerWidth * 0.98;        // Canvas almost fullscreen
canvas.height = window.innerHeight * 0.95;      // Maybe change multipls
const ctx = canvas.getContext('2d');  // Get context for canvasAPI

ctx.lineWidth = 5; // Setting, need to be changable later
ctx.lineJoin = 'round'; // Beauty
ctx.lineCap = 'round'; // Beauty

let isDrawing = false; // Flag 
let currLine = []; // Im storing all points from click to click there

// memoryCanvas, the most valuable change here, settings
let memCanvas = document.createElement('canvas');
memCanvas.width = canvas.width; // same 
memCanvas.height = canvas.height; // sizes
let memCtx = memCanvas.getContext('2d');

// Store here all incoming lines from another users
let remoteLines = new Map();

// Event listeners
canvas.addEventListener('mousedown', mouseDown, false);
canvas.addEventListener('mousemove', mouseMove, false);
canvas.addEventListener('mouseleave', mouseLeave, false);
document.addEventListener('mouseup', mouseUp, false);

// Variables
let offsetX = 0;
let offsetY = 0;

function updateClientLine(e)
{
    let mouseCoords = getMouse(e, canvas); // get mouse cords
    currLine.push({ x: mouseCoords.x, y: mouseCoords.y }); // push it to current line which we are drawing
}

function mouseDown(e) {
    if (e.button === 0) {
        updateClientLine(e);
        isDrawing = true; // update the flag
    }else if (e.button === 1) {
        let mouseCoords = getMouse(e, canvas); // get mouse cords
        
    }
}

function mouseMove(e) {
    if (!isDrawing) return; // if not drawing then we dont care
    updateClientLine(e);
    // Send full client line so if we lost something than ok
    socket.send(JSON.stringify({ points: currLine, id: userId }));
    // Redraw canvas with incoming lines
    redrawCanvas();
    // Then draw our line
    drawPoints(ctx, currLine);
}

function updateMemCanvas()
{
    // Save this line to mem canvas
    memCtx.clearRect(0, 0, memCanvas.width, memCanvas.height);
    memCtx.drawImage(canvas, offsetX, offsetY);
}

function mouseUp() {
    if (!isDrawing) return;
    isDrawing = false;
    // Send that we ended so we can clear the buffer and etc
    socket.send(JSON.stringify({ type: "end", id: userId })); 
    // Save this line to mem canvas
    updateMemCanvas();
    
    currLine = []; // clear the current line/buffer
}

function mouseLeave() {
    if (isDrawing)
    {
        updateMemCanvas();
        currLine = []; // clear the current line/buffer
    }
}

// Socket handler
socket.onmessage = (event) => {
    const data = JSON.parse(event.data); // parse data
    
    if (data.type === "end") {
        // saving remote line
        let finishedLine = remoteLines.get(data.id);
        if (finishedLine) {         // if there is that line then
            updateMemCanvas();      // ok
            remoteLines.delete(data.id); // and delete from map
        }
    }
    else
    {
        // if no -> delete that shi
        remoteLines.set(data.id, data.points);
    }
    redrawCanvas(); // and redraw all thing
};

// U can just read the name of the function...
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);       // Clear canvas
    ctx.drawImage(memCanvas, offsetX, offsetY);                               // Draw memory lines
    if (isDrawing && currLine.length > 0) {                       // If there is still some dumbass drawing then
        drawPoints(ctx, currLine);                                // Draw it
    }
    // Only then we care about remote ones
    remoteLines.forEach((line) => {
        drawPoints(ctx, line); // just going through every line and draw it
    });
}


// I love that function like my own baby?
// Nevermind, but this function is a game changer!! Smoooth like butter but the criminal undercover..
function drawPoints(ctx, points) {
    // shit does not work then less then 6 points so we just return dot/circle and quit
    if (points.length < 6) {
        let p = points[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.closePath();
        return;
    }
    
    // if there is more then magic happens
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y); // move to the first
    
    // then this happens (i cant remember how i wrote it, just works)
    for (let i = 1; i < points.length - 2; i++) { // point length - 2 because we are already on first and after loop we will move to the last one
        const cx = (points[i].x + points[i + 1].x) / 2;
        const cy = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, cx, cy);
    }
    
    // and we are moving to the last one point 
    ctx.quadraticCurveTo(
        points[points.length - 2].x,
        points[points.length - 2].y,    
        points[points.length - 1].x,
        points[points.length - 1].y
    );
    
    ctx.stroke(); // end with it
}

// Easy way to get mouse coords like we need
function getMouse(e, canvas) {
    const rect = canvas.getBoundingClientRect(); // get sizes
    return { // return object with x and y
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}