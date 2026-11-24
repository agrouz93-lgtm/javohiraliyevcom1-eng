import { DataTexture, RGBAFormat, RepeatWrapping, SRGBColorSpace } from "three";
export function furnitureTexture(material: string | undefined) {
  if (!material || !["Mato", "Yog‘och", "Metall"].includes(material))
    return null;
  const size = 64,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const grain =
        material === "Mato"
          ? (x % 3 === 0 ? 8 : 0) + (y % 3 === 0 ? 8 : 0)
          : material === "Yog‘och"
            ? Math.round(9 + 7 * Math.sin(x * 0.8 + Math.sin(y * 0.08)))
            : (x * 11 + y * 7) % 5;
      const offset = (y * size + x) * 4,
        shade = 255 - grain;
      data[offset] = data[offset + 1] = data[offset + 2] = shade;
      data[offset + 3] = 255;
    }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(material === "Mato" ? 6 : 2, material === "Mato" ? 6 : 2);
  texture.needsUpdate = true;
  return texture;
}
