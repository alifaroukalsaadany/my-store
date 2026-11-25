"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Product = {
  id: string; name: string; description?: string; price?: number;
  image_urls?: string[]; sizes?: string[]; colors?: string[]; stock?: number;
};
type OrderResult = { id: string };
type CartItem = { id: string; name: string; image: string; price: number; color: string; size: string; quantity: number };

function makeOrderId() {
  return "LV" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageIndex, setImageIndex] = useState(0);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("نقدًا عند الاستلام");
  const [paymentSettings, setPaymentSettings] = useState({ instapayAccount: "", walletNumber: "" });
  const [customer, setCustomer] = useState({ name: "", phone: "", governorate: "", city: "", address: "", notes: "" });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [senderNumber, setSenderNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [cartMessage, setCartMessage] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/products", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("تعذر تحميل المنتج.");
        const data = await response.json();
        const found = (data.products || []).find((item: Product) => String(item.id) === String(productId));
        if (!found) throw new Error("المنتج غير موجود أو لم يعد متاحًا.");
        if (!active) return;
        setProduct(found);
        setColor(found.colors?.[0] || "غير محدد");
        setSize(found.sizes?.[0] || "غير محدد");
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل المنتج."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);

  useEffect(() => {
    fetch("/api/payment-settings", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data) setPaymentSettings({ instapayAccount: data.instapayAccount || "", walletNumber: data.walletNumber || "" }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const refreshCart = () => {
      try {
        const items = JSON.parse(localStorage.getItem("level-shopping-cart") || "[]");
        setCartCount(Array.isArray(items) ? items.reduce((sum: number, item: CartItem) => sum + (Number(item.quantity) || 0), 0) : 0);
      } catch { setCartCount(0); }
    };
    refreshCart();
    window.addEventListener("level-cart-updated", refreshCart);
    window.addEventListener("storage", refreshCart);
    return () => {
      window.removeEventListener("level-cart-updated", refreshCart);
      window.removeEventListener("storage", refreshCart);
    };
  }, []);

  const images = product?.image_urls?.filter(Boolean) || [];
  const price = Number(product?.price || 0);
  const total = useMemo(() => price > 0 ? price * quantity : 0, [price, quantity]);

  function addToCart() {
    if (!product) return;
    const key = "level-shopping-cart";
    let items: CartItem[] = [];
    try { items = JSON.parse(localStorage.getItem(key) || "[]"); } catch { items = []; }
    const existing = items.findIndex(item => item.id === product.id && item.color === color && item.size === size);
    if (existing >= 0) items[existing] = { ...items[existing], quantity: items[existing].quantity + quantity };
    else items.push({ id: String(product.id), name: product.name, image: images[0] || "", price, color, size, quantity });
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new Event("level-cart-updated"));
    setCartMessage("اتضاف المنتج للعربة بنجاح");
    window.setTimeout(() => setCartMessage(""), 2800);
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || !customer.name.trim() || !customer.phone.trim() || !customer.governorate.trim() || !customer.city.trim() || !customer.address.trim()) return;
    if (paymentMethod !== "نقدًا عند الاستلام" && (!senderNumber.trim() || !proofFile)) {
      setError("اكتب رقم التحويل وارفع صورة التحويل قبل تأكيد الطلب.");
      return;
    }
    setSaving(true);
    setError("");
    const id = makeOrderId();
    const notes = [`الكمية: ${quantity}`, customer.notes.trim()].filter(Boolean).join("\n");
    try {
      let proofImageUrl = "";
      if (proofFile && paymentMethod !== "نقدًا عند الاستلام") {
        const uploadForm = new FormData();
        uploadForm.append("file", proofFile);
        const uploadResponse = await fetch("/api/payment-proof-upload", { method: "POST", body: uploadForm });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || "تعذر رفع صورة التحويل.");
        proofImageUrl = uploadData.url;
      }
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id, name: customer.name.trim(), phone: customer.phone.trim(), governorate: customer.governorate, city: customer.city,
          senderNumber, proofImageUrl, totalAmount: total, address: customer.address.trim(),
          product: product.name, color, size, paymentMethod, notes,
        }),
      });
      if (!response.ok) throw new Error("تعذر تسجيل الطلب. حاولي مرة أخرى.");
      setOrder({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الطلب.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF8F5] text-[#1E1E1E]">
      <header className="border-b border-[#e8dfd2] bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <a href="/" className="text-2xl font-black tracking-[.16em]">LE<span className="text-[#B8860B]">V</span>EL</a>
          <div className="flex items-center gap-2"><a href="/cart" aria-label={`عربة التسوق، عدد القطع ${cartCount}`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8c7a9] bg-white text-[#1E1E1E]"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>{cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B8860B] px-1 text-[11px] font-bold text-white">{cartCount}</span>}</a><a href="/" className="rounded-full border border-[#d8c7a9] px-4 py-2 text-sm">العودة للمنتجات</a></div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {loading ? <p className="py-24 text-center text-[#71685E]">جارٍ تحميل تفاصيل المنتج…</p> :
        error && !product ? <div className="rounded-2xl bg-white p-8 text-center">{error}<a href="/" className="mt-5 inline-block underline">العودة للمتجر</a></div> :
        product && (order ? (
          <section className="mx-auto max-w-xl rounded-3xl border border-[#e9e0d5] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F2ECE4] text-2xl">✓</div>
            <h1 className="mt-5 text-2xl font-bold">تم تسجيل طلبك بنجاح</h1>
            <p className="mt-3 text-[#71685E]">رقم الطلب</p>
            <p dir="ltr" className="mt-1 text-xl font-bold text-[#9B741C]">{order.id}</p>
            <p className="mt-4 leading-8">{product.name} · {color} · {size}<br />الكمية: {quantity}</p>
            <a href="/" className="mt-7 inline-flex rounded-full bg-[#1E1E1E] px-7 py-3 text-white">العودة للمتجر</a>
          </section>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <div className="overflow-hidden rounded-3xl bg-[#F2ECE4]">
                {images.length ? <img src={images[imageIndex] || images[0]} alt={product.name} className="h-[440px] w-full object-contain md:h-[600px]" /> :
                  <div className="flex h-[440px] items-center justify-center text-4xl font-black tracking-widest text-[#9B8B78]">LEVEL</div>}
              </div>
              {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {images.map((src, index) => <button key={src + index} type="button" onClick={() => setImageIndex(index)} aria-label={`الصورة ${index + 1}`} className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${imageIndex === index ? "border-[#B8860B]" : "border-transparent"}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>)}
              </div>}
            </section>

            <section className="rounded-3xl border border-[#e9e0d5] bg-white p-6 shadow-sm md:p-8">
              <p className="text-xs tracking-[.22em] text-[#9B741C]">LEVEL WOMEN WEAR</p>
              <h1 className="mt-3 text-3xl font-bold">{product.name}</h1>
              <p className="mt-4 text-lg font-semibold text-[#8A8176]">{price > 0 ? `${price.toLocaleString("ar-EG")} ج.م` : "السعر غير مُعرّف حاليًا"}</p>
              {product.description && <p className="mt-5 whitespace-pre-wrap leading-8 text-[#71685E]">{product.description}</p>}

              <div className="mt-7 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-semibold">اللون
                    <select value={color} onChange={event => setColor(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ded4c8] bg-[#FAF8F5] p-3">
                      {(product.colors?.length ? product.colors : ["غير محدد"]).map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">المقاس
                    <select value={size} onChange={event => setSize(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ded4c8] bg-[#FAF8F5] p-3">
                      {(product.sizes?.length ? product.sizes : ["غير محدد"]).map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold">عدد القطع</p>
                  <div className="flex w-fit items-center overflow-hidden rounded-full border border-[#ded4c8]">
                    <button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))} className="h-11 w-12 text-xl" aria-label="تقليل الكمية">−</button>
                    <span className="min-w-12 text-center font-semibold" aria-live="polite">{quantity}</span>
                    <button type="button" onClick={() => setQuantity(value => Math.min(product.stock && product.stock > 0 ? product.stock : 99, value + 1))} className="h-11 w-12 text-xl" aria-label="زيادة الكمية">+</button>
                  </div>
                  {Number(product.stock || 0) > 0 && <p className="mt-2 text-xs text-[#82776b]">المتاح: {product.stock} قطعة</p>}
                </div>

                <button type="button" onClick={addToCart} className="w-full rounded-full border-2 border-[#1E1E1E] py-3 font-semibold transition hover:bg-[#F2ECE4]">أضف إلى عربة التسوق</button>
                {cartMessage && <div role="status" aria-live="polite" className="fixed left-1/2 top-20 z-[70] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#d9c9a8] bg-white px-4 py-3 text-sm text-[#1E1E1E] shadow-xl"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f2e8] text-lg text-[#287a36]">✓</span><span className="flex-1 font-semibold">{cartMessage}</span><a href="/cart" className="shrink-0 font-bold text-[#9B741C] underline">عرض العربة</a></div>}

                <button type="button" onClick={() => { setCheckoutOpen(true); setError(""); }} className="w-full rounded-full bg-[#1E1E1E] py-4 font-semibold text-white transition hover:bg-[#B8860B]">شراء الآن</button>
                {checkoutOpen && <form onSubmit={submitOrder} className="fixed inset-0 z-[80] overflow-y-auto bg-black/50 p-3 sm:p-6">
                  <div className="mx-auto my-4 max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
                    <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">إتمام الشراء</h2><button type="button" onClick={() => setCheckoutOpen(false)} aria-label="إغلاق" className="text-2xl">×</button></div>
                    <div className="mb-5 rounded-2xl bg-[#F2ECE4] p-4"><div className="flex justify-between"><span>المنتج</span><strong>{product.name}</strong></div><div className="mt-2 flex justify-between"><span>الكمية</span><strong>{quantity}</strong></div><div className="mt-2 flex justify-between text-lg"><span>إجمالي المبلغ</span><strong>{price > 0 ? `${total.toLocaleString("ar-EG")} ج.م` : "السعر غير مُعرّف حاليًا"}</strong></div></div>
                    <div className="border-t border-[#eee6dc] pt-4">
                  <h2 className="text-lg font-bold">بيانات التوصيل</h2>
                  <label className="mt-4 block text-sm">الاسم
                    <input required value={customer.name} onChange={event => setCustomer(old => ({ ...old, name: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#ded4c8] p-3" />
                  </label>
                  <label className="mt-3 block text-sm">رقم الهاتف / واتساب
                    <input required type="tel" value={customer.phone} onChange={event => setCustomer(old => ({ ...old, phone: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#ded4c8] p-3" />
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-3"><label className="block text-sm">المحافظة<input required value={customer.governorate} onChange={event => setCustomer(old => ({ ...old, governorate: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#ded4c8] p-3" placeholder="المحافظة" /></label><label className="block text-sm">المدينة<input required value={customer.city} onChange={event => setCustomer(old => ({ ...old, city: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#ded4c8] p-3" placeholder="المدينة" /></label></div>
                  <label className="mt-3 block text-sm">العنوان بالتفصيل
                    <textarea required value={customer.address} onChange={event => setCustomer(old => ({ ...old, address: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#ded4c8] p-3" rows={3} />
                  </label>
                  <label className="mt-3 block text-sm font-semibold">طريقة الدفع
                    <select required value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ded4c8] bg-[#FAF8F5] p-3">
                      <option value="نقدًا عند الاستلام">نقدًا عند الاستلام</option>
                      <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                      <option value="إنستا باي">إنستا باي</option>
                    </select>
                  </label>
                  {paymentMethod !== "نقدًا عند الاستلام" && <div className="space-y-3 rounded-xl border border-[#d9c9a8] bg-[#fffaf0] p-4 text-sm">
                    <p className="font-semibold">بيانات استلام التحويل</p>
                    <div className="flex items-center gap-2"><strong dir="ltr" className="min-w-0 flex-1 break-all text-base">{paymentMethod === "إنستا باي" ? paymentSettings.instapayAccount : paymentSettings.walletNumber}</strong><button type="button" onClick={() => void navigator.clipboard.writeText(paymentMethod === "إنستا باي" ? paymentSettings.instapayAccount : paymentSettings.walletNumber)} className="shrink-0 rounded-full border border-[#b99a60] px-4 py-2 font-semibold">نسخ</button></div>
                    <label className="block">رقم الهاتف / الحساب اللي حوّلت منه<input required value={senderNumber} onChange={event => setSenderNumber(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ded4c8] bg-white p-3" /></label>
                    <label className="block">أضف صورة التحويل<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setProofFile(event.target.files?.[0] || null)} className="mt-2 w-full rounded-xl border border-[#ded4c8] bg-white p-3" /><span className="mt-1 block text-xs text-[#71685E]">JPG أو PNG أو WebP، بحد أقصى 5 ميجابايت.</span></label>
                  </div>}
                  <label className="mt-3 block text-sm">ملاحظات إضافية
                    <textarea value={customer.notes} onChange={event => setCustomer(old => ({ ...old, notes: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#ded4c8] p-3" rows={2} />
                  </label>
                </div>

                <div className="rounded-2xl bg-[#F2ECE4] p-4">
                  <div className="flex justify-between text-sm"><span>الكمية</span><strong>{quantity}</strong></div>
                  <div className="mt-2 flex justify-between"><span>الإجمالي</span><strong>{price > 0 ? `${total.toLocaleString("ar-EG")} ج.م` : "السعر غير مُعرّف حاليًا"}</strong></div>
                </div>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <button disabled={saving || (Number(product.stock || 0) > 0 && quantity > Number(product.stock))} className="w-full rounded-full bg-[#1E1E1E] py-4 font-semibold text-white transition hover:bg-[#B8860B] disabled:opacity-50">
                  {saving ? "جارٍ تسجيل الطلب…" : "تأكيد الطلب"}
                </button>
                  </div>
                </form>}
              </div>
            </section>
          </div>
        ))}
      </div>
      <footer className="px-4 py-8 text-center text-sm text-[#887e72]">LEVEL WOMEN WEAR</footer>
    </main>
  );
}
