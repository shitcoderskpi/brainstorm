document.addEventListener("DOMContentLoaded", function () {
    const gridCanvas = document.getElementById('grid-shader');
    const gl = gridCanvas.getContext('webgl');
    const ext = gl.getExtension('OES_standard_derivatives');
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

vec2 worldCoord() {
    vec2 pixelCoord = v_uv * u_resolution;
    pixelCoord.y = u_resolution.y - pixelCoord.y;
    return (pixelCoord - u_offset) / u_zoom;
}

float gridLine(vec2 coord, float size) {
    vec2 gridPos = coord / size;
    vec2 fraction = fract(gridPos + 0.001);
    vec2 dist = min(fraction, 1.0 - fraction);
    
    // Фиксированная толщина в 1 пиксель
    float thickness = 1.0 / (u_zoom * size);
    
    vec2 derivatives = fwidth(gridPos);
    vec2 alpha = smoothstep(
        dist - derivatives * 1.5,
        dist + derivatives * 1.5,
        vec2(thickness)
    );
    
    return max(alpha.x, alpha.y);
}

float fadeLevel(float targetSize) {
    // Инвертированная логика: затухание при отдалении
    float currentSize = BASE_SIZE / u_zoom;
    float ratio = targetSize / currentSize;
    return smoothstep(1.0/(GRID_STEP*FADE_RANGE), GRID_STEP*FADE_RANGE, ratio);
}

void main() {
    vec2 coord = worldCoord();
    
    float sizes[5];
    sizes[0] = BASE_SIZE / 16.0;  // 6.25  (visible at max zoom)
    sizes[1] = BASE_SIZE / 4.0;   // 25    (mid zoom)
    sizes[2] = BASE_SIZE;         // 100   (base)
    sizes[3] = BASE_SIZE * 4.0;   // 400   (far)
    sizes[4] = BASE_SIZE * 16.0;  // 1600  (very far)
    
    vec3 color = vec3(1.0);
    
    // Рисуем от мелкого к крупному
    color = mix(color, vec3(0.8), gridLine(coord, sizes[0]) * fadeLevel(sizes[0]));
    color = mix(color, vec3(0.7), gridLine(coord, sizes[1]) * fadeLevel(sizes[1]));
    color = mix(color, vec3(0.6), gridLine(coord, sizes[2]) * fadeLevel(sizes[2]));
    color = mix(color, vec3(0.5), gridLine(coord, sizes[3]) * fadeLevel(sizes[3]));
    color = mix(color, vec3(0.3), gridLine(coord, sizes[4]) * fadeLevel(sizes[4]));
    
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

            updateGrid();
        });
    };

    initControls();
    canvas.on('after:render', updateGrid);
    updateGrid();
});