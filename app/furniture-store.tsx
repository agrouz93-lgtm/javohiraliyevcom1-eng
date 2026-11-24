"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Heart,
  Search,
  ShoppingBag,
  X,
  Plus,
  Settings,
} from "lucide-react";
import { api, fmt, type Entry, type Plan, type RecordRow } from "./shared";
import {
  furnitureCatalog,
  placeFurniture,
  validCatalogProduct,
  type FurnitureProduct,
} from "./furniture-core.mjs";
import { roomTypes, validPlan } from "./domain.mjs";
import { floorOf } from "./house-model.mjs";
import FurnitureAdmin from "./furniture-admin";
const Showroom = dynamic(() => import("./furniture-showroom"), {
  ssr: false,
  loading: () => <p>3D salon yuklanmoqda…</p>,
});
type Props = {
  records: RecordRow[];
  owner: string;
  onPlace: (entry: Entry) => void;
  onCreate: () => void;
};
export function FurnitureStore({ records, owner, onPlace, onCreate }: Props) {
  const favoritesKey = "usta-furniture-favorites:" + owner,
    chosenKey = "usta-furniture-chosen:" + owner;
  const [products, setProducts] = useState<FurnitureProduct[]>(
    furnitureCatalog.products,
  );
  const [mode, setMode] = useState<"catalog" | "salon">("catalog");
  const [category, setCategory] = useState("all"),
    [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]),
    [chosen, setChosen] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false),
    [chosenOnly, setChosenOnly] = useState(false);
  const [detail, setDetail] = useState<FurnitureProduct>(),
    [placing, setPlacing] = useState<FurnitureProduct>();
  const [admin, setAdmin] = useState(false),
    [adminOpen, setAdminOpen] = useState(false),
    [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(""),
    [color, setColor] = useState("");
  useEffect(() => {
    let active = true;
    try {
      const stored = JSON.parse(
        localStorage.getItem(favoritesKey) ??
          (owner === "offline"
            ? localStorage.getItem("usta-furniture-favorites")
            : null) ??
          "[]",
      );
      if (Array.isArray(stored))
        setFavorites(stored.filter((id) => typeof id === "string"));
      const selection = JSON.parse(
        localStorage.getItem(chosenKey) ??
          (owner === "offline"
            ? localStorage.getItem("usta-furniture-chosen")
            : null) ??
          "[]",
      );
      if (Array.isArray(selection))
        setChosen(selection.filter((id) => typeof id === "string"));
      const cached = JSON.parse(
        localStorage.getItem("usta-furniture-catalog") ?? "null",
      );
      if (cached?.products && Array.isArray(cached.products))
        setProducts(cached.products.filter(validCatalogProduct));
    } catch {}
    api<{ products: FurnitureProduct[] }>("furniture")
      .then((value) => {
        if (active) {
          setProducts(value.products.filter(validCatalogProduct));
          localStorage.setItem("usta-furniture-catalog", JSON.stringify(value));
        }
      })
      .catch(() => {});
    api<{ admin: boolean }>("furniture/access")
      .then((value) => {
        if (active) setAdmin(value.admin);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [owner, favoritesKey, chosenKey]);
  function choose(id: string) {
    const next = chosen.includes(id)
      ? chosen.filter((value) => value !== id)
      : [...chosen, id];
    setChosen(next);
    try {
      localStorage.setItem(chosenKey, JSON.stringify(next));
    } catch {
      setNotice("Tanlanganlarni saqlab bo‘lmadi.");
    }
  }
  function favorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((value) => value !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(next));
    } catch {
      setNotice("Sevimlilarni qurilmada saqlab bo‘lmadi.");
    }
  }
  const visible = products.filter(
    (product) =>
      product.available &&
      (category === "all" || product.category === category) &&
      product.name
        .toLocaleLowerCase("uz")
        .includes(search.toLocaleLowerCase("uz")) &&
      (!favoritesOnly || favorites.includes(product.id)) &&
      (!chosenOnly || chosen.includes(product.id)),
  );
  const current = products.find((product) => product.id === selected);
  function openDetails(product: FurnitureProduct) {
    setDetail(product);
    setColor(product.colors[0]);
  }
  return (
    <div className="furniture-store">
      <header className="furniture-heading">
        <div>
          <span className="furniture-eyebrow">USTA PRO · INTERYER</span>
          <h1>Mebel do‘koni</h1>
          <p>Uyingiz uchun zamonaviy va sifatli mebellar</p>
        </div>
        <div className="furniture-mode">
          <button
            aria-pressed={mode === "catalog"}
            onClick={() => setMode("catalog")}
          >
            Katalog
          </button>
          <button
            aria-pressed={mode === "salon"}
            onClick={() => setMode("salon")}
          >
            3D salon
          </button>
        </div>
      </header>
      <div className="furniture-searchbar">
        <label>
          <Search size={19} />
          <input
            aria-label="Mebel qidirish"
            placeholder="Mebel qidirish…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button
          aria-pressed={favoritesOnly}
          aria-label="Sevimlilar"
          onClick={() => setFavoritesOnly(!favoritesOnly)}
        >
          <Heart size={18} />
          <span>
            {favorites.filter((id) => products.some((p) => p.id === id)).length}
          </span>
        </button>
        <button
          aria-pressed={chosenOnly}
          aria-label="Tanlangan mebellar"
          onClick={() => setChosenOnly(!chosenOnly)}
        >
          <ShoppingBag size={18} />
          <span>{chosen.length}</span>
        </button>
        {admin && (
          <button onClick={() => setAdminOpen(true)}>
            <Settings size={18} />
            <span>Katalogni boshqarish</span>
          </button>
        )}
      </div>
      <nav className="furniture-categories" aria-label="Mebel kategoriyalari">
        <button
          aria-pressed={category === "all"}
          onClick={() => setCategory("all")}
        >
          Barchasi
        </button>
        {furnitureCatalog.categories.map((item) => (
          <button
            key={item.id}
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {item.name}
          </button>
        ))}
      </nav>
      {notice && (
        <p role="status" className="furniture-notice">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Xabarni yopish">
            <X size={15} />
          </button>
        </p>
      )}
      {mode === "catalog" ? (
        <div className="furniture-grid">
          {!visible.length && (
            <p className="furniture-empty">Mos mebel topilmadi.</p>
          )}
          {visible.map((product) => (
            <article className="furniture-card" key={product.id}>
              <div className="furniture-card-image">
                <button
                  className="favorite-button"
                  aria-label={product.name + " sevimlilarga"}
                  aria-pressed={favorites.includes(product.id)}
                  onClick={() => favorite(product.id)}
                >
                  <Heart
                    size={17}
                    fill={
                      favorites.includes(product.id) ? "currentColor" : "none"
                    }
                  />
                </button>
                <img src={product.imageUrl} alt={product.name} loading="lazy" />
                <span>3D model</span>
              </div>
              <div className="furniture-card-copy">
                <small>
                  {
                    furnitureCatalog.categories.find(
                      (category) => category.id === product.category,
                    )?.name
                  }
                </small>
                <h2>{product.name}</h2>
                <p>
                  {fmt(product.dimensions.width)} ×{" "}
                  {fmt(product.dimensions.depth)} ×{" "}
                  {fmt(product.dimensions.height)} m
                </p>
                <p>{product.material}</p>
                <div className="furniture-colors">
                  {product.colors.map((value) => (
                    <i
                      key={value}
                      style={{ background: value }}
                      title={value}
                    />
                  ))}
                </div>
                <strong className="furniture-price">
                  {product.price === null
                    ? "Narx ko‘rsatilmagan"
                    : fmt(product.price) + " so‘m"}
                </strong>
                <div className="furniture-card-tools">
                  <button onClick={() => openDetails(product)}>
                    Batafsil / 3D
                  </button>
                  <button
                    aria-label={product.name + " ni tanlash"}
                    aria-pressed={chosen.includes(product.id)}
                    onClick={() => choose(product.id)}
                  >
                    <ShoppingBag size={15} />
                  </button>
                </div>
                <button
                  className="furniture-add"
                  onClick={() => setPlacing(product)}
                >
                  <Plus size={16} /> Loyihaga qo‘shish
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="salon-layout">
          <Showroom
            products={visible}
            selected={selected}
            color={color}
            onSelect={(product) => {
              setSelected(product.id);
              setColor(product.colors[0]);
            }}
          />
          {current && (
            <section className="salon-selection">
              <h2>{current.name}</h2>
              <p>
                {Object.values(current.dimensions)
                  .map((value) => fmt(value))
                  .join(" × ")}{" "}
                m
              </p>
              <p>{current.material}</p>
              <p>
                {current.price === null
                  ? "Narx ko‘rsatilmagan"
                  : fmt(current.price) + " so‘m"}
              </p>
              <div className="furniture-colors">
                {current.colors.map((value) => (
                  <button
                    key={value}
                    style={{ background: value }}
                    aria-label={"Rang " + value}
                    onClick={() => setColor(value)}
                  />
                ))}
              </div>
              <button onClick={() => openDetails(current)}>
                <Box size={17} /> Alohida 3D ko‘rish
              </button>
              <button
                className="furniture-add"
                onClick={() => setPlacing(current)}
              >
                Loyihaga qo‘shish
              </button>
            </section>
          )}
        </div>
      )}
      {products.some((product) => chosen.includes(product.id)) && (
        <section className="furniture-selected-list">
          <h2>Tanlangan mebellar</h2>
          {products
            .filter((product) => chosen.includes(product.id))
            .map((product) => (
              <div className="furniture-selected-row" key={product.id}>
                <img src={product.imageUrl} alt="" />
                <div>
                  <strong>{product.name}</strong>
                  <small>
                    {product.price === null
                      ? "Narx ko‘rsatilmagan"
                      : fmt(product.price) + " so‘m"}
                  </small>
                </div>
                <button onClick={() => openDetails(product)}>3D</button>
                <button onClick={() => setPlacing(product)}>Qo‘shish</button>
                <button
                  aria-label={product.name + " tanlovdan olib tashlash"}
                  onClick={() => choose(product.id)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
        </section>
      )}
      {detail && (
        <div className="furniture-modal-backdrop">
          <section
            className="furniture-dialog"
            role="dialog"
            aria-label={detail.name}
          >
            <button
              className="close"
              onClick={() => setDetail(undefined)}
              aria-label="Yopish"
            >
              <X size={20} />
            </button>
            <h2>{detail.name}</h2>
            <Showroom
              solo
              products={[detail]}
              color={color}
              onSelect={() => {}}
            />
            <p>{detail.description}</p>
            <p>
              {fmt(detail.dimensions.width)} × {fmt(detail.dimensions.depth)} ×{" "}
              {fmt(detail.dimensions.height)} m · {detail.material}
            </p>
            <div className="furniture-colors">
              {detail.colors.map((value) => (
                <button
                  key={value}
                  aria-label={"Rang " + value}
                  aria-pressed={color === value}
                  style={{ background: value }}
                  onClick={() => setColor(value)}
                />
              ))}
            </div>
            <strong>
              {detail.price === null
                ? "Narx ko‘rsatilmagan"
                : fmt(detail.price) + " so‘m"}
            </strong>
            <button
              className="furniture-add"
              onClick={() =>
                setPlacing({
                  ...detail,
                  colors: [
                    color,
                    ...detail.colors.filter((value) => value !== color),
                  ],
                })
              }
            >
              Loyihaga qo‘shish
            </button>
          </section>
        </div>
      )}
      {placing && (
        <Placement
          product={placing}
          records={records}
          owner={owner}
          onClose={() => setPlacing(undefined)}
          onCreate={onCreate}
          onPlace={onPlace}
        />
      )}
      {adminOpen && (
        <FurnitureAdmin
          products={products}
          onClose={() => setAdminOpen(false)}
          onChange={(next) => {
            setProducts(next);
            localStorage.setItem(
              "usta-furniture-catalog",
              JSON.stringify({ products: next }),
            );
          }}
        />
      )}
    </div>
  );
}
function Placement({
  product,
  records,
  owner,
  onClose,
  onPlace,
  onCreate,
}: Props & { product: FurnitureProduct; onClose: () => void }) {
  const [choice, setChoice] = useState("draft"),
    [roomId, setRoomId] = useState(""),
    [floor, setFloor] = useState(0),
    [error, setError] = useState("");
  const entries = records.filter(
    (row) => row.data.kind === "plan" && validPlan(row.data.payload.plan),
  );
  const [draft] = useState<Plan | undefined>(() => {
    try {
      const candidate = JSON.parse(
        localStorage.getItem("usta-planner-draft:" + owner) ?? "null",
      );
      return validPlan(candidate) ? candidate : undefined;
    } catch {
      return undefined;
    }
  });
  const selected = entries.find((row) => row.data.id === choice)?.data;
  let plan = selected?.payload.plan as Plan | undefined;
  if (selected)
    try {
      const current = JSON.parse(
        localStorage.getItem(
          "usta-planner-draft:" + owner + ":" + selected.id,
        ) ?? "null",
      );
      if (validPlan(current)) plan = current;
    } catch {}
  if (choice === "draft") plan = draft;
  const rooms =
    plan?.elements.filter(
      (element) =>
        roomTypes.includes(element.type) && floorOf(element) === floor,
    ) ?? [];
  return (
    <div className="furniture-modal-backdrop placement-backdrop">
      <section
        className="furniture-dialog placement-dialog"
        role="dialog"
        aria-label="Loyihaga mebel qo‘shish"
      >
        <button
          className="close"
          onClick={onClose}
          aria-label="Joylashtirishni yopish"
        >
          <X size={20} />
        </button>
        <h2>{product.name}</h2>
        <label>
          Loyiha
          <select
            value={choice}
            onChange={(event) => {
              setChoice(event.target.value);
              setRoomId("");
              setFloor(0);
            }}
          >
            {draft && <option value="draft">Joriy qoralama</option>}
            {!draft && <option value="draft">Loyiha tanlang</option>}
            {entries.map(({ data }) => (
              <option key={data.id} value={data.id}>
                {data.title}
              </option>
            ))}
          </select>
        </label>
        {plan && (
          <>
            <label>
              Qavat
              <select
                value={floor}
                onChange={(event) => {
                  setFloor(Number(event.target.value));
                  setRoomId("");
                }}
              >
                {Array.from({ length: plan.floors ?? 1 }, (_, index) => (
                  <option key={index} value={index}>
                    {index + 1}-qavat
                  </option>
                ))}
              </select>
            </label>
            <label>
              Xona
              <select
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
              >
                <option value="">
                  {rooms.length ? "Xonani tanlang" : "Xona hali chizilmagan"}
                </option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.type} · {fmt(room.w)} × {fmt(room.d)} m ·{" "}
                    {room.id.slice(0, 4)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {!plan && (
          <p>
            Avval uy rejasini yarating yoki hisobingizdagi loyihani tanlang.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <button
          className="furniture-add"
          disabled={!plan || !roomId}
          onClick={() => {
            try {
              if (!plan) return;
              const next = placeFurniture(plan, product, roomId, floor);
              const added = next.elements.at(-1)!;
              onPlace({
                id: selected?.id ?? "draft",
                kind: "plan",
                title: selected?.title ?? "Uy rejasi",
                rows: selected?.rows ?? [],
                payload: {
                  plan: next,
                  selectedFurniture: added.id,
                  beforeFurniturePlan: plan,
                },
              });
            } catch (cause) {
              setError((cause as Error).message);
            }
          }}
        >
          3D uyga joylashtirish
        </button>
        <button onClick={onCreate}>Yangi uy rejasi yaratish</button>
      </section>
    </div>
  );
}
