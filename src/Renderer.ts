import {
  BufferGeometry,
  Float32BufferAttribute,
  FloatType,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EXRExporter } from "three/examples/jsm/Addons.js";
import { Pipeline } from "./Pipeline";
import { PipelineFactory } from "./PipelineFactory";
import renderFragmentShaderSource from "./render-fragment.glsl?raw";
import { getTextureSize } from "./Textures";
import vertexShaderSource from "./vertex.glsl?raw";

export class Renderer {
  private renderer = new WebGLRenderer();
  private camera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private geometry = new PlaneGeometry(2, 2);

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
  range: number[] = [];
  private factory = new PipelineFactory();
  constructor() {
    console.log("Create renderer");
    const cube = new Mesh(this.geometry, this.material);
    this.scene.add(cube);
    this.renderer.setAnimationLoop(() => this.render());
  }

  render() {
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

  getCurrentIterationCount() {
    return this.pipeline?.getIteration();
  }

  onRender(callback: () => void) {
    this.callback = callback;
  }

  getCanvas() {
    return this.renderer.domElement;
  }

  dispose() {
    console.log("Dipose");
    this.pipeline?.dispose();
    this.renderer.dispose();
  }

  size: Vector2 = new Vector2(0, 0);
  private pipeline?: Pipeline;
  load(normalTexture: Texture) {
    const size = getTextureSize(normalTexture);
    this.pipeline = this.factory.fromNormalMap(normalTexture);
    this.renderer.setSize(size.x, size.y);
    this.renderer.domElement.style.width = "1024px";
    this.renderer.domElement.style.height = "1024px";

    this.material.uniforms.heightmapTexture.value =
      this.pipeline.getOutputTexture().texture;
    this.material.needsUpdate = true;

    this.reset();
  }

  reset() {
    this.pipeline?.reset();
  }

  async export() {
    // this.recomputeRange();
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
    this.reset();
  }
  getSize() {
    return this.size;
  }

  loadGLTF(mesh: Mesh) {
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

    const uvMesh = this.toUVMesh(mesh);
    // this.buffer1.setMesh(uvMesh);
    // this.buffer2.setMesh(uvMesh);
    // this.load(material.normalMap);
  }

  toUVMesh(mesh: Mesh): BufferGeometry {
    const geometry = new BufferGeometry();
    const indexes = mesh.geometry.getIndex();
    if (indexes == null) {
      throw new Error("Indexes was null");
    }
    const uvs = mesh.geometry.attributes.uv.array;

    geometry.setAttribute("position", new Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("uvs", new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indexes);
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
