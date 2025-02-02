uniform sampler2D heightmapTexture;
uniform float min;
uniform float max;
varying vec2 vUv;

void main() {
    float color = texture2D(heightmapTexture, vUv).r;
    float value = (color - min) / (max - min);
    gl_FragColor = vec4(value, value, value, 1.0);
}