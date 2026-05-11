'use client'

import { useEffect, useRef } from 'react'

/**
 * GradientField — flowing iridescent backdrop rendered by a single fragment
 * shader (raw WebGL, no three.js).
 *
 * The shader paints three additive radial-gradient "orbs" that drift via
 * sin/cos animation of their centers. Everything happens on the GPU in one
 * draw call per frame — no CSS blur, no compositor readbacks.
 *
 * If WebGL fails to initialize (driver issue, headless browser, etc.) the
 * canvas hides itself and the CSS-only orbs underneath show through as a
 * graceful fallback.
 */

const VERT = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAG = `
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
varying vec2 vUv;

vec3 orb(vec2 uv, vec2 c, vec3 color, float r) {
  float d = distance(uv, c);
  // Soft falloff — closer = brighter
  float f = smoothstep(r, 0.0, d);
  return color * f;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  // Work in aspect-corrected UV so orbs stay circular
  vec2 uv = vec2(vUv.x * aspect, vUv.y);
  float t = uTime * 0.00018;

  // Three drifting orb centers (in aspect-corrected space)
  vec2 c1 = vec2((0.18 + 0.14 * sin(t * 0.7)) * aspect,  0.32 + 0.10 * cos(t * 0.5));
  vec2 c2 = vec2((0.84 + 0.12 * cos(t * 0.6)) * aspect,  0.24 + 0.12 * sin(t * 0.8));
  vec2 c3 = vec2((0.50 + 0.20 * sin(t * 0.4)) * aspect,  0.92 + 0.10 * cos(t * 0.9));

  vec3 col = vec3(0.0);
  col += orb(uv, c1, vec3(1.00, 0.36, 0.48), 0.70); // pink
  col += orb(uv, c2, vec3(0.54, 0.36, 1.00), 0.75); // purple
  col += orb(uv, c3, vec3(0.00, 0.82, 1.00), 0.90); // cyan

  // Subtle dither so banding doesn't show on cheap displays
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.warn('[GradientField] shader compile failed:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

export default function GradientField() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const gl =
      (canvas.getContext('webgl', {
        antialias: false,
        alpha: false,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
      }) as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)

    if (!gl) {
      // Hide canvas → CSS fallback orbs show through
      canvas.style.display = 'none'
      // eslint-disable-next-line no-console
      console.warn('[GradientField] WebGL unavailable, falling back to CSS orbs')
      return
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) {
      canvas.style.display = 'none'
      return
    }

    const program = gl.createProgram()
    if (!program) {
      canvas.style.display = 'none'
      return
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      // eslint-disable-next-line no-console
      console.warn('[GradientField] program link failed:', gl.getProgramInfoLog(program))
      canvas.style.display = 'none'
      gl.deleteProgram(program)
      return
    }
    gl.useProgram(program)

    // Fullscreen quad (two triangles, NDC coords)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1,
      ]),
      gl.STATIC_DRAW,
    )
    const aPosition = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    const uResolution = gl.getUniformLocation(program, 'uResolution')
    const uTime = gl.getUniformLocation(program, 'uTime')

    let raf = 0
    let mounted = true
    let dimW = 0
    let dimH = 0
    let intersectionObserver: IntersectionObserver | null = null

    const setSize = () => {
      const rect = container.getBoundingClientRect()
      // Clamp DPR to 1.5 — fewer pixels shaded with negligible visual loss
      // on a gradient (no sharp edges to alias).
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))
      if (w === dimW && h === dimH) return
      dimW = w
      dimH = h
      canvas.width = w
      canvas.height = h
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      gl.viewport(0, 0, w, h)
      gl.uniform2f(uResolution, w, h)
    }
    setSize()

    const ro = new ResizeObserver(setSize)
    ro.observe(container)

    // Respect prefers-reduced-motion — render once and skip the loop
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const start = performance.now()
    const draw = (tMs: number) => {
      gl.uniform1f(uTime, tMs)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    // ── Render loop — throttled to ~30fps + paused when off-screen ────────
    const TARGET_FRAME_MS = 1000 / 30 // ~33ms between draws
    let lastFrame = 0
    let visible = true // IntersectionObserver will flip this

    const loop = () => {
      if (!mounted) return
      const now = performance.now()
      if (visible && now - lastFrame >= TARGET_FRAME_MS) {
        draw(now - start)
        lastFrame = now
      }
      raf = requestAnimationFrame(loop)
    }

    if (reduced) {
      draw(0)
    } else {
      // Pause the loop entirely when Hero scrolls out of view — no GPU work,
      // no rAF callbacks, no battery drain on long pages.
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            visible = entry.isIntersecting
          }
          // Restart the loop on visibility change so we resume cleanly
          if (visible && !raf) {
            lastFrame = 0
            raf = requestAnimationFrame(loop)
          } else if (!visible && raf) {
            cancelAnimationFrame(raf)
            raf = 0
          }
        },
        { rootMargin: '50px' }, // small early-fire so we don't blink at the edge
      )
      intersectionObserver.observe(container)

      // Kick off the loop
      raf = requestAnimationFrame(loop)
    }

    return () => {
      mounted = false
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      intersectionObserver?.disconnect()
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [])

  return (
    <div ref={containerRef} className="gradient-field" aria-hidden>
      <canvas ref={canvasRef} className="gradient-canvas" />
      {/* CSS fallback — only visible if WebGL fails and hides the canvas */}
      <span className="orb orb-1" />
      <span className="orb orb-2" />
      <span className="orb orb-3" />
    </div>
  )
}
