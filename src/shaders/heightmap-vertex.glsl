
varying vec2 edge1Position;
varying vec2 edge2Position;
varying float edge1Rotation;
varying float edge2Rotation;

varying vec2 vUv;
varying vec2 vEdge1Position;
varying vec2 vEdge2Position;
varying float vEdge1Rotation;
varying float vEdge2Rotation;
void main() {
    vEdge1Position = edge1Position;
    vEdge2Position = edge2Position;
    vEdge1Rotation = edge1Rotation;
    vEdge2Rotation = edge2Rotation;

    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * mvPosition;
}
