import { Material, Mesh, PlaneGeometry } from "three";

const geometry = new PlaneGeometry(1, 1);
export function createUnitPlane(material: Material): Mesh {
  const plane = new Mesh(geometry, material);
  plane.position.x = 0.5;
  plane.position.y = 0.5;
  return plane;
}
