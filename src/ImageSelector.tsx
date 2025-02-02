import { Texture, TextureLoader } from "three";

export function ImageSelector({
  onSelect,
}: {
  onSelect: (texture: Texture) => void;
}) {
  function onSelectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0);
    if (!file) {
      return;
    }
    event.target.value = "";
    const url = URL.createObjectURL(file);
    new TextureLoader().load(url, (texture) => {
      onSelect(texture);
    });
  }

  return (
    <div>
      Normal Map:
      <input type="file" onChange={onSelectFile} accept=".png" />
    </div>
  );
}
