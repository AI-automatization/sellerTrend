import { Storage } from "@plasmohq/storage";

const storage = new Storage({ area: "local" });

const KEYS = {
  ACCESS_TOKEN: "ventra_access_token",
  REFRESH_TOKEN: "ventra_refresh_token",
  FAVORITES: "ventra_favorites",
  NOTES: "ventra_notes",
  PRICE_HISTORY: "ventra_price_history",
} as const;

export async function getAccessToken(): Promise<string | null> {
  return (await storage.get(KEYS.ACCESS_TOKEN)) ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await storage.get(KEYS.REFRESH_TOKEN)) ?? null;
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await storage.set(KEYS.ACCESS_TOKEN, accessToken);
  await storage.set(KEYS.REFRESH_TOKEN, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await storage.remove(KEYS.ACCESS_TOKEN);
  await storage.remove(KEYS.REFRESH_TOKEN);
}

// ── JWT helpers ──────────────────────────────────────────────

export interface JwtTokenPayload {
  sub: string;
  email: string;
  role: string;
  account_id: string;
  exp: number;
  iat?: number;
}

export function decodeToken(token: string): JwtTokenPayload | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as JwtTokenPayload;
    return payload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp < nowSec;
}

// ── Favorites & Notes ─────────────────────────────────────

export interface ProductNote {
  product_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export async function getFavorites(): Promise<string[]> {
  const favorites = (await storage.get(KEYS.FAVORITES)) ?? "[]";
  try {
    return JSON.parse(favorites) as string[];
  } catch {
    return [];
  }
}

export async function addFavorite(productId: string): Promise<void> {
  const favorites = await getFavorites();
  if (!favorites.includes(productId)) {
    favorites.push(productId);
    await storage.set(KEYS.FAVORITES, JSON.stringify(favorites));
  }
}

export async function removeFavorite(productId: string): Promise<void> {
  const favorites = await getFavorites();
  const updated = favorites.filter((id) => id !== productId);
  await storage.set(KEYS.FAVORITES, JSON.stringify(updated));
}

export async function isFavorite(productId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(productId);
}

export async function getNote(productId: string): Promise<ProductNote | null> {
  const notes = await getNotes();
  return notes.find((n) => n.product_id === productId) ?? null;
}

export async function getNotes(): Promise<ProductNote[]> {
  const notes = (await storage.get(KEYS.NOTES)) ?? "[]";
  try {
    return JSON.parse(notes) as ProductNote[];
  } catch {
    return [];
  }
}

export async function saveNote(productId: string, text: string): Promise<void> {
  const notes = await getNotes();
  const existingIndex = notes.findIndex((n) => n.product_id === productId);

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    notes[existingIndex] = {
      ...notes[existingIndex],
      text,
      updated_at: now,
    };
  } else {
    notes.push({
      product_id: productId,
      text,
      created_at: now,
      updated_at: now,
    });
  }

  await storage.set(KEYS.NOTES, JSON.stringify(notes));
}

export async function deleteNote(productId: string): Promise<void> {
  const notes = await getNotes();
  const updated = notes.filter((n) => n.product_id !== productId);
  await storage.set(KEYS.NOTES, JSON.stringify(updated));
}

// ── Price History ─────────────────────────────────────────

export interface PriceSnapshot {
  price: number;
  timestamp: string; // ISO string
}

async function getAllPriceHistory(): Promise<Record<string, PriceSnapshot[]>> {
  const raw = (await storage.get(KEYS.PRICE_HISTORY)) ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, PriceSnapshot[]>;
  } catch {
    return {};
  }
}

export async function getPriceHistory(productId: string): Promise<PriceSnapshot[]> {
  const all = await getAllPriceHistory();
  return all[productId] ?? [];
}

export async function recordPriceSnapshot(productId: string, price: number): Promise<void> {
  if (price == null || isNaN(price) || price <= 0) return;
  const all = await getAllPriceHistory();
  const history = all[productId] ?? [];

  // Skip if same day and same price already recorded
  const lastEntry = history[history.length - 1];
  const today = new Date().toDateString();
  if (lastEntry && new Date(lastEntry.timestamp).toDateString() === today && lastEntry.price === price) {
    return;
  }

  history.push({ price, timestamp: new Date().toISOString() });

  // Keep last 30 entries
  if (history.length > 30) history.splice(0, history.length - 30);

  all[productId] = history;
  await storage.set(KEYS.PRICE_HISTORY, JSON.stringify(all));
}

export { KEYS, storage };
