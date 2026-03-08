import { useI18n } from '../../i18n/I18nContext';

interface ProductSearchCardProps {
  product: {
    id: number;
    productId?: number;
    title: string;
    sellPrice?: number;
    fullPrice?: number;
    minSellPrice?: number;
    rating?: number;
    ordersAmount?: number;
    ordersQuantity?: number;
    reviewsAmount?: number;
    availableAmount?: number;
    photoUrl?: string;
    photos?: string[];
    categoryTitle?: string;
    badges?: Array<{ text?: string; type?: string }>;
  };
  isTracked: boolean;
  onTrack: (id: number) => void;
  isTrackLoading?: boolean;
  onClick?: (id: number) => void;
}

const PRICE_FORMATTER = new Intl.NumberFormat('ru-RU');

function formatPrice(price: number): string {
  return PRICE_FORMATTER.format(price);
}

function getPhotoUrl(product: ProductSearchCardProps['product']): string | undefined {
  if (product.photoUrl) return product.photoUrl;
  if (product.photos && product.photos.length > 0) return product.photos[0];
  return undefined;
}

export function ProductSearchCard({
  product,
  isTracked,
  onTrack,
  isTrackLoading = false,
  onClick,
}: ProductSearchCardProps) {
  const { t } = useI18n();
  const uzumId = product.productId ?? product.id;
  const photo = getPhotoUrl(product);
  const orders = product.ordersQuantity ?? product.ordersAmount;
  const sellPrice = product.sellPrice;
  const fullPrice = product.fullPrice;
  const hasDiscount = fullPrice != null && sellPrice != null && fullPrice > sellPrice;

  function handleClick() {
    onClick?.(uzumId);
  }

  function handleTrack(e: React.MouseEvent) {
    e.stopPropagation();
    onTrack(uzumId);
  }

  return (
    <div className="card bg-base-200/60 border border-base-300/50 hover:border-primary/30 hover:shadow-lg transition-all duration-200">
      <div className="card-body p-4 gap-3">
        {/* Product image */}
        {photo ? (
          <figure
            className="rounded-lg overflow-hidden bg-base-300/30 aspect-square cursor-pointer"
            onClick={handleClick}
          >
            <img
              src={photo}
              alt={product.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </figure>
        ) : (
          <div
            className="rounded-lg bg-base-300/30 aspect-square flex items-center justify-center cursor-pointer"
            onClick={handleClick}
          >
            <svg
              className="w-10 h-10 text-base-content/15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
        )}

        {/* Category badge */}
        {product.categoryTitle && (
          <span className="badge badge-ghost badge-sm text-xs truncate max-w-full">
            {product.categoryTitle}
          </span>
        )}

        {/* Title */}
        <h3
          className="font-semibold text-sm leading-snug line-clamp-2 cursor-pointer hover:text-primary transition-colors"
          onClick={handleClick}
          title={product.title}
        >
          {product.title}
        </h3>

        {/* Stats row */}
        <div className="flex flex-wrap gap-2 text-xs text-base-content/50">
          {product.rating != null && product.rating > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {product.rating.toFixed(1)}
            </span>
          )}
          {orders != null && orders > 0 && (
            <span>
              {t('search.orders')}: {orders.toLocaleString()}
            </span>
          )}
          {product.reviewsAmount != null && product.reviewsAmount > 0 && (
            <span>
              {t('search.reviews')}: {product.reviewsAmount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Stock badge */}
        {product.availableAmount != null && (
          <div>
            {product.availableAmount > 0 ? (
              <span className="badge badge-success badge-sm gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t('search.inStock')}
              </span>
            ) : (
              <span className="badge badge-error badge-sm gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t('search.outOfStock')}
              </span>
            )}
          </div>
        )}

        {/* Price + Track button */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div>
            {sellPrice != null && sellPrice > 0 ? (
              <div>
                <span className="font-bold text-base tabular-nums">
                  {formatPrice(sellPrice)}{' '}
                  <span className="text-xs font-normal text-base-content/40">
                    {t('common.som')}
                  </span>
                </span>
                {hasDiscount && (
                  <span className="block text-xs text-base-content/30 line-through tabular-nums">
                    {formatPrice(fullPrice)}
                  </span>
                )}
              </div>
            ) : product.minSellPrice != null && product.minSellPrice > 0 ? (
              <span className="font-bold text-base tabular-nums">
                {t('search.from')} {formatPrice(product.minSellPrice)}{' '}
                <span className="text-xs font-normal text-base-content/40">
                  {t('common.som')}
                </span>
              </span>
            ) : (
              <span className="text-sm text-base-content/30">{t('search.noPrice')}</span>
            )}
          </div>
          <button
            onClick={handleTrack}
            disabled={isTrackLoading || isTracked}
            className={`btn btn-sm gap-1 ${
              isTracked ? 'btn-success' : 'btn-outline btn-primary'
            }`}
          >
            {isTrackLoading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : isTracked ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
            {isTracked ? t('search.tracked') : t('search.track')}
          </button>
        </div>

        {/* Discount badge */}
        {hasDiscount && (
          <span className="badge badge-warning badge-sm">
            -{Math.round(((fullPrice - sellPrice) / fullPrice) * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
