import { useEffect, useRef, useState } from "react";
import { Texture, Vector2 } from "three";
import { useThrottledCallback } from "use-debounce";
import "./App.css";
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
  const [iterationCount, setIterationCount] = useState(
    getRenderer().getCurrentIterationCount()
  );

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

  return (
    <div>
      <ImageSelector onSelect={onSelect} />
      <div>Iterations: {iterationCount}</div>
      <div ref={canvasContainer} />
    </div>
  );
}

export default App;
