import { useEffect, useRef, useState } from "react";
import { Texture, Vector2 } from "three";
import { useThrottledCallback } from "use-debounce";
import "./App.css";
import { ImageSelector } from "./ImageSelector";
import { Renderer } from "./Renderer";
import { encode } from "fast-png";

function App() {
  const canvasContainer = useRef<HTMLDivElement>(null);
  const renderer = useRef<Renderer | null>(null);
  function getRenderer(): Renderer {
    if (renderer.current == null) {
      renderer.current = new Renderer();
    }
    return renderer.current;
  }
  const [iterationCount, setIterationCount] = useState(
    getRenderer().getCurrentIterationCount()
  );
  const [wantedIterationCount, setWantedIterationCount] = useState(512);

  const updateIterationCount = useThrottledCallback(() => {
    setIterationCount(getRenderer().getCurrentIterationCount());
  }, 100);

  useEffect(() => {
    console.log("Use effect");
    getRenderer().onRender(updateIterationCount);
    if (canvasContainer.current == null) {
      throw new Error("Missing canvas");
    }
    const canvas = getRenderer().getCanvas();
    canvasContainer.current?.appendChild(canvas);
  }, []);

  function onSelect(texture: Texture, size: Vector2) {
    getRenderer().load(texture, size);
  }

  function run() {
    getRenderer().run(wantedIterationCount);
  }

  async function download() {
    const exr = await getRenderer().export()
    const blob = new Blob([exr], { type: "image/x-exr" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "heightmap.exr";
    link.click();
  }

  return (
    <div>
      <ImageSelector onSelect={onSelect} />
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
