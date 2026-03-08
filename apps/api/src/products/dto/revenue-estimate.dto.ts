/** Revenue estimate response — returned by GET /products/:id/revenue-estimate */
export interface RevenueEstimateResponse {
  product_id: string;
  title: string;
  sell_price: number | null;
  weekly_bought: number | null;

  estimated_monthly_revenue: number | null;
  estimated_margin: number | null;
  margin_rate: number;

  competition_level: 'low' | 'medium' | 'high';
  competitors_in_category: number;

  recommendation: string;
  score: number | null;
}
