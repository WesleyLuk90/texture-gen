import { Texture, TextureLoader, Vector2 } from "three";

export function ImageSelector({
  onSelect,
}: {
  onSelect: (texture: Texture, size: Vector2) => void;
}) {
  function onSelectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0);
    if (!file) {
      return;
    }
    event.target.files = null;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      onSelect(
        new TextureLoader().load(url),
        new Vector2(img.width, img.height)
      );
    };
    img.src = url;
  }

  return (
    <div>
      <input type="file" onChange={onSelectFile} />
      <br></br>
    </div>
  );
}
