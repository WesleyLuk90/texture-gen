import { Vector2, WebGLRenderer } from "three";
import { HeightmapRenderStage } from "./HeightmapRenderStage";

export class Pipeline {
  private iterationLimit = 0;
  private iteration = 0;
  callback?: (iteration: number) => void;
  constructor(private stages: HeightmapRenderStage[], private size: Vector2) {}

  render(renderer: WebGLRenderer) {
    if (this.iteration < this.iterationLimit) {
      this.iteration++;
      this.stages.forEach((stage, index) => {
        const previousStage =
          index > 0
            ? this.stages[index - 1]
            : this.stages[this.stages.length - 1];
        stage.setRenderTarget(renderer);
        previousStage.render(renderer);
      });
      if (
        this.iteration == 1 ||
        this.iteration % 60 == 0 ||
        this.iteration == this.iterationLimit
      ) {
        this.computeRange(renderer);
      }
      if (this.callback) {
        this.callback(this.iteration);
      }
    }
  }

  private lastStage() {
    return this.stages[this.stages.length - 1];
  }

  getOutputTexture() {
    return this.lastStage().getOutputHeightmap();
  }

  getSize() {
    return this.size;
  }

  private range: [number, number] = [0, 1];
  private computeRange(renderer: WebGLRenderer) {
    const out = this.lastStage().getPixels(renderer);
    if (!out) {
      throw new Error("No pixel data found");
    }
    const count = out.length / 4;
    let min = out[0];
    let max = out[0];
    for (let i = 0; i < count; i++) {
      const value = out[i * 4];
      if (value < min) {
        min = value;
      }
      if (value > max) {
        max = value;
      }
    }
    console.log(`New range is ${min.toFixed(4)} to ${max.toFixed(4)}`);
    if (min == max) {
      min = 0;
      max = 1;
    }
    this.range = [min, max];
  }

  getRange() {
    return this.range;
  }

  getIteration() {
    return this.iteration;
  }

  dispose() {
    this.stages.forEach((s) => s.dispose());
  }

  start(iterationCount: number, callback: (iteration: number) => void) {
    this.iteration = 0;
    this.iterationLimit = iterationCount;
    this.callback = callback;
    this.range = [0, 1];
  }
}
