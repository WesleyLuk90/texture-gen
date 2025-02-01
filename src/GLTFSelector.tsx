import { Texture, TextureLoader, Vector2 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";

export function GLTFSelector({
  onSelect,
}: {
  onSelect: (gltf: GLTF) => void;
}) {
  function onSelectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0);
    if (!file) {
      return;
    }
    event.target.files = null;
    const loader = new GLTFLoader();
    const url = URL.createObjectURL(file);
    loader.load(url, (gltf => {
      onSelect(gltf)
    }), undefined, err => console.error(err))
  }

  return (
    <div>
      GLTF:
      <input type="file" onChange={onSelectFile} />
    </div>
  );
}
