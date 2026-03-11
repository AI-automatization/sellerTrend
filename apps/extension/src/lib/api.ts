import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
  type JwtTokenPayload,
} from "./storage";

const BASE_URL = process.env.PLASMO_PUBLIC_API_URL;

// ── Internal fetch wrapper ───────────────────────────────────

interface FetchOptions {
  method?: string;
  body?: unknown;
  skipAuth?: boolean;
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, skipAuth = false } = opts;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Cache-busting for GET requests
  let url = `${BASE_URL}${path}`;
  if (method === "GET") {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}_t=${Date.now()}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !skipAuth && !path.includes("/auth/")) {
    // Attempt token refresh
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...opts, skipAuth: false });
    }
    await clearTokens();
    throw new ApiError(401, "Unauthorized — session expired");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (data as Record<string, string>).message ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

// ── Token refresh ────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) return false;

      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
      };
      await setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// ── Error class ──────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Public API methods ───────────────────────────────────────

export interface LoginResult {
  access_token: string;
  refresh_token: string;
  account_id: string;
  status: string;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  const data = await apiFetch<LoginResult>("/auth/login", {
    method: "POST",
    body: { email, password },
    skipAuth: true,
  });
  await setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    await apiFetch("/auth/logout", {
      method: "POST",
      body: { refresh_token: refreshToken },
    }).catch(() => {
      // Ignore logout API errors — we clear tokens anyway
    });
  }
  await clearTokens();
}

export interface QuickScoreResult {
  score: number;
  weekly_bought: number | null;
  trend: string | null;
  sell_price: number;
  last_updated: string;
}

export async function quickScore(productId: string): Promise<QuickScoreResult> {
  return apiFetch<QuickScoreResult>(`/uzum/product/${productId}/quick-score`);
}

export interface BatchQuickScoreItem {
  product_id: string;
  found: boolean;
  score?: number;
  weekly_bought?: number | null;
  sell_price?: string;
  photo_url?: string;
  title?: string;
}

export async function batchQuickScore(
  productIds: string[],
): Promise<{ results: BatchQuickScoreItem[] }> {
  return apiFetch<{ results: BatchQuickScoreItem[] }>("/uzum/batch-quick-score", {
    method: "POST",
    body: { product_ids: productIds },
  });
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  account_id: string;
}

export async function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/profile");
}

// ── Track / Tracked products ─────────────────────────────────

export async function trackProduct(productId: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/products/${productId}/track`, {
    method: "POST",
  });
}

export interface TrackedProductItem {
  product_id: string;
  is_active: boolean;
  product?: {
    title?: string;
    score?: number | null;
    photo_url?: string | null;
    sell_price?: string | null;
    weekly_bought?: number | null;
  };
}

export async function getTrackedProducts(): Promise<TrackedProductItem[]> {
  return apiFetch<TrackedProductItem[]>("/products");
}

// ── Categories ───────────────────────────────────────────────

export interface CategoryItem {
  category_id: string;
  category_title: string;
  product_count: number;
  avg_score: number;
  top_products: Array<{
    product_id: string;
    title: string;
    score: number;
    weekly_bought: number | null;
    sell_price: number;
  }>;
}

export async function getTopCategories(): Promise<CategoryItem[]> {
  return apiFetch<CategoryItem[]>("/leaderboard/public/categories");
}

export { tryRefreshToken, isTokenExpired, BASE_URL };
