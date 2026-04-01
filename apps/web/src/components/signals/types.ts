// ── Signal data interfaces (mirror backend response shapes) ──

export interface CannibalizationPair {
  product_a_id: string;
  product_b_id: string;
  product_a_title: string;
  product_b_title: string;
  overlap_score: number;
  reason: string;
}

export interface DeadStockItem {
  product_id: string;
  title: string;
  risk_level: 'high' | 'medium' | 'low';
  risk_score: number;
  days_to_dead: number;
  factors: string[];
}

export interface SaturationData {
  category_id: number;
  saturation_index: number;
  level: 'oversaturated' | 'saturated' | 'moderate' | 'underserved';
  seller_count: number;
  avg_score: number;
  avg_weekly_sales: number;
  top10_share_pct: number;
}

export interface FlashSaleItem {
  product_id: string;
  title: string;
  price_drop_pct: number;
  old_price: number;
  new_price: number;
  detected_at: string;
}

export interface EarlySignalItem {
  product_id: string;
  title: string;
  momentum_score: number;
  days_since_first: number;
  sales_velocity: number;
  score_growth: number;
}

export interface StockCliffItem {
  product_id: string;
  title: string;
  current_velocity: number;
  estimated_days_left: number;
  severity: 'critical' | 'warning' | 'ok';
}

export interface RankingEntry {
  date: string;
  rank: number;
  score: number | null;
  weekly_bought: number;
  category_id: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export interface ChecklistData {
  id: string | null;
  title: string;
  items: ChecklistItem[];
}

export interface PriceTestItem {
  id: string;
  product_id: string;
  product_title: string;
  original_price: number;
  test_price: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  original_sales: number | null;
  test_sales: number | null;
  original_revenue: number;
  test_revenue: number;
  conclusion: string | null;
  created_at: string;
}

export interface ReplenishmentItem {
  product_id: string;
  title: string;
  avg_daily_sales: number;
  lead_time_days: number;
  safety_stock_days: number;
  reorder_point: number;
  suggested_order_qty: number;
  next_order_date: string;
}

import type React from 'react';

// ── Tab navigation types ──

export type Tab =
  | 'cannibalization'
  | 'dead-stock'
  | 'saturation'
  | 'flash-sales'
  | 'early-signals'
  | 'stock-cliffs'
  | 'ranking'
  | 'checklist'
  | 'price-test'
  | 'replenishment';

export interface TabConfig {
  key: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortLabel: string;
}

import {
  ScaleIcon,
  CubeIcon,
  ChartBarIcon,
  FireIcon,
  SparklesIcon,
  BellIcon,
  TrophyIcon,
  CheckIcon,
  CalculatorIcon,
  ServerStackIcon,
} from '../icons';

export const TABS: TabConfig[] = [
  { key: 'cannibalization', label: 'Ichki raqobat',         icon: ScaleIcon,         shortLabel: 'Ichki raqobat' },
  { key: 'dead-stock',      label: 'Qotib qolgan tovar',    icon: CubeIcon,          shortLabel: 'Qotib qolgan' },
  { key: 'saturation',      label: "To'yingan bozor",       icon: ChartBarIcon,      shortLabel: "To'yingan" },
  { key: 'flash-sales',     label: 'Keskin narx tushishi',  icon: FireIcon,          shortLabel: 'Keskin narx' },
  { key: 'early-signals',   label: 'Erta signal',           icon: SparklesIcon,      shortLabel: 'Erta signal' },
  { key: 'stock-cliffs',    label: 'Zaxira signali',        icon: BellIcon,          shortLabel: 'Zaxira' },
  { key: 'ranking',         label: 'Reyting',               icon: TrophyIcon,        shortLabel: 'Reyting' },
  { key: 'checklist',       label: 'Tekshirish',            icon: CheckIcon,         shortLabel: 'Tekshirish' },
  { key: 'price-test',      label: 'Narx testi',            icon: CalculatorIcon,    shortLabel: 'Narx testi' },
  { key: 'replenishment',   label: 'Zahira to\'ldirish',    icon: ServerStackIcon,   shortLabel: 'Zahira' },
];
