import { useState, useEffect } from 'react';
import { referralApi } from '../api/client';

interface ReferralStats {
  my_code: string | null;
  total_referred: number;
  active: number;
  earned_days: number;
}

export function ReferralPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    referralApi.getStats()
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await referralApi.generateCode();
      setStats((s) => s ? { ...s, my_code: res.data.code } : s);
    } catch {}
    finally { setGenerating(false); }
  }

  function copyLink() {
    if (!stats?.my_code) return;
    const link = `${window.location.origin}/register?ref=${stats.my_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-dots loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-secondary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          Referal tizimi
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          Do'stlaringizni taklif qiling va bepul kunlar yutib oling
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat bg-base-200 rounded-2xl">
          <div className="stat-title text-xs">Taklif qilganlar</div>
          <div className="stat-value text-xl">{stats?.total_referred ?? 0}</div>
          <div className="stat-desc">jami</div>
        </div>
        <div className="stat bg-base-200 rounded-2xl">
          <div className="stat-title text-xs">Faollar</div>
          <div className="stat-value text-xl text-success">{stats?.active ?? 0}</div>
          <div className="stat-desc">ro'yxatdan o'tgan</div>
        </div>
        <div className="stat bg-base-200 rounded-2xl">
          <div className="stat-title text-xs">Yutilgan kunlar</div>
          <div className="stat-value text-xl text-primary">{stats?.earned_days ?? 0}</div>
          <div className="stat-desc">bepul kunlar</div>
        </div>
        <div className="stat bg-base-200 rounded-2xl">
          <div className="stat-title text-xs">Har taklif uchun</div>
          <div className="stat-value text-xl">7</div>
          <div className="stat-desc">bepul kun</div>
        </div>
      </div>

      {/* Code card */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">Sizning referal kodingiz</h2>

          {stats?.my_code ? (
            <div className="space-y-4">
              <div className="bg-base-300 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-base-content/40">Kod</p>
                  <p className="text-2xl font-mono font-bold tracking-widest">{stats.my_code}</p>
                </div>
                <button onClick={copyLink} className="btn btn-primary btn-sm">
                  {copied ? 'Nusxalandi!' : 'Linkni nusxalash'}
                </button>
              </div>

              <div className="bg-base-300 rounded-xl p-4">
                <p className="text-xs text-base-content/40 mb-1">Referal link</p>
                <p className="text-sm font-mono break-all">
                  {window.location.origin}/register?ref={stats.my_code}
                </p>
              </div>

              <p className="text-xs text-base-content/40">
                Bu linkni do'stlaringizga yuboring. Ular ro'yxatdan o'tganda, ikkalangizga 7 kunlik bepul foydalanish beriladi.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 gap-4">
              <p className="text-base-content/50 text-sm text-center">
                Hali referal kodingiz yo'q. Yarating va do'stlaringizni taklif qiling!
              </p>
              <button onClick={handleGenerate} disabled={generating} className="btn btn-primary">
                {generating && <span className="loading loading-spinner loading-sm" />}
                {generating ? 'Yaratilmoqda...' : 'Kod yaratish'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">Qanday ishlaydi?</h2>
          <ul className="steps steps-vertical text-sm">
            <li className="step step-primary">Referal kodingizni yarating</li>
            <li className="step step-primary">Linkni do'stlaringizga yuboring</li>
            <li className="step step-primary">Ular ro'yxatdan o'tishadi</li>
            <li className="step step-primary">Ikkalangiz 7 kun bepul foydalanasiz!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
