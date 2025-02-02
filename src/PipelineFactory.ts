import { Texture } from "three";
import { HeightmapRenderStage } from "./HeightmapRenderStage";
import { Pipeline } from "./Pipeline";
import { getTextureSize } from "./Textures";

export class PipelineFactory {
  fromNormalMap(normalMap: Texture): Pipeline {
    const stages: HeightmapRenderStage[] = [];
    for (let i = 0; i < 2; i++) {
      stages.push(new HeightmapRenderStage(normalMap));
    }

    stages.forEach((stage, index) => {
      const previousStage =
        index > 0 ? stages[index - 1] : stages[stages.length - 1];
      stage.setSourceHeightmap(previousStage.getOutputHeightmap().texture);
    });

    return new Pipeline(stages, getTextureSize(normalMap));
  }
}
