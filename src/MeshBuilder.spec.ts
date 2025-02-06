import {
  BufferAttribute,
  Float32BufferAttribute,
  Int16BufferAttribute,
  Vector2,
} from "three";
import { MeshBuilder } from "./MeshBuilder";

describe("MeshBuilder", () => {
  const scale = 16;
  function topLeft(origin: Vector2, size: number) {
    return [
      origin.x,
      origin.y,
      origin.x,
      origin.y + size,
      origin.x + size,
      origin.y,
    ];
  }
  function bottomRight(origin: Vector2, size: number) {
    return [
      origin.x + size,
      origin.y,
      origin.x,
      origin.y + size,
      origin.x + size,
      origin.y + size,
    ];
  }
  function withZ0(values: number[]) {
    expect(values.length % 2).toBe(0);
    for (let i = values.length / 2 - 1; i >= 0; i--) {
      values.splice(i * 2 + 2, 0, 0);
    }
    return values;
  }
  it("should build mesh", () => {
    const rawPos: number[] = [];
    const rawUV: number[] = [];
    function createTriangle(pos: number[], uvOffset: number) {
      rawPos.push(
        pos[0] / scale,
        pos[1] / scale,
        0,
        pos[2] / scale,
        pos[3] / scale,
        0,
        pos[4] / scale,
        pos[5] / scale,
        0
      );
      rawUV.push(
        (pos[0] + uvOffset) / scale,
        (pos[1] + uvOffset) / scale,
        (pos[2] + uvOffset) / scale,
        (pos[3] + uvOffset) / scale,
        (pos[4] + uvOffset) / scale,
        (pos[5] + uvOffset) / scale
      );
    }
    createTriangle(topLeft(new Vector2(1, 2), 1), 1);
    createTriangle(bottomRight(new Vector2(1, 2), 1), 2);
    const pos = new Float32BufferAttribute(new Float32Array(rawPos), 3);
    const uv = new Float32BufferAttribute(new Float32Array(rawUV), 2);
    const index = new Int16BufferAttribute(
      new Int16Array(new Array(rawPos.length / 3).fill(0).map((_, i) => i)),
      1
    );
    const builder = new MeshBuilder(pos, uv, index);
    const mesh = builder.build();
    expect(Array.from(mesh.getAttribute("position").array)).toEqual(
      withZ0([0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1])
    );
  });
});
