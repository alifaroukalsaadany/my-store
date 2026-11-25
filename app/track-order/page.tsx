"use client";

import { FormEvent, useState } from "react";

const steps = [
  { title: "تم استلام طلبك", message: "شكرًا لطلبك، وسيتم العمل عليه." },
  { title: "تم تجهيز طلبك", message: "طلبك جاهز وسيتم إرساله إلى شركة الشحن." },
  { title: "طلبك في الطريق", message: "طلبك خرج للتوصيل، انتظر وصوله." },
  { title: "تم تسليم طلبك", message: "نتمنى إن طلبك يكون عجبك ❤️" },
];

type TrackedOrder = { id: string; product: string; status: string };

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function track(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(""); setOrder(null);
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.trim(), phone: phone.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر العثور على الطلب.");
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، حاول مرة أخرى.");
    } finally { setLoading(false); }
  }

  const activeStep = order ? Math.max(0, steps.findIndex(step => step.title === order.status)) : 0;

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF8F5] px-4 py-10 text-[#1E1E1E]">
      <div className="mx-auto max-w-xl">
        <a href="/" className="text-sm text-[#8b6b2a] underline">العودة للمتجر</a>
        <section className="mt-6 rounded-3xl border border-[#e9e0d5] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm tracking-widest text-[#9B741C]">LEVEL WOMEN WEAR</p>
          <h1 className="mt-2 text-3xl font-bold">تابع طلبك</h1>
          <p className="mt-3 leading-7 text-[#71685E]">اكتب رقم الطلب ورقم الموبايل المسجل عند الشراء لمعرفة آخر حالة لطلبك.</p>
          <form onSubmit={track} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">رقم الطلب
              <input required value={orderId} onChange={e => setOrderId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#ded4c8] p-3" placeholder="اكتب رقم الطلب" />
            </label>
            <label className="block text-sm font-semibold">رقم الموبايل
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[#ded4c8] p-3" placeholder="رقم الموبايل المستخدم في الطلب" />
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="w-full rounded-full bg-[#1E1E1E] py-3 font-semibold text-white disabled:opacity-50">{loading ? "جارٍ البحث…" : "عرض حالة الطلب"}</button>
          </form>
          {order && <div className="mt-8 border-t border-[#eee5da] pt-6">
            <p className="text-sm text-[#71685E]">طلب رقم <b dir="ltr">{order.id}</b></p>
            <h2 className="mt-2 text-xl font-bold">{order.product}</h2>
            <div className="mt-6 space-y-5">
              {steps.map((step, index) => <div key={step.title} className="flex gap-3">
                <div className={"mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold " + (index <= activeStep ? "bg-[#B8860B] text-white" : "bg-[#eee9e2] text-[#8b8176]")}>{index < activeStep ? "✓" : index + 1}</div>
                <div><p className={"font-semibold " + (index === activeStep ? "text-[#9B741C]" : "")}>{step.title}</p><p className="mt-1 text-sm leading-6 text-[#71685E]">{step.message}</p></div>
              </div>)}
            </div>
            <p className="mt-6 rounded-xl bg-[#F2ECE4] p-4 text-sm font-semibold">حالة طلبك الحالية: {order.status}</p>
            <p className="mt-3 text-xs text-[#8b8176]">لرؤية أي تحديث جديد، أعد البحث عن الطلب.</p>
          </div>}
        </section>
      </div>
    </main>
  );
}
