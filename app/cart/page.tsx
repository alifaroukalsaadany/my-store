"use client";

import { useEffect, useMemo, useState } from "react";

type CartItem = { id: string; name: string; image: string; price: number; color: string; size: string; quantity: number };
const CART_KEY = "level-shopping-cart";
function orderId() { return "LV" + Math.random().toString(36).slice(2, 8).toUpperCase(); }

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [paymentMethod, setPaymentMethod] = useState("نقدًا عند الاستلام");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string[]>([]);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(CART_KEY) || "[]")); } catch { setItems([]); }
  }, []);

  function save(next: CartItem[]) {
    setItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("level-cart-updated"));
  }

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = useMemo(() => items.reduce((sum, item) => sum + (item.price > 0 ? item.price * item.quantity : 0), 0), [items]);
  const hasUnknownPrice = items.some(item => !(item.price > 0));

  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length || !customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) return;
    setBusy(true); setError(""); setSuccess([]);
    const completed: string[] = [];
    try {
      for (const item of items) {
        const id = orderId();
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id, name: customer.name.trim(), phone: customer.phone.trim(), address: customer.address.trim(),
            product: item.name, color: item.color, size: item.size, paymentMethod,
            notes: `الكمية: ${item.quantity}${item.price > 0 ? ` · سعر القطعة: ${item.price} ج.م · إجمالي الصنف: ${item.price * item.quantity} ج.م` : " · السعر غير مُعرّف حاليًا"}`,
          }),
        });
        if (!response.ok) throw new Error("تعذر تسجيل كل الطلبات. احتفظنا بمحتويات العربة؛ راجع الإدارة قبل إعادة المحاولة لتجنب تكرار طلب تم تسجيله.");
        completed.push(id);
      }
      setSuccess(completed);
      save([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تأكيد الطلب.");
    } finally { setBusy(false); }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF8F5] text-[#1E1E1E]">
      <header className="border-b border-[#e8dfd2] bg-white/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <a href="/" className="text-2xl font-black tracking-[.16em]">LE<span className="text-[#B8860B]">V</span>EL</a>
          <a href="/" className="rounded-full border border-[#d8c7a9] px-4 py-2 text-sm">مواصلة التسوق</a>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-9">
        <h1 className="text-3xl font-bold">عربة التسوق</h1>
        {success.length > 0 ? (
          <section className="mt-7 rounded-3xl border border-[#e9e0d5] bg-white p-8 text-center">
            <div className="text-3xl">✓</div><h2 className="mt-3 text-2xl font-bold">تم تسجيل طلباتك بنجاح</h2>
            <p className="mt-3 text-[#71685E]">أرقام الطلبات: {success.join(" · ")}</p>
            <a href="/" className="mt-6 inline-flex rounded-full bg-[#1E1E1E] px-7 py-3 text-white">العودة للمتجر</a>
          </section>
        ) : items.length === 0 ? (
          <section className="mt-7 rounded-3xl border border-[#e9e0d5] bg-white p-10 text-center">
            <p className="text-lg text-[#71685E]">عربة التسوق فارغة حاليًا.</p>
            <a href="/" className="mt-5 inline-flex rounded-full bg-[#1E1E1E] px-7 py-3 text-white">ابدئي التسوق</a>
          </section>
        ) : (
          <div className="mt-7 grid gap-7 lg:grid-cols-[1.2fr_.8fr]">
            <section className="space-y-4">
              {items.map((item, index) => (
                <article key={item.id + item.color + item.size} className="flex gap-4 rounded-2xl border border-[#e9e0d5] bg-white p-4">
                  <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F2ECE4]">
                    {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-black text-[#9B8B78]">LEVEL</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold">{item.name}</h2>
                    <p className="mt-1 text-sm text-[#71685E]">اللون: {item.color} · المقاس: {item.size}</p>
                    <p className="mt-1 text-sm">{item.price > 0 ? `${item.price.toLocaleString("ar-EG")} ج.م` : "السعر غير مُعرّف حاليًا"}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-[#ded4c8]">
                        <button type="button" onClick={() => save(items.map((entry, i) => i === index ? { ...entry, quantity: Math.max(1, entry.quantity - 1) } : entry))} className="h-9 w-9 text-lg" aria-label="تقليل الكمية">−</button>
                        <span className="min-w-8 text-center">{item.quantity}</span>
                        <button type="button" onClick={() => save(items.map((entry, i) => i === index ? { ...entry, quantity: Math.min(99, entry.quantity + 1) } : entry))} className="h-9 w-9 text-lg" aria-label="زيادة الكمية">+</button>
                      </div>
                      <button type="button" onClick={() => save(items.filter((_, i) => i !== index))} className="text-sm text-red-700 underline">حذف</button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
            <aside className="h-fit rounded-2xl border border-[#e9e0d5] bg-white p-6">
              <h2 className="text-xl font-bold">ملخص العربة</h2>
              <div className="mt-4 flex justify-between text-sm"><span>عدد القطع</span><strong>{count}</strong></div>
              <div className="mt-3 flex justify-between"><span>الإجمالي</span><strong>{hasUnknownPrice ? "بعض الأسعار غير مُعرّفة" : `${total.toLocaleString("ar-EG")} ج.م`}</strong></div>
              {hasUnknownPrice && <p className="mt-3 text-xs leading-6 text-[#82776b]">سيتم تأكيد السعر غير المُعرّف مع المتجر.</p>}
              <form onSubmit={checkout} className="mt-6 space-y-3 border-t border-[#eee6dc] pt-5">
                <h3 className="font-bold">بيانات التوصيل</h3>
                <label className="block text-sm">الاسم<input required value={customer.name} onChange={e => setCustomer(old => ({ ...old, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#ded4c8] p-3" /></label>
                <label className="block text-sm">رقم الهاتف / واتساب<input required type="tel" value={customer.phone} onChange={e => setCustomer(old => ({ ...old, phone: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#ded4c8] p-3" /></label>
                <label className="block text-sm">عنوان التوصيل<textarea required rows={3} value={customer.address} onChange={e => setCustomer(old => ({ ...old, address: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#ded4c8] p-3" /></label>
                <label className="block text-sm font-semibold">طريقة الدفع<select required value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-[#ded4c8] bg-[#FAF8F5] p-3"><option value="نقدًا عند الاستلام">نقدًا عند الاستلام</option><option value="محفظة إلكترونية">محفظة إلكترونية</option><option value="إنستا باي">إنستا باي</option></select></label>
                {error && <p role="alert" className="text-sm leading-6 text-red-700">{error}</p>}
                <button disabled={busy} className="w-full rounded-full bg-[#1E1E1E] py-3 font-semibold text-white hover:bg-[#B8860B] disabled:opacity-50">{busy ? "جارٍ تأكيد الطلب…" : "تأكيد الطلبات"}</button>
              </form>
            </aside>
          </div>
        )}
      </div>
      <footer className="px-4 py-8 text-center text-sm text-[#887e72]">LEVEL WOMEN WEAR</footer>
    </main>
  );
}
