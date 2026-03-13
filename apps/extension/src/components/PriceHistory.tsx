import { useEffect, useState } from "react";
import { getPriceHistory } from "~/lib/storage";
import type { PriceSnapshot } from "~/lib/storage";

interface PriceHistoryProps {
  productId: string;
  currentPrice: number;
}

const DAYS_UZ = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

export default function PriceHistory({ productId, currentPrice }: PriceHistoryProps) {
  const [history, setHistory] = useState<PriceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPriceHistory(productId)
      .then((data) => setHistory(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="flex justify-center py-3">
        <span className="loading loading-spinner loading-xs text-primary" />
      </div>
    );
  }

  // Need at least 2 data points for a meaningful chart
  if (history.length < 2) {
    return (
      <div className="bg-base-200 rounded-lg p-3 text-xs text-center text-base-content/60">
        <div className="text-lg mb-1">📊</div>
        <div>Narx tarixi to'planmoqda</div>
        <div className="mt-1 text-base-content/40">
          Joriy narx: {Math.floor(currentPrice).toLocaleString()} so'm
        </div>
      </div>
    );
  }

  const prices = history.map((h) => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length);
  const priceRange = maxPrice - minPrice;

  const normalized = prices.map((p) =>
    priceRange === 0 ? 50 : ((p - minPrice) / priceRange) * 100
  );

  // Last 7 entries for display
  const displayHistory = history.slice(-7);
  const displayNormalized = normalized.slice(-7);

  const firstPrice = displayHistory[0].price;
  const lastPrice = displayHistory[displayHistory.length - 1].price;

  return (
    <div className="space-y-3">
      {/* Price Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-info/10 rounded-lg p-2 text-center">
          <div className="text-xs text-base-content/70">Min</div>
          <div className="font-semibold text-xs">{minPrice.toLocaleString()}so'm</div>
        </div>
        <div className="bg-success/10 rounded-lg p-2 text-center">
          <div className="text-xs text-base-content/70">O'rta</div>
          <div className="font-semibold text-xs">{avgPrice.toLocaleString()}so'm</div>
        </div>
        <div className="bg-warning/10 rounded-lg p-2 text-center">
          <div className="text-xs text-base-content/70">Max</div>
          <div className="font-semibold text-xs">{maxPrice.toLocaleString()}so'm</div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-base-200 rounded-lg p-3">
        <div className="text-xs font-semibold mb-2">
          Narx tarixi ({history.length} ta kuzatuv)
        </div>

        <div className="flex items-end gap-1 h-24 bg-base-100 rounded p-2">
          {displayHistory.map((snap, idx) => {
            const date = new Date(snap.timestamp);
            const dayLabel = DAYS_UZ[date.getDay()];
            const isLast = idx === displayHistory.length - 1;
            const isAboveAvg = snap.price > avgPrice;

            return (
              <div key={snap.timestamp} className="flex-1 flex flex-col items-center justify-end">
                <div
                  className={`w-full rounded-t transition-colors ${
                    isLast ? "bg-primary" : isAboveAvg ? "bg-warning" : "bg-info"
                  }`}
                  style={{
                    height: `${Math.max(displayNormalized[idx], 10)}%`,
                    minHeight: "8px",
                  }}
                  title={`${date.toLocaleDateString("uz-UZ")}: ${(snap.price ?? 0).toLocaleString()}so'm`}
                />
                <div className="text-xs text-base-content/60 mt-1">{dayLabel}</div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="text-xs text-base-content/70 mt-2 flex gap-2">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-primary rounded" /> Oxirgi
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-warning rounded" /> Yuqori
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-info rounded" /> Past
          </span>
        </div>
      </div>

      {/* Trend */}
      <div className="bg-base-200 rounded-lg p-2 text-xs">
        <div className="font-semibold mb-1">📊 Trend</div>
        <div className="text-base-content/70">
          {lastPrice > firstPrice
            ? `📈 Narx o'sishmoqda (+${Math.floor(lastPrice - firstPrice).toLocaleString()})`
            : lastPrice < firstPrice
              ? `📉 Narx kamaymoqda (-${Math.floor(firstPrice - lastPrice).toLocaleString()})`
              : "➡️ Narx o'zgarmasdi"}
        </div>
      </div>
    </div>
  );
}
