/**
 * Uzum.uz public API client.
 * Used as fallback when VENTRA backend has no data for a product.
 * No auth required — api.uzum.uz is public.
 */

export interface UzumProductData {
  id: number;
  title: string;
  rating: number;
  reviewsAmount: number;
  ordersAmount: number;
  totalAvailableAmount: number;
  purchasePrice: number;
  fullPrice: number;
  sellerTitle: string;
  categoryTitle: string;
  photoUrl: string | null;
}

export async function fetchUzumProduct(
  productId: string
): Promise<UzumProductData | null> {
  try {
    const res = await fetch(
      `https://api.uzum.uz/api/v2/product/${productId}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;

    const json = await res.json();
    const data = json?.payload?.data;
    if (!data) return null;

    const sku = data.skuList?.[0];
    const photoUrl: string | null =
      data.photos?.[0]?.photo?.["240"]?.high ?? null;

    return {
      id: data.id,
      title: data.title ?? "",
      rating: data.rating ?? 0,
      reviewsAmount: data.reviewsAmount ?? 0,
      ordersAmount: data.ordersAmount ?? 0,
      totalAvailableAmount: data.totalAvailableAmount ?? 0,
      purchasePrice: sku?.purchasePrice ?? 0,
      fullPrice: sku?.fullPrice ?? 0,
      sellerTitle: data.seller?.title ?? "",
      categoryTitle: data.category?.title ?? "",
      photoUrl,
    };
  } catch {
    return null;
  }
}
