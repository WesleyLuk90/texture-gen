import {
  FloatType,
  Mesh,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EXRExporter } from "three/examples/jsm/Addons.js";
import { createUnitPlane } from "./Geometry";
import { checkNotNull } from "./Nullable";
import { Pipeline } from "./Pipeline";
import { PipelineFactory } from "./PipelineFactory";
import renderFragmentShaderSource from "./render-fragment.glsl?raw";
import vertexShaderSource from "./vertex.glsl?raw";

export class Renderer {
  private renderer = new WebGLRenderer({});
  private camera = new OrthographicCamera(0, 1, 1, 0, -1, 1);

  private scene = new Scene();
  private material = new ShaderMaterial({
    uniforms: {
      heightmapTexture: {
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
  private factory = new PipelineFactory();
  constructor() {
    console.log("Create renderer");
    const plane = createUnitPlane(this.material);
    this.scene.add(plane);
    this.renderer.setAnimationLoop(() => this.render());
  }

  private render() {
    if (this.pipeline != null) {
      this.pipeline?.render(this.renderer);
      const [min, max] = this.pipeline.getRange();
      this.material.uniforms.min.value = min;
      this.material.uniforms.max.value = max;
    }
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);

    if (this.callback != null) {
      this.callback();
    }
  }

  getCanvas() {
    return this.renderer.domElement;
  }

  dispose() {
    console.log("Dipose");
    this.pipeline?.dispose();
    this.renderer.dispose();
  }

  private pipeline?: Pipeline;
  loadFromTexture(normalTexture: Texture) {
    this.pipeline = this.factory.fromNormalMap(normalTexture);
    this.configureRender();
  }

  loadFromMesh(mesh: Mesh) {
    this.pipeline = this.factory.fromMesh(mesh);
    this.configureRender();
  }

  private configureRender() {
    const size = checkNotNull(this.pipeline).getSize();
    this.renderer.setSize(size.x, size.y);
    this.renderer.domElement.style.width = "1024px";
    this.renderer.domElement.style.height = "1024px";

    this.material.uniforms.heightmapTexture.value = checkNotNull(
      this.pipeline
    ).getOutputTexture().texture;
    this.material.needsUpdate = true;
  }

  run(iterationCount: number, callback: (iteration: number) => void) {
    this.pipeline?.start(iterationCount, callback);
  }

  async getEXRData() {
    if (!this.pipeline) {
      throw new Error("No pipeline loaded");
    }
    const size = this.pipeline.getSize();
    const heightmapOut = new WebGLRenderTarget(size.x, size.y, {
      type: FloatType,
      depthBuffer: false,
    });
    this.renderer.setRenderTarget(heightmapOut);
    this.renderer.render(this.scene, this.camera);
    const exporter = new EXRExporter();
    const exrData = await exporter.parse(this.renderer, heightmapOut, {
      type: FloatType,
    });
    heightmapOut.dispose();
    this.renderer.setRenderTarget(null);
    return exrData;
  }
}
