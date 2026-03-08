interface ProductDetail {
  id: string;
  score: number;
  weekly_bought: number | null;
  trend: string | null;
  sell_price: number;
  last_updated: string;
  title?: string;
  seller_name?: string;
}

interface CompetitorItem {
  product_id: string;
  title: string;
  score: number;
  sell_price: number;
  weekly_bought: number | null;
  seller_name: string;
}

interface CompetitorAnalysisProps {
  product: ProductDetail;
  maxPrice: number;
}

// Generate simulated competitors for demo
function generateCompetitors(
  basePrice: number,
  baseScore: number
): CompetitorItem[] {
  const competitors: CompetitorItem[] = [
    {
      product_id: "comp_001",
      title: "Raqobatchi #1 — O'xshash mahsulot (Yuqori narx)",
      score: Math.max(baseScore - 0.3, 0),
      sell_price: basePrice * 1.15,
      weekly_bought: Math.floor(Math.random() * 50 + 20),
      seller_name: "Seller Pro",
    },
    {
      product_id: "comp_002",
      title: "Raqobatchi #2 — O'xshash mahsulot (Pastroq narx)",
      score: Math.max(baseScore - 0.5, 0),
      sell_price: basePrice * 0.85,
      weekly_bought: Math.floor(Math.random() * 60 + 30),
      seller_name: "Budget Store",
    },
    {
      product_id: "comp_003",
      title: "Raqobatchi #3 — O'xshash mahsulot (Orta narx)",
      score: Math.max(baseScore - 0.2, 0),
      sell_price: basePrice * 0.95,
      weekly_bought: Math.floor(Math.random() * 40 + 15),
      seller_name: "Quality Seller",
    },
  ];

  return competitors;
}

export default function CompetitorAnalysis({
  product,
  maxPrice,
}: CompetitorAnalysisProps) {
  const competitors = generateCompetitors(product.sell_price, product.score);
  const maxPriceDisplay = Math.max(maxPrice, ...competitors.map((c) => c.sell_price));

  return (
    <div className="space-y-3">
      {/* Your Product Reference */}
      <div className="bg-success/10 border border-success/30 rounded-lg p-3">
        <div className="text-xs font-semibold text-success mb-2">📊 Sizning Mahsulot</div>
        <div className="text-sm font-medium line-clamp-2">
          {product.title || "Mahsulot"}
        </div>
        <div className="text-xs text-base-content/70 mt-2 flex justify-between">
          <span>⭐ {product.score.toFixed(1)}</span>
          <span>💰 {Math.floor(product.sell_price).toLocaleString()}so'm</span>
        </div>
      </div>

      {/* Competitors List */}
      <div className="space-y-2">
        <div className="text-xs font-semibold">🏆 Top Raqobatchilar</div>
        {competitors.map((comp, idx) => (
          <div key={comp.product_id} className="bg-base-200 rounded-lg p-2 text-xs">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="font-medium line-clamp-2">{comp.title}</div>
                <div className="text-base-content/60 text-xs mt-1">{comp.seller_name}</div>
              </div>
              <div className="text-right ml-2">
                <div className="font-bold">⭐ {comp.score.toFixed(1)}</div>
              </div>
            </div>

            {/* Price Bar */}
            <div className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-base-content/70">Narx:</span>
                <span className="font-semibold">
                  {Math.floor(comp.sell_price).toLocaleString()}so'm
                </span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-warning h-full"
                  style={{
                    width: `${(comp.sell_price / maxPriceDisplay) * 100}%`,
                  }}
                />
              </div>
              <div className="text-xs text-base-content/60 mt-1">
                {comp.sell_price > product.sell_price
                  ? `+${Math.floor(comp.sell_price - product.sell_price).toLocaleString()}so'm (ko'p)`
                  : `-${Math.floor(product.sell_price - comp.sell_price).toLocaleString()}so'm (kam)`}
              </div>
            </div>

            {/* Weekly Bought */}
            <div className="text-xs text-base-content/70">
              📈 Haftalik: {comp.weekly_bought?.toLocaleString() ?? "—"} ta
            </div>
          </div>
        ))}
      </div>

      {/* Analysis Tips */}
      <div className="bg-info/10 border border-info/20 rounded-lg p-2">
        <div className="text-xs font-semibold text-info mb-1">💡 Tavsiya</div>
        <ul className="text-xs text-base-content/70 space-y-1">
          <li>
            • Narx:{" "}
            {product.sell_price <
            competitors.reduce((a, c) => a + c.sell_price, 0) / competitors.length
              ? "Kompetitiv ✓"
              : "Ko'proq ekanligini tekshiring"}
          </li>
          <li>
            • Rating: {product.score > 3.5 ? "Yaxshi ✓" : "Takomlashtirish kerak"}
          </li>
          <li>• Raqobatchilarni kuzatib vosita qilib oling</li>
        </ul>
      </div>
    </div>
  );
}
