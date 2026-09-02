/** Shared GLSL fragments. Kept as strings so every material sits in the
 *  same atmosphere as the scene fog. */

export const FOG_FN = /* glsl */ `
uniform vec3 uFogCol;
uniform float uFogDen;
vec3 applyFog(vec3 col, float viewZ){
  float f = 1.0 - exp(-uFogDen*uFogDen * viewZ*viewZ);
  return mix(col, uFogCol, clamp(f, 0.0, 1.0));
}`;

export const SPRITE = /* glsl */ `
float sprite(vec2 uv){ return smoothstep(0.5, 0.0, length(uv - 0.5)); }`;

export const VERT_WORLD = /* glsl */ `
varying vec3 vP; varying float vZ;
void main(){
  vP = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

export const VERT_UV = /* glsl */ `
varying vec2 vUv; varying float vZ;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

export const VERT_QUAD = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
