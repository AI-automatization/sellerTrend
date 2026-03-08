import { useEffect, useState } from "react";
import { sendToBackground } from "@plasmohq/messaging";
import type { QuickScoreResponseBody } from "~/background/messages/quick-score";
import type { CategoryItem } from "~/lib/api";
import AdvancedFilters from "./AdvancedFilters";

interface QuickAnalysisModalProps {
  productId: string | null;
  categoryData: CategoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ProductDetail {
  id: string;
  score: number;
  weekly_bought: number | null;
  trend: string | null;
  sell_price: number;
  last_updated: string;
}

// Helper to filter and sort products
function filterAndSortProducts(
  products: Array<{ product_id: string; title: string; score: number; weekly_bought: number | null; sell_price: number }>,
  searchQuery: string,
  sortBy: "score" | "price-asc" | "price-desc" | "weekly"
) {
  let filtered = products;

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((p) => p.title.toLowerCase().includes(query));
  }

  // Sort
  const sorted = [...filtered];
  switch (sortBy) {
    case "score":
      sorted.sort((a, b) => b.score - a.score);
      break;
    case "price-asc":
      sorted.sort((a, b) => a.sell_price - b.sell_price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.sell_price - a.sell_price);
      break;
    case "weekly":
      sorted.sort((a, b) => (b.weekly_bought ?? 0) - (a.weekly_bought ?? 0));
      break;
  }

  return sorted;
}

export default function QuickAnalysisModal({
  productId,
  categoryData,
  isOpen,
  onClose,
}: QuickAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "price-asc" | "price-desc" | "weekly">("score");

  useEffect(() => {
    if (!isOpen) {
      setProduct(null);
      setSearchQuery("");
      setSortBy("score");
      return;
    }

    // Product analysis mode
    if (productId) {
      setLoading(true);
      setError(null);

      sendToBackground<{ productId: string }, QuickScoreResponseBody>({
        name: "quick-score",
        body: { productId },
      })
        .then((res) => {
          if (res.success && res.data) {
            setProduct({
              id: productId,
              score: res.data.score,
              weekly_bought: res.data.weekly_bought,
              trend: res.data.trend,
              sell_price: res.data.sell_price,
              last_updated: res.data.last_updated,
            });
          } else {
            setError("Ma'lumot yuklanmadi");
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
        })
        .finally(() => {
          setLoading(false);
        });
    }
    // Category analysis mode
    else if (categoryData) {
      setProduct(null);
      setLoading(false);
      setError(null);
    }
  }, [productId, categoryData, isOpen]);

  if (!isOpen) return null;

  const isCategory = !!categoryData && !productId;
  const filteredProducts = isCategory
    ? filterAndSortProducts(categoryData?.top_products || [], searchQuery, sortBy)
    : [];

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">
            {isCategory ? "📁 Kategoriya Tahlili" : "📊 Tez Tahlil"}
          </h3>
          <button
            onClick={onClose}
            className="btn btn-sm btn-ghost"
          >
            ✕
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Product Analysis */}
            {product && !isCategory && (
              <div className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Score */}
                  <div className="stat bg-base-200 rounded-lg p-3">
                    <div className="stat-title text-xs">Score</div>
                    <div className="stat-value text-lg text-primary">
                      {product.score.toFixed(2)}
                    </div>
                  </div>

                  {/* Weekly Bought */}
                  <div className="stat bg-base-200 rounded-lg p-3">
                    <div className="stat-title text-xs">Haftalik</div>
                    <div className="stat-value text-lg text-success">
                      {product.weekly_bought != null ? product.weekly_bought.toLocaleString() : "--"}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="stat bg-base-200 rounded-lg p-3 col-span-2">
                    <div className="stat-title text-xs">Narx</div>
                    <div className="stat-value text-lg">
                      {Math.floor(product.sell_price).toLocaleString()}
                    </div>
                    <div className="stat-desc text-xs">so'm</div>
                  </div>

                  {/* Trend */}
                  <div className="stat bg-base-200 rounded-lg p-3 col-span-2">
                    <div className="stat-title text-xs">Trend</div>
                    <div className="stat-value text-lg">
                      {product.trend || "—"}
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div className="stat bg-base-200 rounded-lg p-3 col-span-2">
                    <div className="stat-title text-xs">So'nggi yangilash</div>
                    <div className="stat-desc text-xs">
                      {new Date(product.last_updated).toLocaleString("uz-UZ")}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <a
                    href={`https://ventra.uz/analyze?productId=${product.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm flex-1"
                  >
                    Batafsil
                  </a>
                  <button
                    onClick={onClose}
                    className="btn btn-outline btn-sm flex-1"
                  >
                    Yopish
                  </button>
                </div>
              </div>
            )}

            {/* Category Analysis */}
            {isCategory && categoryData && (
              <div className="space-y-4">
                {/* Category Header */}
                <div className="bg-base-200 rounded-lg p-3">
                  <div className="text-sm font-semibold mb-1">{categoryData.category_title}</div>
                  <div className="text-xs text-base-content/70 flex justify-between">
                    <span>⭐ {categoryData.avg_score.toFixed(1)}</span>
                    <span>📦 {categoryData.product_count} mahsulot</span>
                  </div>
                </div>

                {/* Advanced Filters */}
                <AdvancedFilters
                  onSearchChange={setSearchQuery}
                  onSortChange={setSortBy}
                  resultCount={filteredProducts.length}
                />

                {/* Top Products Grid */}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((prod) => (
                      <div key={prod.product_id} className="bg-base-200 rounded-lg p-2 text-xs">
                        <div className="font-medium line-clamp-2">{prod.title}</div>
                        <div className="text-base-content/70 mt-1 flex justify-between">
                          <span>⭐ {prod.score.toFixed(1)}</span>
                          <span>💰 {Math.floor(prod.sell_price).toLocaleString()}so'm</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-base-content/60">
                      Mahsulot topilmadi
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <a
                    href={`https://ventra.uz/discovery`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm flex-1"
                  >
                    Batafsil
                  </a>
                  <button
                    onClick={onClose}
                    className="btn btn-outline btn-sm flex-1"
                  >
                    Yopish
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Backdrop */}
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="submit" />
      </form>
    </dialog>
  );
}
