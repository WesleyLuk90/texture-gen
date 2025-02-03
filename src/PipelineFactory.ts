import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Texture,
  TypedArray,
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
    console.log(material);
    console.log(geometry);
    const indexes = geometry.index?.array;
    if (indexes == null) {
      throw new Error("Expected indexes");
    }

    const positions = geometry.attributes.position.array;
    const triangleCount = indexes?.length / 3;
    console.log("Triangle count", triangleCount);
    console.log("Vertex count", positions.length / 3);
    const edgesCount = new Map<string, number>();
    function getVertex(index: number) {
      if (index * 3 > positions.length) {
        throw new Error(`Invalid index ${index}`);
      }
      return positions.slice(index * 3, index * 3 + 3).join(",");
    }
    this.findOneSided(indexes);
    for (let i = 0; i < triangleCount; i++) {
      const ai = indexes[i * 3];
      const bi = indexes[i * 3 + 1];
      const ci = indexes[i * 3 + 2];
      // const a = getVertex(ai);
      // const b = getVertex(bi);
      // const c = getVertex(ci);
      // const ab = toEdge(a, b);
      // const bc = toEdge(b, c);
      // const ac = toEdge(a, c);
      // edgesCount.set(ab, (edgesCount.get(ab) ?? 0) + 1);
      // edgesCount.set(bc, (edgesCount.get(bc) ?? 0) + 1);
      // edgesCount.set(ac, (edgesCount.get(ac) ?? 0) + 1);
    }

    // console.log(`Unique edges ${edgesCount.size}`);
    // const adjacentCount = new Map<number, number>();
    // Array.from(edgesCount.entries()).forEach((entry) => {
    //   adjacentCount.set(entry[1], (adjacentCount.get(entry[1]) ?? 0) + 1);
    //   if (entry[1] > 10) {
    //     console.log(entry);
    //   }
    // });
    // console.log(adjacentCount);

    const uvMesh = this.toUVMesh(mesh);
    return this.createPipeline(checkNotNull(material.normalMap), uvMesh);
  }

  private findOneSided(indexes: TypedArray) {
    let counts = new Map<string, number>();
    for (let i = 0; i < indexes.length / 3; i++) {
      const a = indexes[3 * i];
      const b = indexes[3 * i + 1];
      const c = indexes[3 * i + 2];
      const ab = this.createEdge(a, b);
      const bc = this.createEdge(b, c);
      const ca = this.createEdge(c, a);
      counts.set(ab, (counts.get(ab) ?? 0) + 1);
      counts.set(bc, (counts.get(bc) ?? 0) + 1);
      counts.set(ca, (counts.get(ca) ?? 0) + 1);
    }
    console.log(`Total edges ${counts.size}`);
    const byCount = new Map<number, number>();
    counts.forEach((count, key) => {
      byCount.set(count, (byCount.get(count) ?? 0) + 1);
    });
    console.log(`Counts ${Array.from(byCount.entries())}`);
  }

  private createEdge(a: number, b: number) {
    if (a < b) {
      return `${a},${b}`;
    } else {
      return `${b},${a}`;
    }
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

function toEdge(a: string, b: string): string {
  if (a < b) {
    return `${a}:${b}`;
  } else {
    return `${b}:${a}`;
  }
}
