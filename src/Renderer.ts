import {
  FloatType,
  Material,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { HeightmapBuffer } from "./HeightmapBuffer";
import renderFragmentShaderSource from "./render-fragment.glsl?raw";
import vertexShaderSource from "./vertex.glsl?raw";
import { EXRExporter } from "three/examples/jsm/Addons.js";

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

  async export() {
    this.recomputeRange();
    const heightmapOut = new WebGLRenderTarget(this.size.x, this.size.y, {
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
  loadGLTF(mesh: Mesh) {
    const material: Material = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;
    const geometry = mesh.geometry;
    console.log(material);
    console.log(geometry);
    const indexes = geometry.index?.array;
    if (indexes == null) {
      throw new Error("Expected indexes");
    }

    const positions = geometry.attributes.position.array;
    const uv = geometry.attributes.uv.array;
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
    for (let i = 0; i < triangleCount; i++) {
      const ai = indexes[i * 3];
      const bi = indexes[i * 3 + 1];
      const ci = indexes[i * 3 + 2];
      const a = getVertex(ai);
      const b = getVertex(bi);
      const c = getVertex(ci);
      const ab = toEdge(a, b);
      const bc = toEdge(b, c);
      const ac = toEdge(a, c);
      edgesCount.set(ab, (edgesCount.get(ab) ?? 0) + 1);
      edgesCount.set(bc, (edgesCount.get(bc) ?? 0) + 1);
      edgesCount.set(ac, (edgesCount.get(ac) ?? 0) + 1);
    }

    console.log(`Unique edges ${edgesCount.size}`);
    const adjacentCount = new Map<number, number>();
    Array.from(edgesCount.entries()).forEach((entry) => {
      adjacentCount.set(entry[1], (adjacentCount.get(entry[1]) ?? 0) + 1);
      if (entry[1] > 10) {
        console.log(entry);
      }
    });
    console.log(adjacentCount);
  }
}

function toEdge(a: string, b: string): string {
  if (a < b) {
    return `${a}:${b}`;
  } else {
    return `${b}:${a}`;
  }
}
