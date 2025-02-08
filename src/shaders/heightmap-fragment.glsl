uniform sampler2D normalMap;
uniform sampler2D baseHeightmap;
uniform float width;
uniform float height;
varying vec2 vUv;
uniform bool flipNormalY;
varying vec2 vEdge1Position;
varying vec2 vEdge2Position;
varying float vEdge1Rotation;
varying float vEdge2Rotation;
vec2 maybeFlipY(vec2 pos) {
    if(flipNormalY) {
        return vec2(pos.x, 1.0 - pos.y);
    } else {
        return pos;
    }
}

float xHeightDiff(float sign, vec2 pos) {
    vec4 color = texture2D(normalMap, maybeFlipY(pos));
    float base = texture2D(baseHeightmap, pos).r;
    float x = color.r * 2.0 - 1.0;
    float y = color.g * 2.0 - 1.0;
    float z = clamp(sqrt(1.0 - x * x - y * y), 0.1, 2.0);
    return base + sign * x / z;
}
float yHeightDiff(float sign, vec2 pos) {
    vec4 color = texture2D(normalMap, maybeFlipY(pos));
    float base = texture2D(baseHeightmap, pos).r;
    float x = color.r * 2.0 - 1.0;
    float y = color.g * 2.0 - 1.0;
    float z = clamp(sqrt(1.0 - x * x - y * y), 0.1, 2.0);
    return base + sign * y / z;
}

vec2 toPolar(vec2 pos) {
    return vec2(atan(pos.y, pos.x), length(pos));
}

bool crosses(float a, float b, float line) {
    float aDiff = mod(a - line, 3.1415 * 2.0);
    float bDiff = mod(b - line, 3.1415 * 2.0);
    return sign(aDiff) != sign(bDiff);
}

vec2 computeSourceUV(vec2 uv, vec2 offset) {
    vec2 position = uv + offset / vec2(width, height);
    if(vEdge1Position != vEdge2Position && vEdge1Rotation != vEdge2Rotation) {
        vec2 originalPolar = toPolar(uv - vEdge1Position);
        vec2 positionPolar = toPolar(position - vEdge1Position);
        if(crosses(originalPolar.x, positionPolar.x, vEdge1Rotation)) {
            float newPolarAngle = positionPolar.x - vEdge1Rotation + vEdge2Rotation;
            position = vEdge2Position + vec2(cos(newPolarAngle), cos(newPolarAngle)) * positionPolar.y;
        }
    }
    return position;
}

void main() {
    float height = (xHeightDiff(-1.0, computeSourceUV(vUv, vec2(-1.0, 0.0))) +
        xHeightDiff(1.0, computeSourceUV(vUv, vec2(1.0, 0.0))) +
        yHeightDiff(-1.0, computeSourceUV(vUv, vec2(0.0, -1.0))) +
        yHeightDiff(1.0, computeSourceUV(vUv, vec2(0.0, 1.0))));
    height /= 4.0;
    gl_FragColor = vec4(height, height, height, 1.0);
}