import type { CategoryItem } from "~/lib/api";

interface CategoryInsightsProps {
  category: CategoryItem;
}

function getCompetitionLevel(productCount: number): {
  level: "HIGH" | "MEDIUM" | "LOW";
  color: string;
  label: string;
} {
  if (productCount > 100) return { level: "HIGH", color: "text-error", label: "Yuqori" };
  if (productCount > 30) return { level: "MEDIUM", color: "text-warning", label: "O'rta" };
  return { level: "LOW", color: "text-success", label: "Past" };
}

function getPriceRange(
  products: Array<{ sell_price: number }>
): { min: number; max: number } {
  if (products.length === 0) return { min: 0, max: 0 };
  const prices = products.map((p) => p.sell_price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export default function CategoryInsights({ category }: CategoryInsightsProps) {
  const competition = getCompetitionLevel(category.product_count);
  const priceRange = getPriceRange(category.top_products);

  return (
    <div className="space-y-3">
      {/* Average Score Card */}
      <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
        <div className="text-xs text-base-content/70 mb-1">O'rtacha Score</div>
        <div className="text-2xl font-bold text-primary">{(category.avg_score ?? 0).toFixed(1)}</div>
        <div className="text-xs text-base-content/60 mt-1">
          {category.product_count} ta mahsulot asosida
        </div>
      </div>

      {/* Competition Level Card */}
      <div className="bg-base-200 rounded-lg p-3">
        <div className="text-xs text-base-content/70 mb-1">Raqobat Darajasi</div>
        <div className={`text-lg font-bold ${competition.color}`}>{competition.label}</div>
        <div className="text-xs text-base-content/60 mt-1">
          {category.product_count} mahsulot
        </div>
      </div>

      {/* Price Range Card */}
      <div className="bg-base-200 rounded-lg p-3">
        <div className="text-xs text-base-content/70 mb-1">Narx Diapazon</div>
        <div className="text-sm font-semibold">
          {Math.floor(priceRange.min).toLocaleString()}so'm — {Math.floor(priceRange.max).toLocaleString()}so'm
        </div>
        <div className="text-xs text-base-content/60 mt-1">
          Eng past va eng baland narx
        </div>
      </div>

      {/* Trend Indicator */}
      <div className="bg-base-200 rounded-lg p-3">
        <div className="text-xs text-base-content/70 mb-2">Ijobiy Belgilar</div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-success">✓</span>
            <span>Top products mavjud</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-success">✓</span>
            <span>
              {category.avg_score > 3 ? "Yaxshi rating" : "Takomlashtirish mumkin"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-success">✓</span>
            <span>
              {category.product_count > 50
                ? "Katta bozor"
                : category.product_count > 10
                  ? "O'rta bozar"
                  : "Kichik bozor"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
