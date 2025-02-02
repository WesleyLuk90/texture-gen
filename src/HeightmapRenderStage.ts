import {
  BufferGeometry,
  Color,
  DoubleSide,
  FloatType,
  Mesh,
  NormalBufferAttributes,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { createUnitPlane } from "./Geometry";
import heightmapFragmentSource from "./heightmap-fragment.glsl?raw";
import { getTextureSize } from "./Textures";
import vertexShaderSource from "./vertex.glsl?raw";
export class HeightmapRenderStage {
  private scene = new Scene();
  private camera = new OrthographicCamera(0, 1, 1, 0, -1, 1);
  private mesh: Mesh;
  private outputHeightmap: WebGLRenderTarget<Texture>;
  private material: ShaderMaterial;

  constructor(normalMap: Texture, geometry: BufferGeometry | null) {
    const size = getTextureSize(normalMap);
    this.material = new ShaderMaterial({
      uniforms: {
        normalMap: {
          value: normalMap,
        },
        baseHeightmap: {
          value: null,
        },
        width: { value: size.x },
        height: { value: size.y },
        flipNormalY: { value: !normalMap.flipY },
      },
      vertexShader: vertexShaderSource,
      fragmentShader: heightmapFragmentSource,
      side: DoubleSide,
    });
    if (geometry != null) {
      this.mesh = new Mesh(geometry, this.material);
    } else {
      this.mesh = createUnitPlane(this.material);
    }
    this.scene.add(this.mesh);

    this.outputHeightmap = new WebGLRenderTarget(size.x, size.y, {
      type: FloatType,
      depthBuffer: false,
    });
  }

  setSourceHeightmap(texture: Texture) {
    this.material.uniforms.baseHeightmap.value = texture;
    this.material.needsUpdate = true;
  }

  reset(renderer: WebGLRenderer) {
    renderer.setClearColor(new Color(0, 0, 0), 1);
    renderer.setRenderTarget(this.outputHeightmap);
    renderer.clear();
  }

  setRenderTarget(renderer: WebGLRenderer) {
    renderer.setRenderTarget(this.outputHeightmap);
  }

  render(renderer: WebGLRenderer) {
    this.setRenderTarget(renderer);
    renderer.render(this.scene, this.camera);
  }

  getPixels(renderer: WebGLRenderer): Float32Array | null {
    const width = this.material.uniforms.width.value;
    const height = this.material.uniforms.height.value;
    const out = new Float32Array(4 * width * height);
    renderer.readRenderTargetPixels(
      this.outputHeightmap,
      0,
      0,
      width,
      height,
      out
    );
    return out;
  }

  getOutputHeightmap() {
    return this.outputHeightmap;
  }

  setMesh(uvMesh: BufferGeometry<NormalBufferAttributes>) {
    this.scene.clear();
    this.mesh = new Mesh(uvMesh, this.material);
    this.scene.add(this.mesh);
  }

  dispose() {
    this.outputHeightmap.dispose();
  }
}
