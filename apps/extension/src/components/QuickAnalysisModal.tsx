import { useEffect, useState } from "react";
import { sendToBackground } from "@plasmohq/messaging";
import type { QuickScoreResponseBody } from "~/background/messages/quick-score";

interface QuickAnalysisModalProps {
  productId: string | null;
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

export default function QuickAnalysisModal({ productId, isOpen, onClose }: QuickAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !productId) {
      setProduct(null);
      return;
    }

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
  }, [productId, isOpen]);

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">📊 Tez Tahlil</h3>
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
        {product && !loading && (
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
      </div>

      {/* Modal Backdrop */}
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button type="submit" />
      </form>
    </dialog>
  );
}
