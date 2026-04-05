/**
 * Shared WebGL infrastructure for shader demos.
 *
 * Provides context creation, shader compilation, program linking,
 * uniform helpers, and resize handling. Designed for fullscreen-quad
 * fragment shader effects (no geometry beyond a single triangle strip).
 */

// --- Shader compilation & linking ---

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${log}`);
  }
  // Shaders are linked — free references
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

// --- Fullscreen quad ---

/** Standard vertex shader for a fullscreen quad. Outputs UV in v_uv. */
export const FULLSCREEN_QUAD_VS = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  // Triangle strip covering [-1,1] viewport
  float x = float((gl_VertexID & 1) << 2) - 1.0;
  float y = float((gl_VertexID & 2) << 1) - 1.0;
  v_uv = vec2(x, y) * 0.5 + 0.5;
  gl_Position = vec4(x, y, 0.0, 1.0);
}
`;

/** Draw a fullscreen triangle (3 verts, no buffer needed). */
export function drawFullscreenQuad(gl: WebGL2RenderingContext) {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// --- Uniform helpers ---

export type UniformSetter = (
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation,
  value: number | number[]
) => void;

const uniformSetters: Record<string, UniformSetter> = {
  "1f": (gl, loc, v) => gl.uniform1f(loc, v as number),
  "2f": (gl, loc, v) => {
    const a = v as number[];
    gl.uniform2f(loc, a[0], a[1]);
  },
  "3f": (gl, loc, v) => {
    const a = v as number[];
    gl.uniform3f(loc, a[0], a[1], a[2]);
  },
  "4f": (gl, loc, v) => {
    const a = v as number[];
    gl.uniform4f(loc, a[0], a[1], a[2], a[3]);
  },
};

export interface UniformDef {
  type: "1f" | "2f" | "3f" | "4f";
  value: number | number[];
}

export function setUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniforms: Record<string, UniformDef>
) {
  for (const [name, def] of Object.entries(uniforms)) {
    const loc = gl.getUniformLocation(program, name);
    if (loc) uniformSetters[def.type](gl, loc, def.value);
  }
}

// --- Context & resize ---

export function initWebGL(
  canvas: HTMLCanvasElement,
  options?: WebGLContextAttributes
): WebGL2RenderingContext {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    ...options,
  });
  if (!gl) throw new Error("WebGL2 not supported");
  return gl;
}

/**
 * Resize canvas to match its CSS pixel size × devicePixelRatio.
 * Returns true if the size actually changed (so caller can update uniforms).
 */
export function resizeCanvas(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext): boolean {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    return true;
  }
  return false;
}
