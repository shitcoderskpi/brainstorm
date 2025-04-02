const gridCanvas = document.getElementById("grid");   // Get canvas
gridCanvas.width = window.innerWidth * 0.99;        // Canvas almost fullscreen
gridCanvas.height = window.innerHeight * 0.97;      // Maybe change multipls
const ctxCanvas = gridCanvas.getContext('2d');  // Get context for canvasAPI

drawGrid();

function drawGrid()
{
    let s = 35;
    let pL = 7;
    let pT = 13;
    let pR = 0;
    let pB = 0;
    
    ctxCanvas.strokeStyle = 'lightgrey';
    ctxCanvas.lineWidth = 1;

    ctxCanvas.beginPath();
    for (let x = pL; x <= window.innerWidth - pR; x += s) {
        ctxCanvas.moveTo(x, pT);
        ctxCanvas.lineTo(x, window.innerHeight - pB);
    }
    for (let y = pT; y <= window.innerHeight - pB; y += s) {
        ctxCanvas.moveTo(pL, y);
        ctxCanvas.lineTo(window.innerWidth - pR, y);
    }
    ctxCanvas.stroke();
}