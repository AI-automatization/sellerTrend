import { useEffect, useState } from "react";
import { sendToBackground } from "@plasmohq/messaging";
import type { QuickScoreResponseBody } from "~/background/messages/quick-score";
import type { UzumProductData } from "~/lib/uzum-api";
import type { CategoryItem } from "~/lib/api";
import AdvancedFilters from "./AdvancedFilters";
import CategoryInsights from "./CategoryInsights";
import CompetitorAnalysis from "./CompetitorAnalysis";
import PriceHistory from "./PriceHistory";
import ProductNotes from "./ProductNotes";
import { recordPriceSnapshot } from "~/lib/storage";

interface QuickAnalysisModalProps {
  productId: string | null;
  categoryData: CategoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  prefetchedData?: QuickScoreResponseBody | null;
}

interface ProductDetail {
  id: string;
  score: number | null;
  weekly_bought: number | null;
  trend: string | null;
  sell_price: number;
  last_updated: string | null;
  // uzum.uz fallback fields
  title?: string;
  rating?: number;
  reviewsAmount?: number;
  ordersAmount?: number;
  totalAvailableAmount?: number;
  sellerTitle?: string;
  categoryTitle?: string;
  photoUrl?: string | null;
  fromUzum?: boolean;
}

// Extract uzum.uz fields for ProductDetail
function uzumFields(u: UzumProductData) {
  return {
    title: u.title,
    rating: u.rating,
    reviewsAmount: u.reviewsAmount,
    ordersAmount: u.ordersAmount,
    totalAvailableAmount: u.totalAvailableAmount,
    sellerTitle: u.sellerTitle,
    categoryTitle: u.categoryTitle,
    photoUrl: u.photoUrl,
  };
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

function applyResponse(
  res: QuickScoreResponseBody,
  productId: string,
  setProduct: (p: ProductDetail) => void,
  setError: (e: string) => void
) {
  if (res.success && res.data) {
    const price = res.data.sell_price;
    recordPriceSnapshot(productId, price).catch(() => {});
    setProduct({
      id: productId,
      score: res.data.score,
      weekly_bought: res.data.weekly_bought,
      trend: res.data.trend,
      sell_price: price,
      last_updated: res.data.last_updated,
      ...(res.uzumData ? uzumFields(res.uzumData) : {}),
    });
  } else if (res.success && res.uzumData) {
    const u = res.uzumData;
    recordPriceSnapshot(productId, u.purchasePrice).catch(() => {});
    setProduct({
      id: productId,
      score: null,
      weekly_bought: null,
      trend: null,
      sell_price: u.purchasePrice,
      last_updated: null,
      ...uzumFields(u),
      fromUzum: true,
    });
  } else {
    setError("Ma'lumot yuklanmadi");
  }
}

export default function QuickAnalysisModal({
  productId,
  categoryData,
  isOpen,
  onClose,
  prefetchedData,
}: QuickAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "price-asc" | "price-desc" | "weekly">("score");
  const [activeTab, setActiveTab] = useState<"analysis" | "competitors">("analysis");

  useEffect(() => {
    if (!isOpen) {
      setProduct(null);
      setSearchQuery("");
      setSortBy("score");
      setActiveTab("analysis");
      return;
    }

    // Product analysis mode
    if (productId) {
      // Use pre-fetched data if available (avoids popup focus-loss timing issue)
      if (prefetchedData) {
        setLoading(false);
        setError(null);
        applyResponse(prefetchedData, productId, setProduct, setError);
        return;
      }

      // Fallback: fetch directly (pre-fetch not ready yet)
      setLoading(true);
      setError(null);

      sendToBackground<{ productId: string }, QuickScoreResponseBody>({
        name: "quick-score",
        body: { productId },
      })
        .then((res) => applyResponse(res, productId, setProduct, setError))
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
  }, [productId, categoryData, isOpen, prefetchedData]);

  if (!isOpen) return null;

  const isCategory = !!categoryData && !productId;
  const filteredProducts = isCategory
    ? filterAndSortProducts(categoryData?.top_products || [], searchQuery, sortBy)
    : [];

  return (
    <dialog
      className="modal modal-open"
      onCancel={(e) => e.preventDefault()}
    >
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
                {/* Tabs */}
                <div className="tabs tabs-boxed bg-base-200 p-1">
                  <button
                    className={`tab tab-sm ${activeTab === "analysis" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("analysis")}
                  >
                    📊 Tahlil
                  </button>
                  <button
                    className={`tab tab-sm ${activeTab === "competitors" ? "tab-active" : ""}`}
                    onClick={() => setActiveTab("competitors")}
                  >
                    🏆 Raqobatchilar
                  </button>
                </div>

                {/* Analysis Tab Content */}
                {activeTab === "analysis" && (
                  <>
                    {/* uzum.uz fallback notice */}
                    {product.fromUzum && (
                      <div className="alert alert-info py-2 text-xs">
                        <span>⚠️ VENTRA bazasida yo'q — uzum.uz ma'lumotlari ko'rsatilmoqda</span>
                      </div>
                    )}

                    {/* Product title (from uzum) */}
                    {product.title && (
                      <div className="text-sm font-medium line-clamp-2 bg-base-200 rounded-lg p-2">
                        {product.title}
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                  {/* Score */}
                  <div className="stat bg-base-200 rounded-lg p-3">
                    <div className="stat-title text-xs">Score</div>
                    <div className="stat-value text-lg text-primary">
                      {product.score != null ? product.score.toFixed(2) : "--"}
                    </div>
                  </div>

                  {/* Weekly Bought or Total Orders */}
                  <div className="stat bg-base-200 rounded-lg p-3">
                    <div className="stat-title text-xs">
                      {product.fromUzum ? "Buyurtmalar" : "Haftalik"}
                    </div>
                    <div className="stat-value text-lg text-success">
                      {product.fromUzum
                        ? (product.ordersAmount ?? 0).toLocaleString()
                        : product.weekly_bought != null
                          ? product.weekly_bought.toLocaleString()
                          : "--"}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="stat bg-base-200 rounded-lg p-3 col-span-2">
                    <div className="stat-title text-xs">Narx</div>
                    <div className="stat-value text-lg">
                      {product.sell_price != null ? Math.floor(product.sell_price).toLocaleString() : "--"}
                    </div>
                    <div className="stat-desc text-xs">so'm</div>
                  </div>

                  {/* Rating (uzum) or Trend (ventra) */}
                  {product.fromUzum ? (
                    <>
                      <div className="stat bg-base-200 rounded-lg p-3">
                        <div className="stat-title text-xs">Reyting</div>
                        <div className="stat-value text-lg text-warning">
                          ⭐ {product.rating?.toFixed(1) ?? "--"}
                        </div>
                        <div className="stat-desc text-xs">{product.reviewsAmount ?? 0} sharh</div>
                      </div>
                      <div className="stat bg-base-200 rounded-lg p-3">
                        <div className="stat-title text-xs">Ombor</div>
                        <div className="stat-value text-lg">
                          {(product.totalAvailableAmount ?? 0).toLocaleString()}
                        </div>
                        <div className="stat-desc text-xs">dona</div>
                      </div>
                    </>
                  ) : (
                    <div className="stat bg-base-200 rounded-lg p-3 col-span-2">
                      <div className="stat-title text-xs">Trend</div>
                      <div className="stat-value text-lg">
                        {product.trend || "—"}
                      </div>
                    </div>
                  )}

                  {/* Seller (uzum) or Last Updated (ventra) */}
                  {product.fromUzum ? (
                    <div className="stat bg-base-200 rounded-lg p-3 col-span-2">
                      <div className="stat-title text-xs">Sotuvchi</div>
                      <div className="stat-desc text-xs">{product.sellerTitle || "--"}</div>
                    </div>
                  ) : (
                    <div className="stat bg-base-200 rounded-lg p-3 col-span-2">
                      <div className="stat-title text-xs">So'nggi yangilash</div>
                      <div className="stat-desc text-xs">
                        {product.last_updated ? new Date(product.last_updated).toLocaleString("uz-UZ") : "--"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price History */}
                <div className="border-t pt-3">
                  <PriceHistory productId={product.id} currentPrice={product.sell_price} />
                </div>

                {/* Favorites & Notes */}
                <div className="border-t pt-3">
                  <ProductNotes productId={product.id} />
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
                  </>
                )}

                {/* Competitors Tab Content */}
                {activeTab === "competitors" && (
                  <CompetitorAnalysis
                    product={product}
                    maxPrice={product.sell_price}
                  />
                )}

                {/* Close in competitors tab too */}
                {activeTab === "competitors" && (
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
                )}
              </div>
            )}

            {/* Category Analysis */}
            {isCategory && categoryData && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {/* Category Title */}
                <div>
                  <h4 className="font-semibold text-sm">{categoryData.category_title}</h4>
                </div>

                {/* Category Insights */}
                <CategoryInsights category={categoryData} />

                {/* Divider */}
                <div className="divider my-2" />

                {/* Top Products Section */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Top Mahsulotlar</h4>

                  {/* Advanced Filters */}
                  <AdvancedFilters
                    onSearchChange={setSearchQuery}
                    onSortChange={setSortBy}
                    resultCount={filteredProducts.length}
                  />

                  {/* Top Products List */}
                  <div className="space-y-2 mt-2">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.slice(0, 5).map((prod) => (
                        <div key={prod.product_id} className="bg-base-200 rounded-lg p-2 text-xs">
                          <div className="font-medium line-clamp-2">{prod.title}</div>
                          <div className="text-base-content/70 mt-1 flex justify-between">
                            <span>⭐ {prod.score != null ? prod.score.toFixed(1) : "--"}</span>
                            <span>💰 {prod.sell_price != null ? Math.floor(prod.sell_price).toLocaleString() : "--"}so'm</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-base-content/60">
                        Mahsulot topilmadi
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
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

      {/* Modal Backdrop — only closes when not loading */}
      <div
        className="modal-backdrop"
        onClick={(e) => {
          if (!loading && e.target === e.currentTarget) {
            onClose();
          }
        }}
      />
    </dialog>
  );
}
