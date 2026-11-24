"use client";
import { useState } from "react";
import { Upload, X } from "lucide-react";
import { api, json } from "./shared";
import { furnitureCatalog, type FurnitureProduct } from "./furniture-core.mjs";
type Props = {
  products: FurnitureProduct[];
  onClose: () => void;
  onChange: (products: FurnitureProduct[]) => void;
};
export default function FurnitureAdmin({ products, onClose, onChange }: Props) {
  const [selected, setSelected] = useState("");
  const [newId] = useState(() => "custom-" + crypto.randomUUID());
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    category: "sofas",
    material: "Mato",
    width: "2",
    height: "1",
    depth: "1",
    colors: "#e6e1d9",
    price: "",
    imageUrl: "",
    modelUrl: "",
    available: true,
  });
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function edit(id: string) {
    setSelected(id);
    setMessage("");
    const product = products.find((row) => row.id === id);
    setForm(
      product
        ? {
            id: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
            material: product.material,
            width: String(product.dimensions.width),
            height: String(product.dimensions.height),
            depth: String(product.dimensions.depth),
            colors: product.colors.join(","),
            price: product.price === null ? "" : String(product.price),
            imageUrl: product.imageUrl,
            modelUrl: product.modelUrl,
            available: product.available,
          }
        : {
            id: "custom-" + crypto.randomUUID(),
            name: "",
            description: "",
            category: "sofas",
            material: "Mato",
            width: "2",
            height: "1",
            depth: "1",
            colors: "#e6e1d9",
            price: "",
            imageUrl: "",
            modelUrl: "",
            available: true,
          },
    );
  }
  async function upload(file: File, field: "modelUrl" | "imageUrl") {
    if (file.size > 8000000) {
      setMessage("Fayl 8 MB dan katta.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await api<{ url: string }>("furniture/upload", {
        method: "POST",
        body: data,
      });
      setForm((previous) => ({ ...previous, [field]: result.url }));
      setMessage("Fayl yuklandi.");
    } catch (cause) {
      setMessage((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api(
        "furniture",
        json("PUT", {
          id: form.id || newId,
          name: form.name,
          description: form.description,
          category: form.category,
          material: form.material,
          dimensions: {
            width: Number(form.width),
            height: Number(form.height),
            depth: Number(form.depth),
          },
          colors: form.colors.split(",").map((value) => value.trim()),
          price: form.price === "" ? null : Number(form.price),
          imageUrl: form.imageUrl,
          modelUrl: form.modelUrl,
          available: form.available,
        }),
      );
      const catalog = await api<{ products: FurnitureProduct[] }>("furniture");
      onChange(catalog.products);
      setMessage("Mahsulot saqlandi.");
    } catch (cause) {
      setMessage((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="furniture-modal-backdrop">
      <section
        className="furniture-dialog admin-dialog"
        role="dialog"
        aria-label="Mebel administrator paneli"
      >
        <button
          className="close"
          onClick={onClose}
          aria-label="Admin oynasini yopish"
        >
          <X size={20} />
        </button>
        <h2>Katalogni boshqarish</h2>
        <label>
          Mahsulot
          <select
            value={selected}
            onChange={(event) => edit(event.target.value)}
          >
            <option value="">Yangi mebel</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={submit}>
          <label>
            Nomi
            <input
              required
              value={form.name}
              maxLength={100}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label>
            Tavsif
            <textarea
              value={form.description}
              maxLength={1500}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </label>
          <div className="field-grid">
            <label>
              Kategoriya
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              >
                {furnitureCatalog.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Material
              <input
                required
                value={form.material}
                maxLength={60}
                onChange={(event) =>
                  setForm({ ...form, material: event.target.value })
                }
              />
            </label>
            {(["width", "height", "depth"] as const).map((key, index) => (
              <label key={key}>
                {["Eni (m)", "Balandligi (m)", "Chuqurligi (m)"][index]}
                <input
                  required
                  type="number"
                  min=".06"
                  max={key === "height" ? 10 : 15}
                  step=".01"
                  value={form[key]}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Narxi (so‘m)
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Narx ko‘rsatilmagan"
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Ranglar (HEX, vergul bilan)
            <input
              required
              value={form.colors}
              onChange={(event) =>
                setForm({ ...form, colors: event.target.value })
              }
            />
          </label>
          <label>
            <Upload size={16} /> Rasm
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file, "imageUrl");
              }}
            />
            <small>
              {form.imageUrl
                ? "Rasm tanlangan"
                : "PNG, JPEG, WebP · 8 MB gacha"}
            </small>
          </label>
          <label>
            <Upload size={16} /> 3D model
            <input
              type="file"
              accept=".glb,.gltf"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file, "modelUrl");
              }}
            />
            <small>
              {form.modelUrl
                ? "Model tanlangan"
                : "GLB yoki embedded GLTF · 8 MB gacha"}
            </small>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) =>
                setForm({ ...form, available: event.target.checked })
              }
            />{" "}
            Katalogda ko‘rsatish
          </label>
          {message && <p role="status">{message}</p>}
          <button
            className="furniture-add"
            disabled={busy || !form.modelUrl || !form.imageUrl}
          >
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </form>
        {selected && (
          <button
            className="danger"
            disabled={busy}
            onClick={async () => {
              if (
                !confirm(
                  "Mahsulotni katalogdan olib tashlaysizmi? Eski loyihalardagi model saqlanadi.",
                )
              )
                return;
              setBusy(true);
              try {
                await api("furniture/" + selected, { method: "DELETE" });
                const catalog = await api<{ products: FurnitureProduct[] }>(
                  "furniture",
                );
                onChange(catalog.products);
                edit("");
              } catch (cause) {
                setMessage((cause as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Katalogdan olib tashlash
          </button>
        )}
      </section>
    </div>
  );
}
