attribute vec2 edge;
attribute vec2 oppositeEdge;

varying vec2 vUv;
varying vec2 vEdge;
varying vec2 vOppositeEdge;
void main() {
    vEdge = edge;
    vOppositeEdge = oppositeEdge;
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * mvPosition;
}
