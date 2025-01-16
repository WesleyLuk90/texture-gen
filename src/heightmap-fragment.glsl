uniform sampler2D normalMap;
uniform sampler2D baseHeightmap;
uniform float width;
uniform float height;
varying vec2 vUv;

float xHeightDiff(float sign, vec2 pos) {
    vec4 color = texture2D(normalMap, pos);
    float base = texture2D(baseHeightmap, pos).r;
    float x = color.r * 2.0 - 1.0;
    float y = color.g * 2.0 - 1.0;
    float z = clamp(sqrt(1.0 - x * x - y * y), 0.1, 2.0);
    return base + sign * x / z;
}
float yHeightDiff(float sign, vec2 pos) {
    vec4 color = texture2D(normalMap, pos);
    float base = texture2D(baseHeightmap, pos).r;
    float x = color.r * 2.0 - 1.0;
    float y = color.g * 2.0 - 1.0;
    float z = clamp(sqrt(1.0 - x * x - y * y), 0.1, 2.0);
    return base + sign * y / z;
}

void main() {
    float height = (xHeightDiff(-1.0, vec2(vUv.x - 1.0 / width, vUv.y)) +
        xHeightDiff(1.0, vec2(vUv.x + 1.0 / width, vUv.y)) +
        yHeightDiff(-1.0, vec2(vUv.x, vUv.y - 1.0 / height)) +
        yHeightDiff(1.0, vec2(vUv.x, vUv.y + 1.0 / height)));
    height /= 4.0;
    gl_FragColor = vec4(height, height, height, 1.0);
}