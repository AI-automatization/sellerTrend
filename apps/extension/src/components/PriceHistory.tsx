interface PriceHistoryData {
  date: string;
  price: number;
  day: string;
}

interface PriceHistoryProps {
  currentPrice: number;
}

// Generate simulated 7-day price history
function generatePriceHistory(basePrice: number): PriceHistoryData[] {
  const data: PriceHistoryData[] = [];
  const days = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Simulate price fluctuation
    const variation = (Math.random() - 0.5) * basePrice * 0.1; // ±5% variation
    const price = Math.floor(basePrice + variation);

    data.push({
      date: date.toLocaleDateString("uz-UZ", { month: "2-digit", day: "2-digit" }),
      price,
      day: days[6 - i],
    });
  }

  return data;
}

export default function PriceHistory({ currentPrice }: PriceHistoryProps) {
  const history = generatePriceHistory(currentPrice);
  const prices = history.map((h) => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length);
  const priceRange = maxPrice - minPrice;

  // Normalize prices for bar height (0-100%)
  const normalizedPrices = prices.map((p) =>
    priceRange === 0 ? 50 : ((p - minPrice) / priceRange) * 100
  );

  return (
    <div className="space-y-3">
      {/* Price Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-info/10 rounded-lg p-2 text-center">
          <div className="text-xs text-base-content/70">Min</div>
          <div className="font-semibold text-sm">{minPrice.toLocaleString()}so'm</div>
        </div>
        <div className="bg-success/10 rounded-lg p-2 text-center">
          <div className="text-xs text-base-content/70">O'rta</div>
          <div className="font-semibold text-sm">{avgPrice.toLocaleString()}so'm</div>
        </div>
        <div className="bg-warning/10 rounded-lg p-2 text-center">
          <div className="text-xs text-base-content/70">Max</div>
          <div className="font-semibold text-sm">{maxPrice.toLocaleString()}so'm</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-base-200 rounded-lg p-3">
        <div className="text-xs font-semibold mb-2">7 kunlik narx trend</div>

        {/* Bar Chart */}
        <div className="flex items-end gap-1 h-32 bg-base-100 rounded p-2">
          {history.map((data, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end">
              {/* Bar */}
              <div
                className={`w-full rounded-t transition-colors ${
                  idx === history.length - 1
                    ? "bg-primary"
                    : data.price > avgPrice
                      ? "bg-warning"
                      : "bg-info"
                }`}
                style={{
                  height: `${Math.max(normalizedPrices[idx], 10)}%`,
                  minHeight: "8px",
                }}
                title={`${data.date}: ${data.price.toLocaleString()}so'm`}
              />
              {/* Label */}
              <div className="text-xs text-base-content/60 mt-1">{data.day}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="text-xs text-base-content/70 mt-2 flex gap-2">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-primary rounded" /> Bugun
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-warning rounded" /> Yuqori
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-info rounded" /> Past
          </span>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="bg-base-200 rounded-lg p-2 text-xs">
        <div className="font-semibold mb-1">📊 Trend</div>
        <div className="text-base-content/70">
          {history[history.length - 1].price > history[0].price
            ? "📈 Narx o'sishmoqda (+)"
            : history[history.length - 1].price < history[0].price
              ? "📉 Narx kamaymoqda (-)"
              : "➡️ Narx o'zgarmasdi"}
        </div>
      </div>
    </div>
  );
}
