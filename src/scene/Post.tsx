import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { VERT_QUAD } from "./glsl";

/**
 * The film look. Four passes:
 *   1  scene  -> a render target that also keeps depth
 *   2  quarter-res horizontal blur, deliberately 2.6x wider than tall
 *   3  vertical blur, tighter — that ratio IS the anamorphic look
 *   4  composite: depth-of-field, bloom streaks, halation, grade,
 *      lens falloff, gate weave and 24fps grain
 *
 * This component takes over rendering: because it registers useFrame at
 * priority 1, react-three-fiber stops rendering the scene automatically.
 */
export function Post({ focusRef, reduced }: { focusRef: React.RefObject<number>; reduced: boolean }) {
  const { gl, scene, camera, size, viewport } = useThree();
  const dpr = viewport.dpr;

  const hasDepth = useMemo(
    () => !!gl.extensions.get("WEBGL_depth_texture"),
    [gl]
  );

  const { rtScene, rtA, rtB, blurMat, postMat, quadScene, quadCam, quad } = useMemo(() => {
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, stencilBuffer: false };
    const w = Math.max(2, Math.floor(size.width * dpr));
    const h = Math.max(2, Math.floor(size.height * dpr));

    const rtScene = new THREE.WebGLRenderTarget(w, h, opts);
    if (hasDepth) {
      const dt = new THREE.DepthTexture(w, h);
      dt.type = THREE.UnsignedShortType;
      dt.minFilter = THREE.NearestFilter;
      dt.magFilter = THREE.NearestFilter;
      rtScene.depthTexture = dt;
    }
    const bw = Math.max(2, Math.floor(w / 4));
    const bh = Math.max(2, Math.floor(h / 4));
    const rtA = new THREE.WebGLRenderTarget(bw, bh, opts);
    const rtB = new THREE.WebGLRenderTarget(bw, bh, opts);

    const dummy = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    dummy.needsUpdate = true;

    const blurMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiff: { value: null as THREE.Texture | null },
        uDir: { value: new THREE.Vector2(1, 0) },
        uTexel: { value: new THREE.Vector2(1 / bw, 1 / bh) },
      },
      vertexShader: VERT_QUAD,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiff; uniform vec2 uDir, uTexel; varying vec2 vUv;
        void main(){
          vec2 s = uDir*uTexel;
          vec4 c  = texture2D(tDiff, vUv)*0.1964;
          c += (texture2D(tDiff, vUv+s*1.4117) + texture2D(tDiff, vUv-s*1.4117))*0.2969;
          c += (texture2D(tDiff, vUv+s*3.2941) + texture2D(tDiff, vUv-s*3.2941))*0.0944;
          c += (texture2D(tDiff, vUv+s*5.1764) + texture2D(tDiff, vUv-s*5.1764))*0.0103;
          gl_FragColor = c;
        }`,
    });

    const postMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null as THREE.Texture | null },
        tBlur: { value: null as THREE.Texture | null },
        tDepth: { value: dummy as THREE.Texture },
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(size.width, size.height) },
        uFocus: { value: 16 },
        uRange: { value: 11 },
        uNear: { value: (camera as THREE.PerspectiveCamera).near },
        uFar: { value: (camera as THREE.PerspectiveCamera).far },
        uHasDepth: { value: hasDepth ? 1 : 0 },
        uExposure: { value: 1 },
        uWeave: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: VERT_QUAD,
      fragmentShader: /* glsl */ `
        uniform sampler2D tScene, tBlur, tDepth;
        uniform float uTime, uFocus, uRange, uNear, uFar, uHasDepth, uExposure;
        uniform vec2 uRes, uWeave;
        varying vec2 vUv;

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float linDepth(vec2 uv){
          float d = texture2D(tDepth, uv).x;
          float z = d*2.0 - 1.0;
          return (2.0*uNear*uFar)/(uFar + uNear - z*(uFar - uNear));
        }

        void main(){
          // the negative never sat perfectly still in the gate
          vec2 uv = vUv + uWeave;

          // barrel + chromatic aberration, both growing from frame centre
          vec2 c = uv - 0.5;
          float r2 = dot(c, c);
          uv = 0.5 + c*(1.0 + r2*0.030);
          float ca = 0.0016 + r2*0.0090;
          vec3 col;
          col.r = texture2D(tScene, 0.5 + (uv-0.5)*(1.0+ca)).r;
          col.g = texture2D(tScene, uv).g;
          col.b = texture2D(tScene, 0.5 + (uv-0.5)*(1.0-ca)).b;

          // depth of field: the focus pull
          vec3 blurred = texture2D(tBlur, uv).rgb;
          if(uHasDepth > 0.5){
            float ld  = linDepth(uv);
            float coc = clamp(abs(ld - uFocus)/uRange, 0.0, 1.0);
            coc = pow(coc, 1.35);
            col = mix(col, blurred, coc*0.92);
          }

          // anamorphic bloom: a wide horizontal smear off the bright pass
          vec3 bl = vec3(0.0);
          for(int i=-4; i<=4; i++){
            float o = float(i)*0.013;
            vec3 s = texture2D(tBlur, vec2(uv.x + o, uv.y)).rgb;
            bl += max(s - 0.34, 0.0) * (1.0 - abs(float(i))*0.16);
          }
          bl /= 6.0;
          col += bl * vec3(0.55,0.80,1.25) * 1.5;

          // halation: warm bleed around the hottest areas
          vec3 hot = max(texture2D(tBlur, uv).rgb - 0.52, 0.0);
          col += hot * vec3(1.30,0.60,0.24) * 0.85;

          col *= uExposure;

          // the grade: green-black shadows, sodium highlights
          float l = dot(col, vec3(0.2126,0.7152,0.0722));
          col = col*vec3(1.085,0.985,0.870) + vec3(0.020,0.055,0.048)*(1.0 - smoothstep(0.0,0.55,l));
          col.b += (1.0 - col.r)*0.020;
          col = mix(vec3(l), col, 0.86);
          col = (col*(2.51*col + 0.03))/(col*(2.43*col + 0.59) + 0.14);   // filmic

          // oval lens falloff
          vec2 v = (vUv - 0.5) * vec2(1.06, 1.32);
          col *= mix(0.30, 1.0, smoothstep(0.86, 0.16, length(v)));

          // grain lives in the midtones and dies in the blacks
          float lg = dot(col, vec3(0.2126,0.7152,0.0722));
          float g = hash(vUv*uRes + uTime*141.0) - 0.5;
          col += g * 0.055 * smoothstep(0.0,0.32,lg) * (1.0 - smoothstep(0.55,1.0,lg));

          gl_FragColor = vec4(max(col, 0.0), 1.0);
        }`,
    });

    const quadScene = new THREE.Scene();
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat);
    quad.frustumCulled = false;
    quadScene.add(quad);

    return { rtScene, rtA, rtB, blurMat, postMat, quadScene, quadCam, quad };
  }, [hasDepth]);

  // keep the targets matched to the canvas
  useEffect(() => {
    const w = Math.max(2, Math.floor(size.width * dpr));
    const h = Math.max(2, Math.floor(size.height * dpr));
    rtScene.setSize(w, h);
    const bw = Math.max(2, Math.floor(w / 4));
    const bh = Math.max(2, Math.floor(h / 4));
    rtA.setSize(bw, bh);
    rtB.setSize(bw, bh);
    blurMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
    postMat.uniforms.uRes.value.set(size.width, size.height);
  }, [size.width, size.height, dpr, rtScene, rtA, rtB, blurMat, postMat]);

  useEffect(() => () => {
    rtScene.dispose(); rtA.dispose(); rtB.dispose();
    blurMat.dispose(); postMat.dispose();
  }, [rtScene, rtA, rtB, blurMat, postMat]);

  const last = useRef(0);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // gate weave and exposure flicker, quantised to 24fps so they read as film
    const ft = Math.floor(t * 24) / 24;
    postMat.uniforms.uTime.value = ft;
    postMat.uniforms.uFocus.value = focusRef.current ?? 16;
    postMat.uniforms.uWeave.value.set(
      reduced ? 0 : (Math.sin(ft * 13.1) + Math.sin(ft * 7.7)) * 0.00035,
      reduced ? 0 : (Math.sin(ft * 11.3) + Math.sin(ft * 5.9)) * 0.00028
    );
    postMat.uniforms.uExposure.value = reduced
      ? 1
      : 1 + Math.sin(ft * 17.0) * 0.012 + Math.sin(ft * 3.1) * 0.008;

    // 1 — scene, with depth
    gl.setRenderTarget(rtScene);
    gl.clear();
    gl.render(scene, camera);

    // 2 — horizontal, anamorphically wide
    quad.material = blurMat;
    blurMat.uniforms.tDiff.value = rtScene.texture;
    blurMat.uniforms.uDir.value.set(2.6, 0);
    gl.setRenderTarget(rtA);
    gl.render(quadScene, quadCam);

    // 3 — vertical, tighter
    blurMat.uniforms.tDiff.value = rtA.texture;
    blurMat.uniforms.uDir.value.set(0, 1.0);
    gl.setRenderTarget(rtB);
    gl.render(quadScene, quadCam);

    // 4 — composite to the screen
    quad.material = postMat;
    postMat.uniforms.tScene.value = rtScene.texture;
    postMat.uniforms.tBlur.value = rtB.texture;
    if (hasDepth && rtScene.depthTexture) postMat.uniforms.tDepth.value = rtScene.depthTexture;
    gl.setRenderTarget(null);
    gl.render(quadScene, quadCam);

    last.current = t;
  }, 1);

  return null;
}
