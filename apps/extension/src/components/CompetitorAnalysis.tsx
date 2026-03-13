import { useEffect, useState } from "react";
import { getTopCategories } from "~/lib/api";

interface ProductDetail {
  id: string;
  score: number | null;
  weekly_bought: number | null;
  trend: string | null;
  sell_price: number;
  last_updated: string | null;
  title?: string;
  seller_name?: string;
}

interface CompetitorItem {
  product_id: string;
  title: string;
  score: number;
  sell_price: number;
  weekly_bought: number | null;
}

interface CompetitorAnalysisProps {
  product: ProductDetail;
  maxPrice: number;
}

export default function CompetitorAnalysis({ product }: CompetitorAnalysisProps) {
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [categoryTitle, setCategoryTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEmpty(false);

    getTopCategories()
      .then((categories) => {
        if (cancelled) return;

        // Kategoriya ichida shu product bormi tekshiramiz
        for (const cat of categories) {
          const found = cat.top_products.find((p) => p.product_id === product.id);
          if (found) {
            setCategoryTitle(cat.category_title);
            setCompetitors(
              cat.top_products
                .filter((p) => p.product_id !== product.id)
                .slice(0, 5)
            );
            setLoading(false);
            return;
          }
        }

        // Product hech qaysi kategoriyaning top ro'yxatida yo'q
        setEmpty(true);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setEmpty(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [product.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  const maxPriceDisplay = Math.max(
    product.sell_price,
    ...competitors.map((c) => c.sell_price)
  );

  const avgScore =
    competitors.length > 0
      ? competitors.reduce((s, c) => s + c.score, 0) / competitors.length
      : null;
  const avgPrice =
    competitors.length > 0
      ? competitors.reduce((s, c) => s + c.sell_price, 0) / competitors.length
      : null;
  const rank =
    product.score != null
      ? competitors.filter((c) => c.score > product.score!).length + 1
      : null;

  return (
    <div className="space-y-3">
      {/* Kategoriya label */}
      {categoryTitle && (
        <div className="text-xs text-base-content/60 bg-base-200 rounded px-2 py-1">
          📁 {categoryTitle}
        </div>
      )}

      {/* Sizning mahsulot */}
      <div className="bg-success/10 border border-success/30 rounded-lg p-3">
        <div className="text-xs font-semibold text-success mb-1">📊 Sizning Mahsulot</div>
        <div className="text-sm font-medium line-clamp-2">
          {product.title || "Mahsulot"}
        </div>
        <div className="text-xs text-base-content/70 mt-2 flex justify-between">
          <span>⭐ {product.score != null ? product.score.toFixed(1) : "--"}</span>
          <span>💰 {Math.floor(product.sell_price).toLocaleString()} so'm</span>
          {product.weekly_bought != null && (
            <span>📈 {product.weekly_bought.toLocaleString()}/h</span>
          )}
        </div>
      </div>

      {/* Raqobatchilar yo'q holati */}
      {empty || competitors.length === 0 ? (
        <div className="text-center py-4 text-xs text-base-content/60">
          <div className="text-2xl mb-2">📊</div>
          <div>Bu mahsulot hali VENTRA top ro'yxatida yo'q.</div>
          <div className="mt-1 text-base-content/40">
            Kuzatishga qo'shing — ma'lumot to'plansin.
          </div>
        </div>
      ) : (
        <>
          {/* Raqobatchilar ro'yxati */}
          <div className="space-y-2">
            <div className="text-xs font-semibold">🏆 Kategoriya Top Mahsulotlar</div>
            {competitors.map((comp) => {
              const priceDiff = comp.sell_price - product.sell_price;
              const scoreDiff =
                product.score != null ? comp.score - product.score : null;
              const isStronger = comp.score >= (product.score ?? 0);

              return (
                <div key={comp.product_id} className="bg-base-200 rounded-lg p-2 text-xs">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 mr-2">
                      <div className="font-medium line-clamp-2">{comp.title}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`font-bold ${
                          isStronger ? "text-error" : "text-success"
                        }`}
                      >
                        ⭐ {comp.score.toFixed(1)}
                      </div>
                      {scoreDiff != null && (
                        <div className="text-base-content/50 text-xs">
                          {scoreDiff > 0 ? "+" : ""}
                          {scoreDiff.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Narx */}
                  <div className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-base-content/70">Narx:</span>
                      <span
                        className={`font-semibold ${
                          priceDiff > 0 ? "text-error" : "text-success"
                        }`}
                      >
                        {Math.floor(comp.sell_price).toLocaleString()} so'm{" "}
                        <span className="text-base-content/50 font-normal">
                          ({priceDiff > 0 ? "+" : ""}
                          {Math.floor(priceDiff).toLocaleString()})
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-warning h-full rounded-full"
                        style={{
                          width: `${Math.min(
                            (comp.sell_price / maxPriceDisplay) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {comp.weekly_bought != null && (
                    <div className="text-base-content/60">
                      📈 Haftalik: {comp.weekly_bought.toLocaleString()} ta
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tahlil xulosasi */}
          {product.score != null && avgScore != null && avgPrice != null && (
            <div className="bg-info/10 border border-info/20 rounded-lg p-2">
              <div className="text-xs font-semibold text-info mb-1">💡 Tahlil</div>
              <ul className="text-xs text-base-content/70 space-y-1">
                {rank != null && (
                  <li>• Kategoriyada {rank}-o'rin (scorega ko'ra)</li>
                )}
                <li>
                  • O'rtacha score: {avgScore.toFixed(1)} — sizniki:{" "}
                  {product.score.toFixed(1)}{" "}
                  {product.score >= avgScore ? "✓ yuqori" : "⚠ past"}
                </li>
                <li>
                  • Narx:{" "}
                  {product.sell_price <= avgPrice
                    ? "Raqobatbardosh ✓"
                    : "O'rtachadan yuqori"}
                </li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
