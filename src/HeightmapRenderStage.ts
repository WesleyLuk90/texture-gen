import {
  BufferGeometry,
  Color,
  FloatType,
  Mesh,
  NormalBufferAttributes,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import { createUnitPlane } from "./Geometry";
import heightmapFragmentSource from "./heightmap-fragment.glsl?raw";
import { getTextureSize } from "./Textures";
import vertexShaderSource from "./vertex.glsl?raw";
export class HeightmapRenderStage {
  private material = new ShaderMaterial({
    uniforms: {
      normalMap: {
        value: null,
      },
      baseHeightmap: {
        value: null,
      },
      width: { value: 0 },
      height: { value: 0 },
    },
    vertexShader: vertexShaderSource,
    fragmentShader: heightmapFragmentSource,
  });
  private scene = new Scene();
  private camera = new OrthographicCamera(0, 1, 1, 0, -1, 1);
  private mesh: Mesh;
  private outputHeightmap: WebGLRenderTarget<Texture>;

  constructor(normalMap: Texture) {
    this.mesh = createUnitPlane(this.material);
    this.scene.add(this.mesh);

    const size = getTextureSize(normalMap);
    this.outputHeightmap = new WebGLRenderTarget(size.x, size.y, {
      type: FloatType,
      depthBuffer: false,
    });
    this.material.uniforms.width.value = size.x;
    this.material.uniforms.height.value = size.y;
    this.material.uniforms.normalMap.value = normalMap;
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
