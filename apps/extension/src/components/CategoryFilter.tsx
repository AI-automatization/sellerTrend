import { useEffect, useState } from "react";
import { sendToBackground } from "@plasmohq/messaging";
import type { CategoryItem } from "~/lib/api";
import type { GetCategoriesResponseBody } from "~/background/messages/get-categories";

interface CategoryFilterProps {
  onSelect: (category: CategoryItem) => void;
  selectedCategoryId: string | null;
}

export default function CategoryFilter({ onSelect, selectedCategoryId }: CategoryFilterProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    sendToBackground<Record<string, never>, GetCategoriesResponseBody>({
      name: "get-categories",
      body: {},
    })
      .then((res) => {
        if (res.success && res.data) {
          const sorted = res.data.sort((a, b) => b.avg_score - a.avg_score).slice(0, 10);
          setCategories(sorted);
        } else {
          setError(res.error ?? "Kategoriyalar yuklanmadi");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Kategoriyalar yuklanmadi");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <span className="loading loading-spinner loading-sm text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning alert-sm">
        <span className="text-xs">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-base-content/70">Kategoriyalar</div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {categories.map((cat) => (
          <button
            key={cat.category_id}
            onClick={() => onSelect(cat)}
            className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
              selectedCategoryId === cat.category_id
                ? "bg-primary text-primary-content"
                : "bg-base-200 hover:bg-base-300"
            }`}
          >
            <div className="font-medium truncate">{cat.category_title}</div>
            <div className="text-xs opacity-70">
              ⭐ {cat.avg_score.toFixed(1)} • {cat.product_count} mahsulot
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
