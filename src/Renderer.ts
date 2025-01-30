import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  WebGLRenderer,
} from "three";
import { HeightmapBuffer } from "./HeightmapBuffer";
import renderFragmentShaderSource from "./render-fragment.glsl?raw";
import vertexShaderSource from "./vertex.glsl?raw";

export class Renderer {
  private renderer = new WebGLRenderer();
  private camera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private geometry = new PlaneGeometry(2, 2);

  private buffer1 = new HeightmapBuffer();
  private buffer2 = new HeightmapBuffer();
  private scene = new Scene();
  private material = new ShaderMaterial({
    uniforms: {
      renderTexture: {
        value: null,
      },
      min: {
        value: 0,
      },
      max: {
        value: 1,
      },
    },
    vertexShader: vertexShaderSource,
    fragmentShader: renderFragmentShaderSource,
  });
  private callback?: () => void;
  range: number[] = [];
  constructor() {
    console.log("Create renderer");
    const cube = new Mesh(this.geometry, this.material);
    this.scene.add(cube);
    this.renderer.setAnimationLoop(() => this.render());
  }

  recomputeRange() {
    const out = this.buffer2.getPixels(this.renderer);
    if (!out) {
      console.log(`No pixels`);
      return;
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
    this.material.uniforms.min.value = min;
    this.material.uniforms.max.value = max;
    this.range = [min, max];
  }

  iterationLimit = 0;
  iteration = 0;
  render() {
    if (this.iteration < this.iterationLimit) {
      this.iteration++;
      this.buffer1.setRenderTarget(this.renderer);
      this.buffer2.render(this.renderer);

      this.buffer2.setRenderTarget(this.renderer);
      this.buffer1.render(this.renderer);
      if (this.iteration % 50 == 0 || this.iteration == this.iterationLimit) {
        this.recomputeRange();
      }
    }

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);

    if (this.callback != null) {
      this.callback();
    }
  }

  getCurrentIterationCount() {
    return this.iteration;
  }

  onRender(callback: () => void) {
    this.callback = callback;
  }

  getCanvas() {
    return this.renderer.domElement;
  }

  dispose() {
    console.log("Dipose");
    this.renderer.dispose();
  }

  size: Vector2 = new Vector2(0, 0);
  load(normalTexture: Texture, size: Vector2) {
    this.size = size;
    this.renderer.setSize(size.x, size.y);
    this.renderer.domElement.style.width = "1024px";
    this.renderer.domElement.style.height = "1024px";

    this.buffer1.configure(normalTexture, size);
    this.buffer2.configure(normalTexture, size);
    this.reset();

    this.material.uniforms.renderTexture.value =
      this.buffer2.getRenderTexture().texture;
    this.material.needsUpdate = true;
  }

  reset() {
    this.iteration = 0;
    this.buffer1.reset(this.renderer);
    this.buffer2.reset(this.renderer);
  }

  run(iterationCount: number) {
    this.iterationLimit = iterationCount;
    this.reset();
  }
  getSize() {
    return this.size;
  }
  getImage() {
    return this.buffer2.getPixels(this.renderer);
  }
}
