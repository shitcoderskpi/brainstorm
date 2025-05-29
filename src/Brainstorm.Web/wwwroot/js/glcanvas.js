document.addEventListener("DOMContentLoaded", function () {
    const gl = gridCanvas.getContext('webgl');
    const ext = gl.getExtension('OES_standard_derivatives');
    const inputX = document.getElementById("input-x");
    const inputY = document.getElementById("input-y");
    updateInputsFromCanvas();
    if (!ext) {
        console.warn('OES_standard_derivatives not supported');
    }

    // Synchronize sizes
    function initSizes() {
        gridCanvas.width = canvas.width;
        gridCanvas.height = canvas.height;
        gl.viewport(0, 0, gridCanvas.width, gridCanvas.height);
    }
    initSizes();
    window.addEventListener('resize', initSizes);

    const vertexShaderSrc = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
v_uv = a_position * 0.5 + 0.5;
gl_Position = vec4(a_position, 0, 1);
}
    `;

    const fragmentShaderSrc = `
#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform float u_zoom;
uniform vec2 u_resolution;
uniform vec2 u_offset;
varying vec2 v_uv;

const float BASE_SIZE = 100.0;
const float GRID_STEP = 4.0;
const float FADE_RANGE = 0.7;

// Constants to control grid line visibility
const float MIN_LINE_WIDTH_PIXELS = 1.0;
const float MAX_GRID_DENSITY = 100.0;  // Maximum number of grid lines per screen

vec2 worldCoord() {
    vec2 pixelCoord = v_uv * u_resolution;
    pixelCoord.y = u_resolution.y - pixelCoord.y;
    return (pixelCoord - u_offset) / u_zoom;
}

// Improved grid line function with better pixel-perfect rendering
float gridLine(vec2 coord, float size) {
    vec2 gridPos = coord / size;
    vec2 fraction = fract(gridPos);
    vec2 dist = min(fraction, 1.0 - fraction);
    
    // Convert back to pixel space to ensure consistent line width
    vec2 dist_pixels = dist * size * u_zoom;
    
    // Calculate pixel derivatives for line width adjustment
    vec2 pixelWidth = fwidth(coord) * u_zoom;
    
    // Ensure minimum visible line width in pixels
    vec2 lineWidth = max(pixelWidth, vec2(MIN_LINE_WIDTH_PIXELS));
    
    // Create anti-aliased lines with consistent width
    vec2 line = smoothstep(lineWidth, vec2(0.0), dist_pixels);
    
    return max(line.x, line.y);
}

// Enhanced fade level calculation that prevents disappearing lines
float fadeLevel(float targetSize) {
    // Convert grid size to screen pixels
    float gridPixelSize = targetSize * u_zoom;
    
    // Calculate grid density (how many grid cells fit in the screen)
    float gridDensity = min(u_resolution.x, u_resolution.y) / gridPixelSize;
    
    // Fade out grids that are too dense
    float densityFade = 1.0 - smoothstep(MAX_GRID_DENSITY * 0.5, MAX_GRID_DENSITY, gridDensity);
    
    // Fade out grids that are too sparse (cells larger than screen)
    float sparseFade = smoothstep(0.2, 1.0, gridDensity);
    
    // Calculate how close this grid is to the "ideal" size for current zoom
    float currentSize = BASE_SIZE / u_zoom;
    float ratio = targetSize / currentSize;
    float idealFade = smoothstep(1.0/(GRID_STEP*FADE_RANGE), GRID_STEP*FADE_RANGE, ratio);
    
    // Combine all fade factors
    return clamp(idealFade * densityFade * sparseFade, 0.1, 1.0);
}

void main() {
    vec2 coord = worldCoord();
    
    float sizes[5];
    sizes[0] = BASE_SIZE / 16.0;
    sizes[1] = BASE_SIZE / 4.0;
    sizes[2] = BASE_SIZE;
    sizes[3] = BASE_SIZE * 4.0;
    sizes[4] = BASE_SIZE * 16.0;
    
    // Define grid line colors - from lightest to darkest
    vec3 gridColors[5];
    gridColors[0] = vec3(0.85);  // Smallest grid
    gridColors[1] = vec3(0.75);
    gridColors[2] = vec3(0.65);  // Medium grid
    gridColors[3] = vec3(0.55);
    gridColors[4] = vec3(0.45);  // Largest grid
    
    vec3 color = vec3(1.0);
    
    // Draw all grid levels with enhanced visibility
    for (int i = 0; i < 5; i++) {
        float lineIntensity = gridLine(coord, sizes[i]);
        float fade = fadeLevel(sizes[i]);
        
        // Always draw at least a bit of each grid to avoid disappearing lines
        // Use intensity and fade to modulate visibility
        if (lineIntensity > 0.001) {
            float alpha = lineIntensity * fade;
            color = mix(color, gridColors[i], alpha);
        }
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;

    function createShader(gl, type, src) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader compile error: " + gl.getShaderInfoLog(shader));
            throw new Error("Shader compile error: " + gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error: " + gl.getProgramInfoLog(program));
        throw new Error("Program link error: " + gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
    ]), gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    const u_zoom = gl.getUniformLocation(program, "u_zoom");
    const u_resolution = gl.getUniformLocation(program, "u_resolution");
    const u_offset = gl.getUniformLocation(program, "u_offset");

    // Enable alpha blending for smoother lines
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const updateGrid = () => {
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;

        // Check if canvas size needs updating
        if (gridCanvas.width !== canvas.width || gridCanvas.height !== canvas.height) {
            initSizes();
        }

        // Clear before drawing
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1f(u_zoom, zoom);
        gl.uniform2f(u_resolution, gridCanvas.width, gridCanvas.height);
        gl.uniform2f(u_offset, vpt[4], vpt[5]);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    let canvasOffsetX = 0;
    let canvasOffsetY = 0;
    
    const initControls = () => {
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        let isAltPressed = false;

        const handleKey = (e) => {
            isAltPressed = e.type === 'keydown' && e.key === 'Alt';
            canvas.selection = !isAltPressed;
            canvas.defaultCursor = isAltPressed ? 'grab' : 'default';
        };

        document.addEventListener('keydown', handleKey);
        document.addEventListener('keyup', handleKey);

        canvas.on('mouse:down', (opt) => {
            if (isAltPressed && opt.e.button === 0) {
                isDragging = true;
                lastX = opt.e.clientX;
                lastY = opt.e.clientY;
                canvas.defaultCursor = 'grabbing';
            }
        });

        canvas.on('mouse:move', (opt) => {
            if (isDragging && isAltPressed) {
                const deltaX = opt.e.clientX - lastX;
                const deltaY = opt.e.clientY - lastY;

                canvas.relativePan({ x: deltaX, y: deltaY });

                lastX = opt.e.clientX;
                lastY = opt.e.clientY;

                updateInputsFromCanvas();
                updateGrid();
            }
        });

        canvas.on('mouse:up', () => {
            isDragging = false;
            canvas.defaultCursor = isAltPressed ? 'grab' : 'default';
        });

        canvas.wrapperEl.addEventListener('contextmenu', (e) => {
            if (isAltPressed) e.preventDefault();
        });

        // Add mouse wheel zoom handling
        canvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;

            // Set reasonable zoom limits
            if (zoom > 20) zoom = 20;
            if (zoom < 0.1) zoom = 0.1;

            canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();

            updateInputsFromCanvas();

            updateGrid();
        });
    };

    initControls();
    canvas.on('after:render', updateGrid);
    updateGrid();

    

// Функция обновления input'ов
    function updateInputsFromCanvas() {
        const vpt = canvas.viewportTransform;
        const zoom = canvas.getZoom();

        // Центр экрана в мировых координатах
        const centerX = (canvas.width / 2 - vpt[4]) / zoom;
        const centerY = (canvas.height / 2 - vpt[5]) / zoom;

        inputX.value = centerX.toFixed(0);
        inputY.value = centerY.toFixed(0);
    }


// Отслеживание ручного изменения координат
    inputX.addEventListener("change", () => {
        canvasOffsetX = parseFloat(inputX.value);
        updateCanvasPosition()
    });
    inputY.addEventListener("change", () => {
        canvasOffsetY = parseFloat(inputY.value);
        updateCanvasPosition()
    });

    function updateCanvasPosition() {
        const zoom = canvas.getZoom();

        const centerX = parseFloat(inputX.value);
        const centerY = parseFloat(inputY.value);

        const vpt = canvas.viewportTransform;

        // Смещаем так, чтобы указанные координаты стали центром экрана
        vpt[4] = canvas.width / 2 - centerX * zoom;
        vpt[5] = canvas.height / 2 - centerY * zoom;

        canvas.setViewportTransform(vpt);
        updateGrid();
        canvas.requestRenderAll();
    }


});
