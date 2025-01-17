import heightmapFragmentSource from "./heightmap-fragment.glsl?raw";
import vertexShaderSource from "./vertex.glsl?raw";
import {
  Color,
  FloatType,
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
export class HeightmapBuffer {
  private geometry = new PlaneGeometry(2, 2);
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
  private camera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
  private mesh: Mesh;
  private heightmap?: WebGLRenderTarget<Texture>;

  constructor() {
    this.mesh = new Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  configure(normalTexture: Texture, size: Vector2) {
    const heightMap = new WebGLRenderTarget(size.x, size.y, {
      type: FloatType,
      depthBuffer: false,
    });
    this.heightmap = heightMap;
    this.material.uniforms.width.value = size.x;
    this.material.uniforms.height.value = size.x;
    this.material.uniforms.baseHeightmap.value = heightMap.texture;
    this.material.uniforms.normalMap.value = normalTexture;
    this.material.needsUpdate = true;
    return heightMap;
  }

  reset(renderer: WebGLRenderer) {
    if (this.heightmap != null) {
      renderer.setClearColor(new Color(0, 0, 0), 1);
      renderer.setRenderTarget(this.heightmap);
      renderer.clear();
    }
  }

  setRenderTarget(renderer: WebGLRenderer) {
    if (this.heightmap != null) {
      renderer.setRenderTarget(this.heightmap);
    }
  }

  render(renderer: WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  getPixels(renderer: WebGLRenderer): Float32Array | null {
    if (!this.heightmap) {
      return null;
    }
    const width = this.material.uniforms.width.value;
    const height = this.material.uniforms.height.value;
    const out = new Float32Array(4 * width * height);
    renderer.readRenderTargetPixels(this.heightmap, 0, 0, width, height, out);
    return out;
  }
  getRenderTexture() {
    if (this.heightmap == null) {
      throw new Error("Render texture has not been created");
    }
    return this.heightmap;
  }
}
