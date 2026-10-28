import { useState, Suspense, lazy } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Plus, Minus, Trash2, ShoppingCart, Wallet, Package,
  CheckCircle2, AlertTriangle, History, X, Box,
} from 'lucide-react';
import { SHOP_ITEMS, SHOP_CATEGORIES } from '@/data/products';
import type { OrderItem } from '@/types';

// three.js katta — mashina kartochkalari ochilgandagina yuklansin
const CarScene = lazy(() =>
  import('@/components/three/CarScene').then((m) => ({ default: m.CarScene }))
);

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#102943] to-[#0A1D33]">
        <Package className="w-8 h-8 text-[#6B7C93]" />
        <span className="text-xs text-[#6B7C93] px-3 text-center">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
}

export function ShopPage() {
  const { language, balance, placeOrder, orders } = useAppStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Hammasi');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const filteredItems = SHOP_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) &&
      (category === 'Hammasi' || item.category === category)
  );

  const addToCart = (id: string) => {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item) return;
    setCart((prev) => {
      const next = (prev[id] || 0) + 1;
      if (next > item.stock) return prev;
      return { ...prev, [id]: next };
    });
    setShowCart(true);
    setMessage(null);
  };

  const changeQty = (id: string, delta: number) => {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item) return;
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      if (next > item.stock) return prev;
      return { ...prev, [id]: next };
    });
  };

  const removeFromCart = (id: string) =>
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

  const cartItems: { item: (typeof SHOP_ITEMS)[number]; qty: number }[] = Object.entries(cart)
    .map(([id, qty]) => {
      const item = SHOP_ITEMS.find((i) => i.id === id);
      return item ? { item, qty } : null;
    })
    .filter(Boolean) as { item: (typeof SHOP_ITEMS)[number]; qty: number }[];

  const total = cartItems.reduce((sum, { item, qty }) => sum + item.price * qty, 0);
  const insufficient = total > balance;

  const checkout = () => {
    if (cartItems.length === 0) {
      setMessage({ type: 'error', text: t(language, 'cartEmpty') });
      return;
    }
    const orderItems: OrderItem[] = cartItems.map(({ item, qty }) => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      unit: item.unit,
      qty,
    }));
    const res = placeOrder(orderItems);
    setMessage({ type: res.ok ? 'ok' : 'error', text: res.message });
    if (res.ok) {
      setCart({});
      setShowCart(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F8FF]">{t(language, 'shop')}</h1>
            <p className="text-[#9EB7D3] text-sm">{t(language, 'shopDesc')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className="flex items-center gap-2 bg-[#102943] border border-[#1677FF]/40 rounded-lg px-3 py-2"
              title={t(language, 'demoFunds')}
            >
              <Wallet className="w-4 h-4 text-[#29B6FF]" />
              <span className="text-sm font-semibold text-[#F5F8FF] tabular-nums">{balance.toLocaleString()} so'm</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowOrders((v) => !v)}>
              <History className="w-4 h-4 mr-2" /> {t(language, 'orderHistory')}
            </Button>
            <Button size="sm" onClick={() => setShowCart(true)}>
              <ShoppingCart className="w-4 h-4 mr-2" /> {t(language, 'cart')} ({cartItems.length})
            </Button>
          </div>
        </div>

        <p className="text-xs text-[#6B7C93] mb-4">{t(language, 'demoFunds')}</p>

        {/* message banner */}
        {message && (
          <div
            className={`mb-5 flex items-start gap-3 p-4 rounded-xl border text-sm ${
              message.type === 'ok'
                ? 'bg-[#22C99A]/10 border-[#22C99A]/40 text-[#8FF3D6]'
                : 'bg-red-500/10 border-red-500/40 text-red-300'
            }`}
          >
            {message.type === 'ok' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage(null)} aria-label={t(language, 'close')} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* orders history */}
        {showOrders && (
          <Card className="mb-5 p-5">
            <h2 className="font-semibold text-[#F5F8FF] mb-3">{t(language, 'orderHistory')}</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-[#6B7C93]">{t(language, 'noOrders')}</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="p-3 rounded-lg bg-[#0A1D33] border border-[#174D78]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-[#6B7C93]">{new Date(order.createdAt).toLocaleString()}</span>
                      <span className="text-sm font-bold text-[#29B6FF]">{order.total.toLocaleString()} so'm</span>
                    </div>
                    <p className="text-xs text-[#9EB7D3]">
                      {order.items.map((it) => `${it.name} × ${it.qty}`).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* search + categories */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(language, 'search')}
            aria-label={t(language, 'search')}
            className="md:w-72 bg-[#102943] border border-[#174D78] rounded-lg text-[#F5F8FF] text-sm px-3 py-2.5 focus:outline-none focus:border-[#1677FF]"
          />
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {SHOP_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  category === cat
                    ? 'bg-[#1677FF] text-white'
                    : 'bg-[#102943] text-[#9EB7D3] border border-[#174D78] hover:text-[#F5F8FF] hover:border-[#1677FF]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* products */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {filteredItems.map((item) => (
            <Card key={item.id} hoverable padded={false} className="group p-0 overflow-hidden">
              <div className="relative h-40 bg-[#0A1D33] overflow-hidden">
                {item.carBody ? (
                  <div className="w-full h-full">
                    <Suspense
                      fallback={
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                          <Box className="w-6 h-6 text-[#6B7C93] animate-pulse" />
                          <span className="text-xs text-[#6B7C93]">3D model yuklanmoqda…</span>
                        </div>
                      }
                    >
                      <CarScene body={item.carBody} color={item.carColor || '#C9CFD8'} />
                    </Suspense>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-[#6B7C93] pointer-events-none">
                      3D — sichqoncha bilan aylantiring
                    </span>
                  </div>
                ) : (
                  <ProductImage src={item.image} alt={item.name} />
                )}
                <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#061426]/80 text-[#29B6FF] border border-[#1677FF]/40">
                  {item.category}
                </span>
                <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22C99A]/15 text-[#8FF3D6] border border-[#22C99A]/40">
                  {item.stock} {item.unit}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[#F5F8FF] text-sm leading-snug">{item.name}</h3>
                <p className="text-xs text-[#6B7C93] mt-1 mb-3">{item.desc}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-[#29B6FF]">{item.price.toLocaleString()} so'm</span>
                  <span className="text-xs text-[#6B7C93]">/ {item.unit}</span>
                </div>

                {cart[item.id] ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQty(item.id, -1)}
                      aria-label="-"
                      className="w-9 h-9 rounded-lg border border-[#174D78] bg-[#0A1D33] text-[#9EB7D3] hover:text-[#F5F8FF] hover:border-[#1677FF] flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="flex-1 text-center font-semibold text-[#F5F8FF]">{cart[item.id]}</span>
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      aria-label="+"
                      className="w-9 h-9 rounded-lg border border-[#174D78] bg-[#0A1D33] text-[#9EB7D3] hover:text-[#F5F8FF] hover:border-[#1677FF] flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      aria-label={t(language, 'delete')}
                      className="w-9 h-9 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Button className="w-full" size="sm" onClick={() => addToCart(item.id)}>
                    <Plus className="w-4 h-4 mr-2" /> {t(language, 'addToCart')}
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {filteredItems.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col items-center py-16 text-center">
              <Package className="w-12 h-12 text-[#6B7C93] mb-3" />
              <p className="text-[#9EB7D3]">{t(language, 'noResults')}</p>
            </div>
          )}
        </div>
      </div>

      {/* cart drawer */}
      {showCart && (
        <div
          className="fixed inset-0 bg-black/50 z-[65]"
          onClick={() => setShowCart(false)}
          aria-hidden="true"
        />
      )}
      <aside
        aria-hidden={!showCart}
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-[90vw] z-[70] bg-[#0A1D33] border-l border-[#174D78] shadow-2xl flex flex-col transition-transform duration-300 ${
          showCart ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-[#174D78] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#F5F8FF]">{t(language, 'cart')}</h2>
            <p className="text-xs text-[#6B7C93]">{cartItems.length} ta mahsulot</p>
          </div>
          <button
            onClick={() => setShowCart(false)}
            aria-label={t(language, 'close')}
            className="p-2 rounded-lg text-[#9EB7D3] hover:text-[#F5F8FF] hover:bg-[#102943]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cartItems.length === 0 && (
            <p className="text-sm text-[#6B7C93] text-center py-8">{t(language, 'cartEmpty')}</p>
          )}
          {cartItems.map(({ item, qty }) => (
            <div key={item.id} className="p-3 bg-[#102943] rounded-lg border border-[#174D78]">
              <div className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-[#F5F8FF] truncate">{item.name}</h4>
                  <p className="text-xs text-[#9EB7D3]">
                    {item.price.toLocaleString()} so'm × {qty} {item.unit}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  aria-label={t(language, 'delete')}
                  className="text-[#6B7C93] hover:text-red-400 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => changeQty(item.id, -1)}
                  aria-label="-"
                  className="w-7 h-7 rounded border border-[#174D78] text-[#9EB7D3] hover:text-[#F5F8FF] flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-semibold text-[#F5F8FF] w-6 text-center">{qty}</span>
                <button
                  onClick={() => changeQty(item.id, 1)}
                  aria-label="+"
                  className="w-7 h-7 rounded border border-[#174D78] text-[#9EB7D3] hover:text-[#F5F8FF] flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-[#174D78] bg-[#061426]">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[#9EB7D3]">{t(language, 'balance')}</span>
            <span className="text-[#F5F8FF] tabular-nums">{balance.toLocaleString()} so'm</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-[#F5F8FF] font-bold">{t(language, 'total')}</span>
            <span className={`font-bold text-lg tabular-nums ${insufficient ? 'text-red-400' : 'text-[#29B6FF]'}`}>
              {total.toLocaleString()} so'm
            </span>
          </div>
          {insufficient && (
            <p className="text-xs text-red-400 mb-2">
              {t(language, 'insufficientBalance')}: {(total - balance).toLocaleString()} so'm yetishmayapti
            </p>
          )}
          <Button className="w-full" onClick={checkout}>
            {t(language, 'checkout')}
          </Button>
          <p className="text-[11px] text-[#6B7C93] mt-3 text-center">{t(language, 'demoFunds')}</p>
        </div>
      </aside>
    </div>
  );
}
