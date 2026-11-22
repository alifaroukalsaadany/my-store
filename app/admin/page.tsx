"use client";

import { useState } from "react";

type Order = {
  id: string; createdAt: string; name: string; phone: string; address: string;
  product: string; color: string; size: string; notes: string;
};

const WA = "201004151517";

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  async function loadOrders() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/orders", { headers: { "x-owner-key": key }, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "مفتاح الإدارة غير صحيح." : "تعذر تحميل الطلبات. تأكد من إعداد قاعدة البيانات.");
      const data = await response.json();
      setOrders(data.orders || []);
      setAuthenticated(true);
    } catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع."); }
    finally { setLoading(false); }
  }

  function sendWhatsApp(order: Order) {
    const summary = `طلب جديد: ${order.id}
الاسم: ${order.name}
الهاتف: ${order.phone}
العنوان: ${order.address}
القطعة: ${order.product}
اللون: ${order.color}
المقاس: ${order.size}
ملاحظات: ${order.notes || "-"}`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(summary)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF8F5] text-[#1E1E1E]">
      <header className="border-b border-[#e8dfd2] bg-white/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <a href="/" className="text-sm text-[#8b6b2a] underline">العودة إلى موقع الزوار</a>
          <strong className="text-xl tracking-widest">LEVEL · ADMIN</strong>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <p className="text-sm tracking-widest text-[#9B741C]">PRIVATE DASHBOARD</p>
          <h1 className="mt-2 text-3xl font-bold">لوحة إدارة المتجر</h1>
          <p className="mt-3 text-[#71685E]">هذه الصفحة خاصة بصاحب المتجر. سجّل الدخول بمفتاح الإدارة لعرض الطلبات.</p>
        </div>
        {!authenticated ? (
          <form onSubmit={e => { e.preventDefault(); void loadOrders(); }} className="max-w-lg rounded-2xl border border-[#e9e0d5] bg-white p-6 shadow-sm">
            <label className="block text-sm font-semibold">مفتاح الإدارة
              <input type="password" required value={key} onChange={e => setKey(e.target.value)} className="mt-2 w-full rounded-xl border border-[#ded4c8] p-3" placeholder="أدخل مفتاح الإدارة"/>
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="mt-5 w-full rounded-full bg-[#1E1E1E] px-5 py-3 text-white disabled:opacity-50">{loading ? "جارٍ التحقق…" : "دخول إلى لوحة الإدارة"}</button>
          </form>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-2xl font-semibold">الطلبات الواردة</h2><p className="mt-1 text-sm text-[#71685E]">عدد الطلبات: {orders.length}</p></div>
              <button onClick={() => void loadOrders()} disabled={loading} className="rounded-full border border-[#B8860B] px-5 py-2.5">{loading ? "جارٍ التحديث…" : "تحديث الطلبات"}</button>
            </div>
            {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
            {orders.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d8c7a9] bg-white p-12 text-center text-[#71685E]">لا توجد طلبات حتى الآن.</div> :
              <div className="space-y-4">{orders.map(order => <article key={order.id} className="rounded-2xl border border-[#e9e0d5] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">{order.name}</h3><span dir="ltr" className="text-sm text-[#9B741C]">{order.id}</span></div>
                <p className="mt-3 leading-8 text-sm">{order.product} · {order.color} · {order.size}<br/>الهاتف: <span dir="ltr">{order.phone}</span><br/>العنوان: {order.address}<br/>ملاحظات: {order.notes || "لا توجد"}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eee7de] pt-3"><span className="text-xs text-[#8b8176]">{order.createdAt ? new Date(order.createdAt).toLocaleString("ar-EG") : ""}</span><button onClick={() => sendWhatsApp(order)} className="rounded-full bg-[#1E1E1E] px-5 py-2 text-sm text-white">إرسال التفاصيل عبر واتساب</button></div>
              </article>)}</div>
            }
          </>
        )}
      </div>
    </main>
  );
}
