import {
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

    const uvMesh = this.toUVMesh(mesh);
    return this.createPipeline(checkNotNull(material.normalMap), uvMesh);
  }
  findSeams(positions: TypedArray, indexes: TypedArray, uv: TypedArray) {
    const triangleCount = indexes.length / 3;
    const edges = new Map<string, Edge[]>();
    const seams: [Edge, Edge][] = [];

    function addEdge(edge: Edge) {
      const key = edge.hashCode();
      const edgeList = edges.get(key) ?? [];
      if (edgeList.length > 10) {
        console.error(edgeList);
        throw new Error("Unexpected edge list");
      }
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
      addEdge(new Edge(a, b, uvA, uvB));
      addEdge(new Edge(b, c, uvB, uvC));
      addEdge(new Edge(c, a, uvC, uvA));
    }
    return seams;
  }

  toUVMesh(mesh: Mesh): BufferGeometry {
    const geometry = new BufferGeometry();
    const indexes = mesh.geometry.getIndex();
    if (indexes == null) {
      throw new Error("Indexes was null");
    }
    const originalUVs = checkNotNull(mesh.geometry.attributes.uv.array);

    const vertexCount = originalUVs.length / 2;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    for (let i = 0; i < vertexCount; i++) {
      positions[i * 3] = originalUVs[i * 2];
      positions[i * 3 + 1] = 1 - originalUVs[i * 2 + 1];
      positions[i * 3 + 2] = 0;
      normals[i * 3] = 0;
      normals[i * 3 + 1] = 0;
      normals[i * 3 + 2] = 1;
      uvs[i * 2] = originalUVs[i * 2];
      uvs[i * 2 + 1] = 1 - originalUVs[i * 2 + 1];
    }
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indexes);
    console.log(
      `Vertex count ${vertexCount}, triangle count ${indexes.array.length / 3}`
    );
    return geometry;
  }
}

class Edge {
  constructor(
    readonly a: Vector3,
    readonly b: Vector3,
    readonly uvA: Vector2,
    readonly uvB: Vector2
  ) {
    if (isNaN(a.x) || isNaN(a.y) || isNaN(a.z)) {
      throw new Error("Invalid vertex");
    }
  }

  hashCode() {
    if (
      this.a.x < this.b.x ||
      (this.a.x == this.b.x && this.a.y < this.b.y) ||
      (this.a.x == this.b.x && this.a.y == this.b.y && this.a.z < this.b.z)
    ) {
      return `${this.a.toArray()}:${this.b.toArray()}`;
    } else {
      return `${this.b.toArray()}:${this.a.toArray()}`;
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
