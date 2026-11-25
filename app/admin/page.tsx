"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";

type Order = {
  id: string; createdAt: string; name: string; phone: string; address: string;
  product: string; color: string; size: string; paymentMethod: string; notes: string;
};
type Product = {
  id: string; name: string; description: string; price: number | null;
  image_urls: string[]; sizes: string[]; colors: string[]; stock: number; is_active: boolean; category: string;
};

const WA = "201004151517";
const blank = { name: "", description: "", price: "", image: "", sizes: "S, M, L, XL", colors: "", stock: "0", category: "غير مصنف" };

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!products.some(product => (product.image_urls || []).length > 1)) return;
    const timer = window.setInterval(() => {
      setImageIndexes(current => {
        const next = { ...current };
        products.forEach(product => {
          const count = (product.image_urls || []).length;
          if (count > 1) next[product.id] = ((current[product.id] ?? 0) + 1) % count;
        });
        return next;
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [products]);

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", "x-owner-key": key, ...(init.headers || {}) },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error([data.error || "حدث خطأ. تأكد من إعداد قاعدة البيانات.", data.supabaseStatus ? `HTTP ${data.supabaseStatus}` : "", data.detail || ""].filter(Boolean).join(" — "));
    return data;
  }

  async function loadAll() {
    setLoading(true); setError("");
    try {
      const [o, p] = await Promise.all([api("/api/orders"), api("/api/products?admin=1")]);
      setOrders(o.orders || []);
      setProducts(p.products || []);
      setAuthenticated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل البيانات.");
    } finally { setLoading(false); }
  }

  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      let imageUrls = form.image.trim() ? [form.image.trim()] : (editingId ? editingImages : []);
      if (imageFiles.length) {
        const uploaded = await Promise.all(imageFiles.map(file => upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: key,
        })));
        imageUrls = uploaded.map(blob => blob.url);
      }
      await api("/api/products", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name, description: form.description, category: form.category, price: form.price.trim() === "" ? 0 : Number(form.price),
          image_urls: imageUrls,
          sizes: form.sizes.split(",").map(x => x.trim()).filter(Boolean),
          colors: form.colors.split(",").map(x => x.trim()).filter(Boolean),
          stock: Number(form.stock), is_active: true,
        }),
      });
      setForm(blank);
      setImageFiles([]);
      setImagePreviews([]);
      setEditingId(null);
      setEditingImages([]);
      const p = await api("/api/products?admin=1");
      setProducts(p.products || []);
    } catch (e) { setError(e instanceof Error ? e.message : "تعذرت إضافة المنتج."); }
    finally { setSaving(false); }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditingImages(product.image_urls || []);
    setImageFiles([]);
    setImagePreviews([]);
    setForm({ name: product.name || "", description: product.description || "", price: product.price && product.price > 0 ? String(product.price) : "", image: "", sizes: (product.sizes || []).join(", "), colors: (product.colors || []).join(", "), stock: String(product.stock ?? 0), category: product.category || "غير مصنف" });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingImages([]);
    setImageFiles([]);
    setImagePreviews([]);
    setForm(blank);
  }

  async function toggleProduct(product: Product) {
    try {
      await api("/api/products", { method: "PATCH", body: JSON.stringify({ id: product.id, is_active: !product.is_active }) });
      setProducts(old => old.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p));
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تحديث المنتج."); }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`حذف المنتج "${product.name}"؟`)) return;
    try {
      await api(`/api/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
      setProducts(old => old.filter(p => p.id !== product.id));
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر حذف المنتج."); }
  }

  function sendWhatsApp(order: Order) {
    const summary = `طلب جديد: ${order.id}
الاسم: ${order.name}
الهاتف: ${order.phone}
العنوان: ${order.address}
القطعة: ${order.product}
اللون: ${order.color}
المقاس: ${order.size}
طريقة الدفع: ${order.paymentMethod || "غير محددة"}
ملاحظات: ${order.notes || "-"}`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(summary)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF8F5] text-[#1E1E1E]">
      <header className="border-b border-[#e8dfd2] bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <a href="/" className="text-sm text-[#8b6b2a] underline">العودة إلى موقع الزوار</a>
          <strong className="text-xl tracking-widest">LEVEL · ADMIN</strong>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm tracking-widest text-[#9B741C]">PRIVATE DASHBOARD</p>
        <h1 className="mt-2 text-3xl font-bold">لوحة إدارة المتجر</h1>
        <p className="mt-3 text-[#71685E]">إدارة المنتجات ومتابعة طلبات العملاء من مكان واحد.</p>
        {!authenticated ? (
          <form onSubmit={e => { e.preventDefault(); void loadAll(); }} className="mt-8 max-w-lg rounded-2xl border border-[#e9e0d5] bg-white p-6 shadow-sm">
            <label className="block text-sm font-semibold">مفتاح دخول الإدارة
              <input type="password" required value={key} onChange={e => setKey(e.target.value)} className="mt-2 w-full rounded-xl border border-[#ded4c8] p-3" placeholder="أدخل مفتاح الإدارة" />
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="mt-5 w-full rounded-full bg-[#1E1E1E] px-5 py-3 text-white disabled:opacity-50">{loading ? "جارٍ التحقق…" : "دخول إلى لوحة الإدارة"}</button>
          </form>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              <button onClick={() => setTab("products")} className={`rounded-full px-6 py-3 ${tab === "products" ? "bg-[#1E1E1E] text-white" : "border bg-white"}`}>المنتجات ({products.length})</button>
              <button onClick={() => setTab("orders")} className={`rounded-full px-6 py-3 ${tab === "orders" ? "bg-[#1E1E1E] text-white" : "border bg-white"}`}>الطلبات ({orders.length})</button>
              <button onClick={() => void loadAll()} className="mr-auto rounded-full border border-[#B8860B] bg-white px-5 py-3">تحديث البيانات</button>
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {tab === "products" ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
                <form onSubmit={saveProduct} className="h-fit space-y-3 rounded-2xl border border-[#e9e0d5] bg-white p-5">
                  <h2 className="text-xl font-bold">{editingId ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
                  <label className="block text-sm">اسم المنتج<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label>
                  <label className="block text-sm">وصف المنتج<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-xl border p-3" rows={3} /></label>
                  <label className="block text-sm">التصنيف<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-xl border p-3"><option value="غير مصنف">غير مصنف</option><option value="فساتين">فساتين</option><option value="بلوزات">بلوزات</option><option value="بناطيل">بناطيل</option><option value="أطقم">أطقم</option><option value="تريكو وجواكت">تريكو وجواكت</option><option value="قمصان">قمصان</option></select></label>\n                  <label className="block text-sm">السعر بالجنيه (اختياري)<input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label>
                  <label className="block text-sm">صورة المنتج
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => {
                      const files = Array.from(e.target.files || []);
                      setImageFiles(files);
                      setImagePreviews(files.map(file => URL.createObjectURL(file)));
                      if (files.length) setForm({ ...form, image: "" });
                    }} className="mt-1 w-full rounded-xl border p-3" />
                  </label>
                  {imagePreviews.length > 0 && <div className="grid grid-cols-3 gap-2">{imagePreviews.map((src, index) => <img key={src} src={src} alt={`معاينة الصورة ${index + 1}`} className="h-28 w-full rounded-xl object-cover bg-[#F2ECE4]" />)}</div>}
                  <p className="text-xs text-[#71685E]">يمكن اختيار أكثر من صورة مرة واحدة — JPG أو PNG أو WebP، بحد أقصى 8 ميجابايت للصورة.</p>
                  <label className="block text-xs text-[#71685E]">أو رابط صورة موجود<input value={form.image} onChange={e => { setForm({ ...form, image: e.target.value }); if (e.target.value) { setImageFiles([]); setImagePreviews([]); } }} placeholder="https://..." className="mt-1 w-full rounded-xl border p-3 text-sm" /></label>
                  <label className="block text-sm">المقاسات (افصل بينها بفاصلة)<input value={form.sizes} onChange={e => setForm({ ...form, sizes: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label>
                  <label className="block text-sm">الألوان (افصل بينها بفاصلة)<input value={form.colors} onChange={e => setForm({ ...form, colors: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label>
                  <label className="block text-sm">المخزون<input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label>
                  <button disabled={saving} className="w-full rounded-full bg-[#1E1E1E] py-3 text-white disabled:opacity-50">{saving ? "جارٍ الحفظ…" : editingId ? "حفظ التعديلات" : "حفظ المنتج"}</button>
                  {editingId && <button type="button" onClick={cancelEdit} className="w-full rounded-full border py-3">إلغاء التعديل</button>}
                </form>
                <section className="space-y-3">
                  <h2 className="text-xl font-bold">كل المنتجات</h2>
                  {products.length === 0 && <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-[#71685E]">لا توجد منتجات مسجلة في قاعدة البيانات.</p>}
                  {products.map(p => <article key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4">
                    {p.image_urls?.length ? (
                      <div className="w-full min-w-0 max-w-[280px] shrink-0">
                        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain rounded-xl bg-[#F2ECE4] p-2" aria-label={`صور المنتج ${p.name}`}>
                          {p.image_urls.map((src, index) => (
                            <button key={`${p.id}-image-${index}`} type="button" onClick={() => setImageIndexes(old => ({ ...old, [p.id]: index }))} aria-label={`عرض الصورة ${index + 1}`} aria-pressed={(imageIndexes[p.id] ?? 0) === index} className={`h-24 w-20 shrink-0 snap-start overflow-hidden rounded-lg border-2 transition-all ${(imageIndexes[p.id] ?? 0) === index ? "border-[#B8860B] opacity-100" : "border-transparent opacity-65 hover:opacity-100"}`}>
                              <img src={src} alt={`${p.name} - الصورة ${index + 1}`} className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                        {p.image_urls.length > 1 && <p className="mt-1 text-center text-[11px] text-[#71685E]">اسحب الصور يمينًا ويسارًا · {(imageIndexes[p.id] ?? 0) + 1}/{p.image_urls.length}</p>}
                      </div>
                    ) : <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-xl bg-[#F2ECE4] text-xs">بدون صورة</div>}
                    <div className="min-w-0 flex-1"><h3 className="font-bold">{p.name}</h3><p className="mt-1 text-xs text-[#9B741C]">{p.category || "غير مصنف"}</p><p className="mt-1 text-sm text-[#71685E]">{Number(p.price || 0) > 0 ? `${Number(p.price).toLocaleString("ar-EG")} ج.م` : "السعر غير مُعرّف حاليًا"} · المخزون: {p.stock ?? 0}</p><p className="mt-1 text-xs text-[#71685E]">{p.is_active ? "ظاهر للزوار" : "مخفي"}</p></div>
                    <button onClick={() => startEdit(p)} className="rounded-full border border-[#B8860B] px-4 py-2 text-sm">تعديل</button>
                    <button onClick={() => void toggleProduct(p)} className="rounded-full border px-4 py-2 text-sm">{p.is_active ? "إخفاء" : "إظهار"}</button>
                    <button onClick={() => void deleteProduct(p)} className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-700">حذف</button>
                  </article>)}
                </section>
              </div>
            ) : (
              <section className="mt-6 space-y-4">
                <h2 className="text-2xl font-semibold">الطلبات الواردة · {orders.length}</h2>
                {orders.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-[#71685E]">لا توجد طلبات حتى الآن.</div> : orders.map(order => (
                  <article key={order.id} className="rounded-2xl border border-[#e9e0d5] bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">{order.name}</h3><span dir="ltr" className="text-sm text-[#9B741C]">{order.id}</span></div>
                    <p className="mt-3 text-sm leading-8">{order.product} · {order.color} · {order.size}<br />الهاتف: <span dir="ltr">{order.phone}</span><br />العنوان: {order.address}<br />طريقة الدفع: <strong>{order.paymentMethod || "غير محددة"}</strong><br />ملاحظات: {order.notes || "لا توجد"}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3"><span className="text-xs text-[#8b8176]">{order.createdAt ? new Date(order.createdAt).toLocaleString("ar-EG") : ""}</span><button onClick={() => sendWhatsApp(order)} className="rounded-full bg-[#1E1E1E] px-5 py-2 text-sm text-white">إرسال التفاصيل عبر واتساب</button></div>
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
