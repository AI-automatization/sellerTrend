import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { discoveryApi } from '../api/client';
import { SkeletonTable } from '../components/ui/Skeleton';
import { setMetaTags } from '../utils/seo';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Winner {
  rank: number;
  product_id: string;
  title: string;
  score: number | null;
  weekly_bought: number | null;
  orders_quantity: string | null;
  sell_price: string | null;
}

interface LeaderboardData {
  run_id: string | null;
  category_id: string | null;
  finished_at: string | null;
  winners: Winner[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 0,     label: 'Barcha kategoriyalar' },
  { id: 10012, label: "Go'zallik" },
  { id: 10091, label: 'Makiyaj' },
  { id: 10165, label: 'Soch parvarishi' },
  { id: 11736, label: 'Soch kosmetikasi' },
  { id: 12888, label: 'Konturing' },
];

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// Demo data for non-authenticated visitors
const DEMO_WINNERS: Winner[] = Array.from({ length: 20 }, (_, i) => ({
  rank: i + 1,
  product_id: String(100000 + i),
  title: ['Tonal krem SPF 30', 'Labial pomada', 'Namlovchi krem', 'BB krem',
    'Konturing palitasi', 'Maskara', 'Primer yuz uchun', 'Yuz toniği',
    'Gidrоgel patch', 'Bronzer', 'Hайlayner', 'Blush', 'Setting sprey',
    'Qoshlar uchun karandash', 'Kushadka ko\'z uchun', 'Тuş bo\'yoq',
    'Vitamin C serum', 'Kollagen maska', 'Retinol krem', 'Niasinamid serum'][i],
  score: Number((8.5 - i * 0.3).toFixed(2)),
  weekly_bought: Math.max(5, 420 - i * 18),
  orders_quantity: String(15000 - i * 600),
  sell_price: String(65000 + i * 2500),
}));

// ─── Sub-components ───────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const medal = RANK_MEDALS[rank];
  if (medal) {
    return (
      <span className="text-xl" title={`#${rank}`}>
        {medal}
      </span>
    );
  }
  return (
    <span className="text-sm font-bold text-base-content/40 tabular-nums w-6 text-center">
      {rank}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-base-content/30">—</span>;
  const cls =
    score >= 7 ? 'badge-success' : score >= 5 ? 'badge-warning' : 'badge-ghost';
  return <span className={`badge badge-sm ${cls} tabular-nums`}>{score.toFixed(2)}</span>;
}

function WinnerRow({
  winner,
  blurred,
  isAuthenticated,
}: {
  winner: Winner;
  blurred: boolean;
  isAuthenticated: boolean;
}) {
  const content = (
    <tr className={`hover ${blurred ? 'select-none' : ''}`}>
      <td className="w-8">
        <RankBadge rank={winner.rank} />
      </td>
      <td>
        <div className={`max-w-xs ${blurred ? 'blur-sm' : ''}`}>
          {!blurred && isAuthenticated ? (
            <Link
              to={`/products/${winner.product_id}`}
              className="font-medium text-sm hover:text-primary transition-colors truncate block"
            >
              {winner.title}
            </Link>
          ) : (
            <p className="font-medium text-sm truncate">{winner.title}</p>
          )}
          <p className="text-xs text-base-content/30">#{winner.product_id}</p>
        </div>
      </td>
      <td className={`text-center ${blurred ? 'blur-sm' : ''}`}>
        <ScoreBadge score={winner.score} />
      </td>
      <td className={`text-right tabular-nums text-sm ${blurred ? 'blur-sm' : ''}`}>
        {winner.weekly_bought != null ? (
          <span className="text-success font-medium">
            {winner.weekly_bought.toLocaleString()}
          </span>
        ) : '—'}
      </td>
      <td className={`text-right tabular-nums text-sm ${blurred ? 'blur-sm' : ''}`}>
        {winner.sell_price
          ? `${Number(winner.sell_price).toLocaleString()} so'm`
          : '—'}
      </td>
    </tr>
  );

  return content;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

export function PublicLeaderboardPage() {
  const authed = isAuthenticated();
  const [categoryId, setCategoryId] = useState<number>(0);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(authed);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMetaTags(
      "Uzum Top Mahsulotlar — Trend Finder",
      "Uzum.uz marketplace'dagi eng trend va ko'p sotilayotgan mahsulotlar reytingi.",
    );
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    setError(null);
    const catParam = categoryId > 0 ? categoryId : undefined;
    discoveryApi
      .getLeaderboard(catParam)
      .then((res) => setData(res.data))
      .catch(() => setError("Ma'lumot yuklanmadi"))
      .finally(() => setLoading(false));
  }, [authed, categoryId]);

  const winners = authed ? (data?.winners ?? []) : DEMO_WINNERS;
  const topFive = winners.slice(0, 5);
  const rest = winners.slice(5);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <h1 className="text-3xl font-bold">🏆 Uzum Top Mahsulotlar</h1>
        <p className="text-base-content/50 text-sm max-w-md mx-auto">
          Uzum.uz marketplace'dagi eng yuqori trend score'li va ko'p sotilayotgan mahsulotlar
        </p>
        {data?.finished_at && (
          <p className="text-xs text-base-content/30">
            Oxirgi yangilanish:{' '}
            {new Date(data.finished_at).toLocaleDateString('uz-UZ', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* Category filter */}
      <div className="flex justify-center">
        <select
          className="select select-bordered select-sm w-full max-w-xs"
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
          aria-label="Kategoriya tanlash"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── NOT AUTHENTICATED: demo + CTA ── */}
      {!authed && (
        <div className="relative">
          <div className="card bg-base-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th className="w-8">#</th>
                    <th>Mahsulot</th>
                    <th className="text-center">Score</th>
                    <th className="text-right">Haftalik sotuv</th>
                    <th className="text-right">Narx</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_WINNERS.slice(0, 3).map((w) => (
                    <WinnerRow key={w.rank} winner={w} blurred={false} isAuthenticated={false} />
                  ))}
                  {DEMO_WINNERS.slice(3, 8).map((w) => (
                    <WinnerRow key={w.rank} winner={w} blurred isAuthenticated={false} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Blur overlay + CTA */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-base-200 via-base-200/90 to-transparent flex flex-col items-center justify-end pb-6 gap-3">
              <p className="font-bold text-lg text-center">
                Top-20 ni ko'rish uchun ro'yxatdan o'ting
              </p>
              <p className="text-sm text-base-content/50 text-center">
                Bepul · Karta shart emas · 1 daqiqa
              </p>
              <div className="flex gap-3">
                <Link to="/register" className="btn btn-primary btn-sm gap-2">
                  Bepul ro'yxatdan o'tish →
                </Link>
                <Link to="/login" className="btn btn-outline btn-sm">
                  Kirish
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AUTHENTICATED: real data ── */}
      {authed && (
        <>
          {loading && (
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body p-0 pt-2">
                <SkeletonTable rows={10} cols={5} />
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="alert alert-error alert-soft">
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && winners.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-base-content/50">Bu kategoriya uchun hali tahlil yo'q</p>
              <Link to="/discovery" className="btn btn-primary btn-sm mt-4">
                Discovery boshlash
              </Link>
            </div>
          )}

          {!loading && winners.length > 0 && (
            <div className="card bg-base-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th className="w-8">#</th>
                      <th>Mahsulot</th>
                      <th className="text-center">Score</th>
                      <th className="text-right">Haftalik sotuv</th>
                      <th className="text-right">Narx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Top-5: to'liq ko'rsatish */}
                    {topFive.map((w) => (
                      <WinnerRow key={w.rank} winner={w} blurred={false} isAuthenticated />
                    ))}

                    {/* 6-20: blur + CTA */}
                    {rest.length > 0 && (
                      <>
                        {rest.map((w) => (
                          <WinnerRow key={w.rank} winner={w} blurred isAuthenticated />
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Blur overlay for 6-20 */}
              {rest.length > 0 && (
                <div className="relative">
                  <div className="absolute -top-32 left-0 right-0 h-32 bg-gradient-to-t from-base-200/95 to-transparent pointer-events-none" />
                  <div className="bg-base-200 py-6 flex flex-col items-center gap-3 border-t border-base-300">
                    <p className="text-sm text-base-content/60 text-center">
                      To'liq top-20 ko'rish uchun Discovery ishlatib tahlil qiling
                    </p>
                    <Link to="/discovery" className="btn btn-primary btn-sm gap-2">
                      Discovery →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Footer info */}
      {!authed && (
        <p className="text-center text-xs text-base-content/30 pb-4">
          Ma'lumotlar Uzum.uz'dan real vaqtda olinadi · Har kuni yangilanadi
        </p>
      )}
    </div>
  );
}
