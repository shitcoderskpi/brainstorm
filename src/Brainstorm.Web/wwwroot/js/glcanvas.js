document.addEventListener("DOMContentLoaded", function () {
    const gridCanvas = document.getElementById('grid-shader');
    const gl = gridCanvas.getContext('webgl');
    gl.getExtension('OES_standard_derivatives');

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
      precision mediump float;

      uniform float u_zoom;
      uniform vec2 u_resolution;
      uniform vec2 u_offset;
      varying vec2 v_uv;

      float gridLine(vec2 coord, float size, float thickness) {
        vec2 line = abs(fract(coord / size));
        vec2 width = fwidth(coord / size);
        vec2 grid = line / width;
        float minLine = min(grid.x, grid.y);
        return 1.0 - smoothstep(thickness, thickness + 1.0, minLine);
      }

      void main() {
        vec2 pixelCoord = v_uv * u_resolution;
        pixelCoord.y = u_resolution.y - pixelCoord.y;
        vec2 coord = (pixelCoord - u_offset) / u_zoom;
    
        float majorGrid = gridLine(coord, 100.0, 1.0);
        float minorGrid = gridLine(coord, 25.0, 0.5);
        float grid = max(majorGrid, minorGrid * 0.5);
        
        vec3 bg = vec3(1.0);              
        vec3 lineColor = vec3(0.9);       
        gl_FragColor = vec4(mix(bg, lineColor, grid), 1);
      }

    `;

    function createShader(gl, type, src) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
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
        throw new Error("Program link error: " + gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1,  1,
        -1,  1,
        1, -1,
        1,  1,
    ]), gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    const u_zoom = gl.getUniformLocation(program, "u_zoom");
    const u_resolution = gl.getUniformLocation(program, "u_resolution");
    const u_offset = gl.getUniformLocation(program, "u_offset");

    const updateGrid = () => {
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;

        gl.uniform1f(u_zoom, zoom);
        gl.uniform2f(u_resolution, gridCanvas.width, gridCanvas.height);

        // Corrected: Use vpt[4] and vpt[5] directly
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
    };

    initControls();
    canvas.on('after:render', updateGrid);
    updateGrid();
});
