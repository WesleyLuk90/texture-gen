import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  Texture
} from "three";
import { HeightmapRenderStage } from "./HeightmapRenderStage";
import { MeshBuilder } from "./MeshBuilder";
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
    const indexes = geometry.index;
    if (indexes == null) {
      throw new Error("Expected indexes");
    }

    const positions = geometry.attributes.position as BufferAttribute;
    console.log("Vertex count", positions.count);
    const builder = new MeshBuilder(
      positions,
      geometry.attributes.uv as BufferAttribute,
      indexes
    );
    const uvMesh = builder.build();
    return this.createPipeline(checkNotNull(material.normalMap), uvMesh);
  }
}
