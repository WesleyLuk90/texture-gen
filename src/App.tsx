import { useEffect, useRef, useState } from "react";
import { Mesh, Texture } from "three";
import { GLTF } from "three/examples/jsm/Addons.js";
import { useThrottledCallback } from "use-debounce";
import "./App.css";
import { GLTFSelector } from "./GLTFSelector";
import { ImageSelector } from "./ImageSelector";
import { Renderer } from "./Renderer";

function App() {
  const canvasContainer = useRef<HTMLDivElement>(null);
  const renderer = useRef<Renderer | null>(null);
  function getRenderer(): Renderer {
    if (renderer.current == null) {
      renderer.current = new Renderer();
    }
    return renderer.current;
  }
  const [iterationCount, setIterationCount] = useState(0);
  const [wantedIterationCount, setWantedIterationCount] = useState(512);

  const updateIterationCount = useThrottledCallback((iteration: number) => {
    setIterationCount(iteration);
  }, 100);

  useEffect(() => {
    console.log("Use effect");
    if (canvasContainer.current == null) {
      throw new Error("Missing canvas");
    }
    const canvas = getRenderer().getCanvas();
    canvasContainer.current?.appendChild(canvas);
    return () => {
      getRenderer().dispose();
      canvasContainer.current?.removeChild(canvas);
      renderer.current = null;
    };
  }, []);

  function onSelectImage(texture: Texture) {
    getRenderer().loadFromTexture(texture);
  }

  function onSelectGLTF(gltf: GLTF) {
    const children = gltf.scene.children;
    console.log(`GLTF has ${children.length} objects`);
    const index = children.findIndex((child) => child instanceof Mesh);
    if (index == -1) {
      throw new Error("Failed to find mesh in object");
    }
    const mesh = children[index] as Mesh;
    getRenderer().loadFromMesh(mesh);
  }
  function run() {
    getRenderer().run(wantedIterationCount, updateIterationCount);
  }

  async function download() {
    const exr = await getRenderer().getEXRData();
    const blob = new Blob([exr], { type: "image/x-exr" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "heightmap.exr";
    link.click();
  }

  return (
    <div>
      <GLTFSelector onSelect={onSelectGLTF} />
      <ImageSelector onSelect={onSelectImage} />
      <div style={{ display: "flex" }}>
        <div>
          Iterations
          <input
            type="number"
            value={wantedIterationCount}
            onChange={(e) =>
              setWantedIterationCount(parseInt(e.target.value, 10))
            }
          />
        </div>
        <button onClick={run}>Run</button>
        <div>Iterations: {iterationCount}</div>
        <button onClick={download}>Download</button>
      </div>
      <div ref={canvasContainer} />
    </div>
  );
}

export default App;
