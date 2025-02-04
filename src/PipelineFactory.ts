import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Texture,
  TypedArray,
  Vector2,
  Vector3,
} from "three";
import { HeightmapRenderStage } from "./HeightmapRenderStage";
import { checkNotNull } from "./Nullable";
import { Pipeline } from "./Pipeline";
import { getTextureSize } from "./Textures";

export class PipelineFactory {
  fromNormalMap(normalMap: Texture): Pipeline {
    return this.createPipeline(normalMap, null);
  }

  private createPipeline(normalMap: Texture, geometry: BufferGeometry | null) {
    const stages: HeightmapRenderStage[] = [];
    for (let i = 0; i < 2; i++) {
      stages.push(new HeightmapRenderStage(normalMap, geometry));
    }

    stages.forEach((stage, index) => {
      const previousStage =
        index > 0 ? stages[index - 1] : stages[stages.length - 1];
      stage.setSourceHeightmap(previousStage.getOutputHeightmap().texture);
    });

    return new Pipeline(stages, getTextureSize(normalMap));
  }

  fromMesh(mesh: Mesh): Pipeline {
    const material: MeshStandardMaterial = (
      Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    ) as MeshStandardMaterial;
    const geometry = mesh.geometry;
    const indexes = geometry.index?.array;
    if (indexes == null) {
      throw new Error("Expected indexes");
    }

    const positions = geometry.attributes.position.array;
    console.log("Vertex count", positions.length / 3);
    const seams = this.findSeams(
      positions,
      indexes,
      geometry.attributes.uv.array
    );

    console.log(`Found ${seams.length} seams`);

    const uvMesh = this.toUVMesh(mesh, seams);
    return this.createPipeline(checkNotNull(material.normalMap), uvMesh);
  }
  findSeams(positions: TypedArray, indexes: TypedArray, uv: TypedArray) {
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
      const a = new Vector3().fromArray(
        positions.slice(aIndex * 3, aIndex * 3 + 3)
      );
      const b = new Vector3().fromArray(
        positions.slice(bIndex * 3, bIndex * 3 + 3)
      );
      const c = new Vector3().fromArray(
        positions.slice(cIndex * 3, cIndex * 3 + 3)
      );
      const uvA = new Vector2().fromArray(uv.slice(aIndex * 2, aIndex * 2 + 2));
      const uvB = new Vector2().fromArray(uv.slice(bIndex * 2, bIndex * 2 + 2));
      const uvC = new Vector2().fromArray(uv.slice(cIndex * 2, cIndex * 2 + 2));
      addEdge(new Edge(a, b, uvA, uvB, new Vector3(aIndex, bIndex, cIndex)));
      addEdge(new Edge(b, c, uvB, uvC, new Vector3(bIndex, cIndex, aIndex)));
      addEdge(new Edge(c, a, uvC, uvA, new Vector3(aIndex, cIndex, bIndex)));
    }
    return seams;
  }

  toUVMesh(mesh: Mesh, seams: [Edge, Edge][]): BufferGeometry {
    const geometry = new BufferGeometry();
    let i =0;
    const positions = new Float32Array(seams.length * 3 * 2 * 6);
    const normals = new Float32Array(seams.length * 3 * 2 * 6);
    const uvs = new Float32Array(seams.length * 2 * 2 * 6);
    const originalUVs = checkNotNull(mesh.geometry.attributes.uv.array);
    function addTriangle(originalIndexes: Vector3) {
      const [a, b, c] = originalIndexes.toArray();
      const uvA = new Vector2().fromArray(originalUVs.slice(a * 2, a * 2 + 2));
      const uvB = new Vector2().fromArray(originalUVs.slice(b * 2, a * 2 + 2));
      const uvC = new Vector2().fromArray(originalUVs.slice(c * 2, a * 2 + 2));
      const ba = uvB.sub(uvA);
      const perpendicular = new Vector2(ba.y, ba.x).normalize();
      const cb = uvC.sub(uvB);
      if (cb.dot(perpendicular) < 0) {
        perpendicular.negate();
      }
      positions[i*3] = uvA.x;
      positions[i*3+1] = uvA.y;
      positions[i*3+2] = 0;
    }
    seams.forEach(([e1, e2]) => {
      addTriangle(e1.triangle);
      addTriangle(e2.triangle);
    });
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute([0, 0, 0, 0, 0.5, 0, 0.5, 0, 0], 3)
    );
    geometry.setAttribute(
      "normal",
      new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)
    );
    geometry.setAttribute(
      "uv",
      new Float32BufferAttribute([1, 1, 1, 1, 1, 1], 2)
    );
    return geometry;
  }
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
