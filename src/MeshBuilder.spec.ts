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
      origin.x,
      origin.y + size,
      origin.x + size,
      origin.y,
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
        1 - (pos[1] + uvOffset) / scale,
        (pos[2] + uvOffset) / scale,
        1 - (pos[3] + uvOffset) / scale,
        (pos[4] + uvOffset) / scale,
        1 - (pos[5] + uvOffset) / scale
      );
    }
    createTriangle(topLeft(new Vector2(1, 1), 1), 1);
    createTriangle(bottomRight(new Vector2(1, 1), 1), 2);
    const pos = new Float32BufferAttribute(new Float32Array(rawPos), 3);
    const uv = new Float32BufferAttribute(new Float32Array(rawUV), 2);
    const index = new Int16BufferAttribute(
      new Int16Array(new Array(rawPos.length / 3).fill(0).map((_, i) => i)),
      1
    );
    const builder = new MeshBuilder(pos, uv, index);
    const mesh = builder.build();
    const positions = Array.from(mesh.getAttribute("position").array);
    const count = 3 * 3 * 2;
    const square = positions.slice(0, count);
    expect(square).toEqual(
      withZ0(
        topLeft(new Vector2(0, 0), 1).concat(bottomRight(new Vector2(0, 0), 1))
      )
    );
    const edge1 = positions.slice(count, count + 6);
    expect(edge1).toEqual(
      withZ0([uv.getX(1), 1 - uv.getY(1), uv.getX(2), 1 - uv.getY(2)])
    );
    const edge2 = positions.slice(count * 2, count * 2 + 6);
    expect(edge2).toEqual(
      withZ0([uv.getX(3), 1 - uv.getY(3), uv.getX(4), 1 - uv.getY(4)])
    );
    const edge1Position = mesh.getAttribute("edge1Position") as BufferAttribute;
    expect(new Vector2().fromBufferAttribute(edge1Position, 7)).toEqual(
      new Vector2(uv.getX(2), 1 - uv.getY(2))
    );
    expect(new Vector2().fromBufferAttribute(edge1Position, 8)).toEqual(
      new Vector2(uv.getX(2), 1 - uv.getY(2))
    );
    const edge1Rotation = mesh.getAttribute("edge1Rotation") as BufferAttribute;
    expect(edge1Rotation.getX(7)).toEqual((-Math.PI * 3) / 4);
    expect(edge1Rotation.getX(8)).toEqual((-Math.PI * 3) / 4);

    const edge2Position = mesh.getAttribute("edge2Position") as BufferAttribute;
    expect(new Vector2().fromBufferAttribute(edge2Position, 7)).toEqual(
      new Vector2(uv.getX(3), 1 - uv.getY(3))
    );
    expect(new Vector2().fromBufferAttribute(edge2Position, 8)).toEqual(
      new Vector2(uv.getX(3), 1 - uv.getY(3))
    );
    // const edge2Rotation = mesh.getAttribute("edge2Rotation") as BufferAttribute;
    // expect(edge2Rotation.getX(7)).toEqual((-Math.PI * 3) / 4);
    // expect(edge2Rotation.getX(8)).toEqual((-Math.PI * 3) / 4);
  });
});
