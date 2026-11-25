 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

type Lang = "ar" | "en";
type Product = { id: string; nameAr: string; nameEn: string; category: string; image: string; images: string[]; colors: string[]; sizes: string[]; price?: number; description?: string };
type Order = { id: string; createdAt: string; name: string; phone: string; address: string; product: string; color: string; size: string; notes: string };

const WA = "201004151517";
const ADDRESS = "حدائق حلوان - شارع توتنجي - بجوار بن الغرباوي";
const initialProducts: Product[] = [];

const copy = {
  ar: {
    tagline:"أناقة يومية بتفاصيل راقية", collection:"تسوقي المجموعة", all:"كل القطع", shirts:"قمصان وكاجوال", knit:"تريكو وجواكت", outfits:"أطقم خروج",
    preview:"وضع المعاينة", add:"إضافة قطعة جديدة", change:"تغيير الصورة", order:"اطلبي الآن مباشرة", unknown:"السعر غير مُعرّف حاليًا",
    location:"زورينا في المتجر", address:ADDRESS, whatsapp:"تواصلي عبر واتساب", benefitTitle:"تسوق أسهل… ووقتك أغلى",
    benefit:"اطلبي من مكانك بدل مشوار طويل من المناطق البعيدة، وسجّلي طلبك مباشرة دون انتظار الرد على رسائل السوشيال ميديا.",
    owner:"إشعارات الإدارة", ownerKey:"مفتاح الإدارة", load:"عرض الطلبات", close:"إغلاق", noOrders:"لا توجد طلبات حتى الآن.",
    formTitle:"إتمام الطلب", customer:"الاسم", phone:"رقم الهاتف / واتساب", area:"المنطقة وعنوان التوصيل", piece:"القطعة المختارة",
    color:"اللون", size:"المقاس", notes:"ملاحظات إضافية", submit:"تأكيد الطلب", cancel:"إلغاء", success:"تم تسجيل طلبك بنجاح",
    orderId:"رقم الطلب", summary:"ملخص الطلب", forward:"إرسال الملخص إلى واتساب", required:"يرجى استكمال البيانات المطلوبة.",
    newNameAr:"اسم القطعة بالعربية", newNameEn:"اسم القطعة بالإنجليزية", category:"التصنيف", save:"إضافة القطعة", shirtsOpt:"قمصان وكاجوال", knitOpt:"تريكو وجواكت", outfitsOpt:"أطقم خروج",
    adminHint:"أدخلي مفتاح الإدارة لعرض الطلبات المحفوظة.", empty:"اكتشفي قطعنا المختارة بعناية.", priceLine:"السعر غير مُعرّف حاليًا"
  },
  en: {
    tagline:"Everyday elegance, thoughtfully detailed", collection:"Shop the collection", all:"All pieces", shirts:"Shirts & Casual", knit:"Knitwear & Jackets", outfits:"Outfits",
    preview:"Preview Mode", add:"Add New Piece", change:"Change Photo", order:"Order Directly", unknown:"Price: Unknown",
    location:"Visit our boutique", address:ADDRESS, whatsapp:"Chat on WhatsApp", benefitTitle:"A simpler way to shop",
    benefit:"Order from wherever you are instead of travelling from distant areas. Submit your order directly without waiting for slow social-media replies.",
    owner:"Owner Orders", ownerKey:"Owner access key", load:"View orders", close:"Close", noOrders:"No orders yet.",
    formTitle:"Complete your order", customer:"Customer name", phone:"Phone / WhatsApp", area:"Area and delivery address", piece:"Selected piece",
    color:"Color", size:"Size", notes:"Additional notes", submit:"Confirm order", cancel:"Cancel", success:"Your order has been received",
    orderId:"Order ID", summary:"Order summary", forward:"Forward summary to WhatsApp", required:"Please complete the required fields.",
    newNameAr:"Piece name in Arabic", newNameEn:"Piece name in English", category:"Category", save:"Add piece", shirtsOpt:"Shirts & Casual", knitOpt:"Knitwear & Jackets", outfitsOpt:"Outfits",
    adminHint:"Enter the owner access key to view saved orders.", empty:"Discover our carefully selected pieces.", priceLine:"Price: Unknown"
  }
};

function makeId() {
  return "LV" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("ar");
  const [preview, setPreview] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [productsLoading, setProductsLoading] = useState(true);
  const [heroImage, setHeroImage] = useState("");
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [done, setDone] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerKey, setOwnerKey] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [form, setForm] = useState({ name:"", phone:"", address:"", color:"", size:"", notes:"" });
  const [newPiece, setNewPiece] = useState({ nameAr:"", nameEn:"", category:"shirts" });
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const touchStartX = useRef<number | null>(null);
  const t = copy[lang];
  const isAr = lang === "ar";

  const visibleProducts = useMemo(() => products.filter(p => filter === "all" || p.category === filter), [products, filter]);

  useEffect(() => {
    let active = true;
    fetch("/api/products", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Products unavailable");
        const data = await response.json();
        const mapped: Product[] = (data.products || []).map((p: any) => ({
          id: String(p.id), nameAr: p.name, nameEn: p.name, category: "all",
          image: Array.isArray(p.image_urls) && p.image_urls[0] ? p.image_urls[0] : "",
          images: Array.isArray(p.image_urls) ? p.image_urls.filter((url: any) => typeof url === "string" && url.length > 0) : [],
          colors: Array.isArray(p.colors) ? p.colors : [],
          sizes: Array.isArray(p.sizes) ? p.sizes : [],
          price: Number(p.price || 0), description: p.description || ""
        }));
        if (active) {
          setProducts(mapped);
          const heroImages = mapped.map(p => p.image).filter(Boolean);
          if (heroImages.length) setHeroImage(heroImages[Math.floor(Math.random() * heroImages.length)]);
        }
      })
      .catch(() => { if (active) setProducts([]); })
      .finally(() => { if (active) setProductsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!products.some(product => product.images.length > 1)) return;
    const timer = window.setInterval(() => {
      setImageIndexes(current => {
        const next = { ...current };
        for (const product of products) {
          if (product.images.length > 1) next[product.id] = ((current[product.id] || 0) + 1) % product.images.length;
        }
        return next;
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [products]);

  useEffect(() => {
    if (!selected || selected.images.length < 2) return;
    const timer = window.setInterval(() => {
      setSelectedImageIndex(index => (index + 1) % selected.images.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [selected]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? "rtl" : "ltr";
  }, [lang, isAr]);

  function uploadFor(id: string, file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setProducts(old => old.map(p => p.id === id ? { ...p, image:url, images:[url] } : p));
  }

  function openOrder(product: Product) {
    setSelectedImageIndex(0);
    setSelected(product);
    setForm({ name:"", phone:"", address:"", color:product.colors[0] || "غير محدد", size:product.sizes[0] || "غير محدد", notes:"" });
    setDone(null);
  }

  async function submitOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || !form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.color || !form.size) return;
    setBusy(true);
    const order: Order = {
      id: makeId(), createdAt: new Date().toISOString(), name:form.name.trim(), phone:form.phone.trim(),
      address:form.address.trim(), product:isAr ? selected.nameAr : selected.nameEn,
      color:form.color, size:form.size, notes:form.notes.trim()
    };
    try {
      const response = await fetch("/api/orders", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(order) });
      if (!response.ok) throw new Error("Could not save order");
      setDone(order);
      try {
        const AudioCtx = window.AudioContext;
        const ctx = new AudioCtx();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain); gain.connect(ctx.destination);
        oscillator.frequency.value = 660; gain.gain.value = 0.035;
        oscillator.start(); oscillator.stop(ctx.currentTime + 0.12);
        oscillator.onended = () => void ctx.close();
      } catch {}
    } catch {
      alert(isAr ? "تعذر حفظ الطلب. حاولي مرة أخرى." : "Could not save the order. Please try again.");
    } finally { setBusy(false); }
  }

  async function loadOrders() {
    setOwnerError("");
    try {
      const response = await fetch("/api/orders", { headers:{"x-owner-key":ownerKey} });
      if (!response.ok) throw new Error("Unauthorized or unavailable");
      const data = await response.json();
      setOrders(data.orders || []);
    } catch { setOwnerError(isAr ? "مفتاح غير صحيح أو تعذر تحميل الطلبات." : "Invalid key or unable to load orders."); }
  }

  function forwardWhatsApp(order: Order) {
    const summary = `${t.orderId}: ${order.id}\n${t.customer}: ${order.name}\n${t.phone}: ${order.phone}\n${t.area}: ${order.address}\n${t.piece}: ${order.product}\n${t.color}: ${order.color}\n${t.size}: ${order.size}\n${t.notes}: ${order.notes || "-"}`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(summary)}`, "_blank", "noopener,noreferrer");
  }

  function addProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = (e.currentTarget.elements.namedItem("newImage") as HTMLInputElement)?.files?.[0];
    const url = file ? URL.createObjectURL(file) : "";
    setProducts(old => [{ id:makeId(), nameAr:newPiece.nameAr || "قطعة جديدة", nameEn:newPiece.nameEn || "New piece", category:newPiece.category, image:url, images:url ? [url] : [], colors:["متعدد"], sizes:["S","M","L","XL"] }, ...old]);
    setAddOpen(false); setNewPiece({nameAr:"",nameEn:"",category:"shirts"});
  }

  const categoryOptions = [
    ["all",t.all]
  ];

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#1E1E1E]" dir={isAr ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-30 border-b border-[#e8dfd2] bg-[#FAF8F5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-8">
          <a href="#" className="text-2xl font-black tracking-[.16em]">LE<span className="text-[#B8860B]">V</span>EL</a>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={() => setLang(isAr ? "en" : "ar")} className="rounded-full border border-[#d8c7a9] px-4 py-2 text-sm font-semibold">{isAr ? "العربية | EN" : "EN | العربية"}</button>

          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 md:grid-cols-[1.05fr_.95fr] md:px-8 md:py-24">
          <div>
            <p className="mb-4 text-sm font-semibold tracking-[.24em] text-[#9B741C]">LEVEL WOMEN WEAR</p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-6xl">{isAr ? "اختاري إطلالتك… واتركي الباقي علينا" : "Find your look. We’ll take care of the rest."}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#71685E]">{t.tagline}</p>
            <a href="#collection" className="mt-8 inline-flex rounded-full bg-[#1E1E1E] px-7 py-3 text-white transition hover:bg-[#B8860B]">{t.collection}</a>
          </div>
          <div className="rounded-[2rem] bg-[#F2ECE4] p-3 shadow-sm">
            {heroImage ? <img src={heroImage} alt="Level Women Wear collection" className="h-[390px] w-full rounded-[1.5rem] object-cover md:h-[510px]" /> : <div className="flex h-[390px] items-center justify-center rounded-[1.5rem] bg-[#E9DFD2] text-3xl font-black tracking-[.2em] text-[#9B8B78] md:h-[510px]">LEVEL</div>}
          </div>
        </div>
      </section>

      <section id="collection" className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm tracking-[.2em] text-[#9B741C]">THE COLLECTION</p><h2 className="mt-2 text-3xl font-semibold">{t.collection}</h2></div>
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          {categoryOptions.map(([key,label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-5 py-2.5 text-sm ${filter===key ? "bg-[#1E1E1E] text-white" : "border border-[#e1d6c7] bg-white"}`}>{label}</button>)}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map(product => <article key={product.id} className="group overflow-hidden rounded-2xl border border-[#e9e0d5] bg-white shadow-[0_8px_30px_rgba(54,42,25,.04)]">
            <div className="relative bg-[#F2ECE4]">
              {product.images.length ? <div>
                <div className="relative h-[290px] w-full overflow-hidden touch-pan-y select-none" onTouchStart={event => { touchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => { const start = touchStartX.current; const end = event.changedTouches[0]?.clientX; touchStartX.current = null; if (start === null || end === undefined || Math.abs(end - start) < 40 || product.images.length < 2) return; setImageIndexes(old => ({ ...old, [product.id]: ((old[product.id] || 0) + (end < start ? 1 : -1) + product.images.length) % product.images.length })); }}>
                  <img src={product.images[imageIndexes[product.id] || 0]} alt={isAr ? product.nameAr : product.nameEn} className="h-full w-full object-cover transition-opacity duration-500" />
                  {product.images.length > 1 && <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">{(imageIndexes[product.id] || 0) + 1} / {product.images.length}</span>}
                </div>
                {product.images.length > 1 && <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 py-3" aria-label={isAr ? "صور المنتج" : "Product images"}>
                  {product.images.map((src, index) => <button key={src + index} type="button" onClick={() => setImageIndexes(old => ({ ...old, [product.id]: index }))} aria-label={isAr ? `الصورة ${index + 1}` : `Image ${index + 1}`} className={`h-16 w-14 shrink-0 snap-start overflow-hidden rounded-lg border-2 transition ${index === (imageIndexes[product.id] || 0) ? "border-[#B8860B]" : "border-transparent"}`}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>)}
                </div>}
              </div> : <div className="flex h-[330px] items-center justify-center bg-[#E9DFD2] text-3xl font-black tracking-[.2em] text-[#9B8B78]">LEVEL</div>}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold">{isAr ? product.nameAr : product.nameEn}</h3>
              <p className="mt-2 text-sm text-[#8A8176]">{product.price && product.price > 0 ? `${product.price.toLocaleString("ar-EG")} ج.م` : t.unknown}</p>
              <button onClick={() => openOrder(product)} className="mt-5 w-full rounded-full bg-[#1E1E1E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#B8860B]">{t.order}</button>
            </div>
          </article>)}
        </div>
        {productsLoading && <p className="py-16 text-center text-[#82776b]">جارٍ تحميل المنتجات…</p>}
        {!productsLoading && visibleProducts.length===0 && <p className="py-16 text-center text-[#82776b]">{t.empty}</p>}
      </section>

      <section className="bg-[#F2ECE4]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-2 md:px-8">
          <div><p className="text-sm tracking-[.2em] text-[#9B741C]">A BETTER WAY TO SHOP</p><h2 className="mt-3 text-3xl font-semibold">{t.benefitTitle}</h2><p className="mt-5 max-w-xl leading-8 text-[#655d54]">{t.benefit}</p></div>
          <div className="rounded-2xl bg-[#FAF8F5] p-7">
            <h3 className="text-xl font-semibold">{t.location}</h3><p className="mt-4 leading-8">{t.address}</p>
            <p className="mt-3 font-semibold" dir="ltr">01004151517</p>
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full bg-[#1E1E1E] px-6 py-3 text-white">{t.whatsapp}</a>
          </div>
        </div>
      </section>

      <footer className="px-4 py-8 text-center text-sm text-[#887e72]">LEVEL WOMEN WEAR · {ADDRESS}</footer>

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5" onMouseDown={e => {if(e.target===e.currentTarget){setSelected(null);setDone(null);}}}>
        <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-[#FAF8F5] p-6 sm:rounded-3xl">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">{done ? t.success : t.formTitle}</h2><button onClick={() => {setSelected(null);setDone(null);}} className="rounded-full p-2 text-xl">×</button></div>
          {!done && selected.images.length > 0 && <div className="relative mt-5 overflow-hidden rounded-2xl bg-[#F2ECE4]">
            <div className="relative h-[280px] w-full">
              {selected.images.map((src, index) => <img key={src + index} src={src} alt={selected.nameAr} className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${index === selectedImageIndex ? "opacity-100" : "opacity-0"}`} />)}
              {selected.images.length > 1 && <>
                <button type="button" aria-label="Previous image" onClick={() => setSelectedImageIndex(index => (index - 1 + selected.images.length) % selected.images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-xl text-white">‹</button>
                <button type="button" aria-label="Next image" onClick={() => setSelectedImageIndex(index => (index + 1) % selected.images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-xl text-white">›</button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">{selectedImageIndex + 1} / {selected.images.length}</span>
              </>}
            </div>
          </div>}
          {done ? <div className="mt-6">
            <p className="rounded-xl bg-[#F2ECE4] p-4">{t.orderId}: <b dir="ltr">{done.id}</b></p>
            <h3 className="mt-5 font-semibold">{t.summary}</h3><p className="mt-3 leading-8">{done.product}<br/>{t.customer}: {done.name}<br/>{t.phone}: {done.phone}<br/>{t.area}: {done.address}<br/>{t.color}: {done.color} · {t.size}: {done.size}<br/>{t.priceLine}</p>
            <button onClick={() => forwardWhatsApp(done)} className="mt-6 w-full rounded-full bg-[#1E1E1E] px-5 py-3 text-white">{t.forward}</button>
          </div> : <form onSubmit={submitOrder} className="mt-6 space-y-4">
            <p className="rounded-xl bg-[#F2ECE4] p-3">{isAr ? selected.nameAr : selected.nameEn} · {selected.price && selected.price > 0 ? `${selected.price.toLocaleString("ar-EG")} ج.م` : t.unknown}</p>
            <label className="block text-sm">{t.customer}<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full rounded-xl border border-[#ded4c8] bg-white p-3"/></label>
            <label className="block text-sm">{t.phone}<input required type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-1 w-full rounded-xl border border-[#ded4c8] bg-white p-3"/></label>
            <label className="block text-sm">{t.area}<textarea required value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="mt-1 w-full rounded-xl border border-[#ded4c8] bg-white p-3"/></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">{t.color}<select value={form.color} onChange={e=>setForm({...form,color:e.target.value})} className="mt-1 w-full rounded-xl border border-[#ded4c8] bg-white p-3">{(selected.colors.length ? selected.colors : ["غير محدد"]).map(c=><option key={c}>{c}</option>)}</select></label>
              <label className="block text-sm">{t.size}<select value={form.size} onChange={e=>setForm({...form,size:e.target.value})} className="mt-1 w-full rounded-xl border border-[#ded4c8] bg-white p-3">{(selected.sizes.length ? selected.sizes : ["غير محدد"]).map(s=><option key={s}>{s}</option>)}</select></label>
            </div>
            <label className="block text-sm">{t.notes}<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 w-full rounded-xl border border-[#ded4c8] bg-white p-3"/></label>
            <p className="text-sm text-[#82776b]">{t.unknown}</p>
            <div className="flex gap-3"><button type="button" onClick={()=>setSelected(null)} className="flex-1 rounded-full border border-[#d7cbbb] py-3">{t.cancel}</button><button disabled={busy} className="flex-1 rounded-full bg-[#1E1E1E] py-3 text-white disabled:opacity-50">{busy ? "…" : t.submit}</button></div>
          </form>}
        </section>
      </div>}

    </main>
  );
}