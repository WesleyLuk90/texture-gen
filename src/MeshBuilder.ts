import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  TypedArray,
  Vector2,
  Vector3,
} from "three";

function findSeams(
  indexes: TypedArray,
  originalPositions: BufferAttribute,
  originalUV: BufferAttribute
): [Edge, Edge][] {
  const triangleCount = indexes.length / 3;
  const edges = new Map<string, Edge[]>();
  const seams: [Edge, Edge][] = [];

  function addEdge(edge: Edge) {
    const key = edge.hashCode();
    const edgeList = edges.get(key) ?? [];
    edgeList.forEach((existing) => {
      if (existing.isSeam(edge)) {
        seams.push([existing, edge]);
      }
    });
    edgeList.push(edge);
    edges.set(key, edgeList);
  }
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const aIndex = indexes[3 * triangle];
    const bIndex = indexes[3 * triangle + 1];
    const cIndex = indexes[3 * triangle + 2];
    const a = new Vector3().fromBufferAttribute(originalPositions, aIndex);
    const b = new Vector3().fromBufferAttribute(originalPositions, bIndex);
    const c = new Vector3().fromBufferAttribute(originalPositions, cIndex);
    const uvA = new Vector2().fromBufferAttribute(originalUV, aIndex);
    const uvB = new Vector2().fromBufferAttribute(originalUV, bIndex);
    const uvC = new Vector2().fromBufferAttribute(originalUV, cIndex);
    addEdge(new Edge(a, b, uvA, uvB, new Vector3(aIndex, bIndex, cIndex)));
    addEdge(new Edge(b, c, uvB, uvC, new Vector3(bIndex, cIndex, aIndex)));
    addEdge(new Edge(c, a, uvC, uvA, new Vector3(cIndex, aIndex, bIndex)));
  }
  return seams;
}
export class MeshBuilder {
  private seams: [Edge, Edge][];
  positions: Float32BufferAttribute;
  normals: Float32BufferAttribute;
  uvs: Float32BufferAttribute;
  edge1Positions: Float32BufferAttribute;
  edge2Positions: Float32BufferAttribute;
  edge1Rotation: Float32BufferAttribute;
  edge2Rotation: Float32BufferAttribute;

  constructor(
    originalPositions: BufferAttribute,
    private originalUVs: BufferAttribute,
    originalIndexes: BufferAttribute
  ) {
    this.seams = findSeams(
      originalIndexes.array,
      originalPositions,
      originalUVs
    );

    const triangleCount = this.seams.length * 2 * 2 + 2;
    const vertexCount = triangleCount * 3;
    this.positions = new Float32BufferAttribute(
      new Float32Array(vertexCount * 3),
      3
    );
    this.normals = new Float32BufferAttribute(
      new Float32Array(vertexCount * 3),
      3
    );
    this.uvs = new Float32BufferAttribute(new Float32Array(vertexCount * 2), 2);
    this.edge1Positions = new Float32BufferAttribute(
      new Float32Array(vertexCount * 2),
      2
    );
    this.edge1Rotation = new Float32BufferAttribute(
      new Float32Array(vertexCount),
      1
    );
    this.edge2Positions = new Float32BufferAttribute(
      new Float32Array(vertexCount * 2),
      2
    );
    this.edge2Rotation = new Float32BufferAttribute(
      new Float32Array(vertexCount),
      1
    );
  }

  private i = 0;

  private addVertex(position: Vector3, uv: Vector2, uvPair: UVPair | null) {
    this.positions.setXYZ(this.i, position.x, position.y, position.z);
    this.uvs.setXY(this.i, uv.x, uv.y);
    this.edge1Positions.setXY(
      this.i,
      uvPair?.position1?.x ?? 0,
      uvPair?.position1?.y ?? 0
    );
    this.edge1Rotation.setX(this.i, uvPair?.rotation1 ?? 0);
    this.edge2Positions.setXY(
      this.i,
      uvPair?.position2?.x ?? 0,
      uvPair?.position2?.y ?? 0
    );
    this.edge2Rotation.setX(this.i, uvPair?.rotation2 ?? 0);
    this.i++;
  }

  private addRectangle(vertices: Vector3[], uvPair: UVPair | null) {
    for (let start = 0; start < 2; start++) {
      this.addVertex(
        vertices[start + 0],
        new Vector2().copy(vertices[start + 0]),
        uvPair
      );
      this.addVertex(
        vertices[start + 1],
        new Vector2().copy(vertices[start + 1]),
        uvPair
      );
      this.addVertex(
        vertices[start + 2],
        new Vector2().copy(vertices[start + 2]),
        uvPair
      );
    }
  }

  private readUV(index: number) {
    return new Vector3(
      this.originalUVs.array[index * 2],
      1 - this.originalUVs.array[index * 2 + 1] // Flip uv into coordinate
    );
  }

  private getUVBase(indexes: Vector3, reverse: boolean): [Vector2, number] {
    const [a, b, c] = indexes.toArray();
    const uvA = this.readUV(a);
    const uvB = this.readUV(b);
    const uvC = this.readUV(c);
    const v = new Vector3().subVectors(uvC, uvB);
    const w = new Vector3().subVectors(uvA, uvB);

    const angle = this.signedAngle2D(v, w);
    if (angle < 0 != reverse) {
      const ab = new Vector2().subVectors(uvA, uvB); 
      console.log(uvA, uvB)
      console.log(ab)
      return [new Vector2().copy(uvB), Math.atan2(ab.y, ab.x)];
    } else {
      const ba = new Vector2().subVectors(uvB, uvA);
      console.log(ba)
      return [new Vector2().copy(uvA), Math.atan2(ba.y, ba.x)];
    }
  }

  private signedAngle2D(v: Vector3, w: Vector3) {
    return Math.atan2(v.x * w.y - v.y * w.x, v.x * w.y + v.y * w.x);
  }

  private processTriangle(originalIndexes: Vector3, oppositeIndexes: Vector3) {
    const [a, b, c] = originalIndexes.toArray();
    const uvA = this.readUV(a);
    const uvB = this.readUV(b);
    const uvC = this.readUV(c);
    const ab = new Vector3().subVectors(uvA, uvB);
    const perpendicular = new Vector3(ab.y, -ab.x, 0)
      .normalize()
      .multiplyScalar(1 / 2048);
    const cb = new Vector3().subVectors(uvC, uvB);
    if (cb.dot(perpendicular) < 0) {
      perpendicular.negate();
    }

    const [origin1, rotation1] = this.getUVBase(originalIndexes, false);
    const [origin2, rotation2] = this.getUVBase(oppositeIndexes, true);
    this.addRectangle(
      [
        uvA,
        uvB,
        new Vector3().addVectors(uvA, perpendicular),
        new Vector3().addVectors(uvB, perpendicular),
      ],
      new UVPair(origin1, rotation1, origin2, rotation2)
    );
  }

  build(): BufferGeometry {
    this.addRectangle(
      [
        new Vector3(0, 0, 0),
        new Vector3(0, 1, 0),
        new Vector3(1, 0, 0),
        new Vector3(1, 1, 0),
      ],
      null
    );
    this.seams.forEach(([e1, e2]) => {
      this.processTriangle(e1.triangle, e2.triangle);
      this.processTriangle(e2.triangle, e1.triangle);
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", this.positions);
    geometry.setAttribute("uv", this.uvs);
    geometry.setAttribute("edge1Position", this.edge1Positions);
    geometry.setAttribute("edge2Position", this.edge2Positions);
    geometry.setAttribute("edge1Rotation", this.edge1Rotation);
    geometry.setAttribute("edge2Rotation", this.edge2Rotation);

    if (this.i != this.positions.count) {
      throw new Error(
        `Final vertex count mismatch ${this.i} != ${this.positions.count}`
      );
    }
    return geometry;
  }
}

// Polar coordinates + rotation to represent the edge, position1 and position2 represent the vertex in the two uv spaces
class UVPair {
  constructor(
    // A positive rotation from rotation 1 should enter the triangle
    readonly position1: Vector2,
    readonly rotation1: number,
    // A negative rotation from rotation 2 should enter the traignel
    readonly position2: Vector2,
    readonly rotation2: number
  ) {}
}

class Edge {
  constructor(
    readonly a: Vector3,
    readonly b: Vector3,
    readonly uvA: Vector2,
    readonly uvB: Vector2,
    readonly triangle: Vector3
  ) {
    if (isNaN(a.x) || isNaN(a.y) || isNaN(a.z)) {
      throw new Error("Invalid vertex");
    }
  }

  hashCode() {
    const a = `${this.a.x},${this.a.y},${this.a.z}`;
    const b = `${this.b.x},${this.b.y},${this.b.z}`;
    if (a < b) {
      return `${a}:${b}`;
    } else {
      return `${b}:${a}`;
    }
  }

  isSeam(other: Edge) {
    return (
      (this.a.equals(other.a) &&
        this.b.equals(other.b) &&
        (!this.uvA.equals(other.uvA) || !this.uvB.equals(other.uvB))) ||
      (this.a.equals(other.b) &&
        this.b.equals(other.a) &&
        (!this.uvA.equals(other.uvB) || !this.uvB.equals(other.uvA)))
    );
  }
}
