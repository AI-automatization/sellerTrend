import { storage } from "./storage"

const STORAGE_KEY = "ventra_notifications_enabled"
const ICON_URL = "icon.png"

export type NotificationType = "track_success" | "track_error" | "login" | "logout" | "price_alert"

interface NotifyOptions {
  type: NotificationType
  title: string
  message: string
  /** URL to open on click */
  url?: string
}

// ── Preferences ─────────────────────────────────────────────

export async function getNotificationsEnabled(): Promise<boolean> {
  const val = await storage.get(STORAGE_KEY)
  // Default: enabled
  return val !== "false"
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await storage.set(STORAGE_KEY, String(enabled))
}

// ── Show notification ───────────────────────────────────────

export async function notify(opts: NotifyOptions): Promise<string | undefined> {
  const enabled = await getNotificationsEnabled()
  if (!enabled) return undefined

  const notificationId = `ventra_${opts.type}_${Date.now()}`

  return new Promise<string>((resolve) => {
    chrome.notifications.create(
      notificationId,
      {
        type: "basic",
        iconUrl: chrome.runtime.getURL(ICON_URL),
        title: opts.title,
        message: opts.message,
        priority: 1,
      },
      (id) => resolve(id),
    )
  })
}

// ── Preset helpers ──────────────────────────────────────────

export function notifyTrackSuccess(productTitle?: string): Promise<string | undefined> {
  const title = "Mahsulot kuzatilmoqda"
  const message = productTitle
    ? `"${productTitle}" kuzatuv ro'yxatiga qo'shildi`
    : "Mahsulot kuzatuv ro'yxatiga qo'shildi"
  return notify({ type: "track_success", title, message })
}

export function notifyTrackError(reason?: string): Promise<string | undefined> {
  return notify({
    type: "track_error",
    title: "Kuzatishda xatolik",
    message: reason ?? "Mahsulotni kuzatib bo'lmadi. Qayta urinib ko'ring.",
  })
}

export function notifyLogin(email: string): Promise<string | undefined> {
  return notify({
    type: "login",
    title: "VENTRA — Tizimga kirildi",
    message: `${email} sifatida kirildi`,
  })
}

export function notifyLogout(): Promise<string | undefined> {
  return notify({
    type: "logout",
    title: "VENTRA — Chiqildi",
    message: "Tizimdan muvaffaqiyatli chiqildi",
  })
}

export function notifyPriceAlert(
  productTitle: string,
  oldPrice: number,
  newPrice: number,
): Promise<string | undefined> {
  const diff = oldPrice - newPrice
  const pct = Math.round((diff / oldPrice) * 100)
  return notify({
    type: "price_alert",
    title: `Narx tushdi! -${pct}%`,
    message: `${productTitle}: ${oldPrice.toLocaleString()} → ${newPrice.toLocaleString()} so'm`,
  })
}
