import { Texture, Vector2 } from "three";
import { checkNotNull } from "./Nullable";

export function getTextureSize(texture: Texture): Vector2 {
  const width = checkNotNull<number>(texture.source.data.width);
  const height = checkNotNull<number>(texture.source.data.width);

  return new Vector2(width, height);
}
