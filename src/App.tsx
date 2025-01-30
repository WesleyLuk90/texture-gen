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

  function download() {
    const size = getRenderer().getSize();
    const image = getRenderer().getImage();
    if (!image) {
      console.log("Error");
      return;
    }
    const [min, max] = getRenderer().range;
    const imageData = new Uint16Array(image.length);
    image.forEach((v, i) => {
      const component = i % 4;
      const pixelIndex = Math.floor(i / 4);
      const column = pixelIndex % size.x;
      const row = Math.floor(pixelIndex / size.x)
      const outRow = size.y - row;
      const outIndex = (outRow * size.x + column) * 4 + component;
      if (component == 3) {
        imageData[outIndex] = 0xffff;
      } else {
        imageData[outIndex] = 0xffff * ((v - min) / (max - min));
      }
    });
    const encoded = encode({
      width: size.x,
      height: size.y,
      data: imageData,
      depth: 16,
    });
    const blob = new Blob([encoded], { type: "image/png" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "heightmap.png";
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
