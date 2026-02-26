import { useState } from 'react';

type Plan = 'free' | 'pro';

const FEATURES = {
  free: [
    { title: "Score overlay", desc: 'Uzum sahifasida har bir mahsulot kartasida score badge', icon: '🎯' },
    { title: 'Tezkor tahlil', desc: "Bir klik bilan score, trend va raqobat ko'rish", icon: '⚡' },
    { title: 'Kuzatuvga olish', desc: "Brauzerdan chiqmasdan mahsulotni kuzatuvga qo'shish", icon: '👁️' },
    { title: "Narx tarixini ko'rish", desc: "Mahsulot narxi o'zgarishini grafik shaklida ko'ring", icon: '📈' },
  ],
  pro: [
    { title: 'Raqiblar narxi', desc: "Raqobatchi do'konlar narxini real-time kuzatish", icon: '⚖️' },
    { title: 'Kategoriya skaneri', desc: "Kategoriya TOP mahsulotlarini brauzerdan tahlil qilish", icon: '🔍' },
    { title: 'Sotuv tezligi badge', desc: "Har bir mahsulotda haftalik sotuv tezligi ko'rsatiladi", icon: '🚀' },
    { title: 'Batch track', desc: "Bir necha mahsulotni bir vaqtda kuzatuvga olish", icon: '📦' },
    { title: 'Narx alert', desc: "Raqiblar narx o'zgarganda brauzer notification", icon: '🔔' },
    { title: 'Export hisobot', desc: "Sahifadagi ma'lumotlarni CSV/PDF ga export", icon: '📊' },
  ],
};

const INSTALL_STEPS = [
  { num: '1', text: "Quyidagi tugmani bosib extension faylni yuklab oling (.zip)" },
  { num: '2', text: "Chrome: chrome://extensions → 'Developer mode' → 'Load unpacked'" },
  { num: '3', text: "Firefox: about:debugging → 'Load Temporary Add-on'" },
  { num: '4', text: "VENTRA akkauntingiz bilan kiring — avtomatik ulanadi" },
];

export function ExtensionPage() {
  const [plan, setPlan] = useState<Plan>('free');

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
          </svg>
          Browser Extension
        </h1>
        <p className="text-base-content/50 text-sm mt-1">Uzum.uz da inline score overlay, raqobat tahlili va tezkor analitika</p>
      </div>

      {/* Plan toggle */}
      <div className="flex items-center gap-2">
        <div className="join">
          <button className={`join-item btn btn-sm ${plan === 'free' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPlan('free')}>
            Free
          </button>
          <button className={`join-item btn btn-sm ${plan === 'pro' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPlan('pro')}>
            Pro
            <span className="badge badge-warning badge-xs ml-1">PRO</span>
          </button>
        </div>
        <span className="text-xs text-base-content/40">
          {plan === 'free' ? 'Asosiy funksiyalar — bepul' : "Kengaytirilgan funksiyalar — Pro plan bilan"}
        </span>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES[plan].map((f, i) => (
          <div key={i} className="rounded-2xl bg-base-200/60 border border-base-300/50 p-5 hover:bg-base-300/40 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{f.icon}</span>
              <h3 className="font-bold text-sm">{f.title}</h3>
              {plan === 'pro' && <span className="badge badge-warning badge-xs">PRO</span>}
            </div>
            <p className="text-xs text-base-content/50">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-5 lg:p-6">
        <h2 className="text-lg font-bold mb-2">Qanday ishlaydi</h2>
        <p className="text-sm text-base-content/60 mb-4">
          Extension uzum.uz sahifalarini aniqlaydi va VENTRA API orqali har bir mahsulotga
          score badge, haftalik sotuv va raqiblar narxini qo'shadi.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-base-300/60 rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">🏷️</p>
            <p className="text-xs font-bold">Score Overlay</p>
            <p className="text-xs text-base-content/40 mt-1">Mahsulot kartasida inline badge</p>
          </div>
          <div className="bg-base-300/60 rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">📊</p>
            <p className="text-xs font-bold">Sidebar Panel</p>
            <p className="text-xs text-base-content/40 mt-1">Batafsil tahlil va grafiklar</p>
          </div>
          <div className="bg-base-300/60 rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">🔔</p>
            <p className="text-xs font-bold">Notifications</p>
            <p className="text-xs text-base-content/40 mt-1">Narx va raqobat alertlari</p>
          </div>
        </div>
      </div>

      {/* Install steps */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-5 lg:p-6">
        <h2 className="text-lg font-bold mb-4">O'rnatish</h2>
        <div className="space-y-4">
          {INSTALL_STEPS.map((s) => (
            <div key={s.num} className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {s.num}
              </span>
              <p className="text-sm text-base-content/70 pt-0.5">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Download */}
      <div className="rounded-2xl bg-base-200/60 border border-base-300/50 p-5 lg:p-6">
        <h2 className="text-lg font-bold mb-4">Yuklab olish</h2>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary gap-2" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Chrome — Tez kunda
          </button>
          <button className="btn btn-outline gap-2" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Firefox — Tez kunda
          </button>
        </div>
        <p className="text-xs text-base-content/30 mt-3">Extension hozirda ishlab chiqilmoqda. Tayyor bo'lganda bu sahifada chiqadi.</p>
      </div>
    </div>
  );
}
