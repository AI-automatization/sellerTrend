import { getAccessToken, isTokenExpired } from "~/lib/storage";
import { tryRefreshToken } from "~/lib/api";
import { setBadgeError, setBadgeLoggedOut } from "~/lib/badge";
import { notify } from "~/lib/notifications";

export {};

// ── Alarms ───────────────────────────────────────────────────

const ALARM_TOKEN_REFRESH = "ventra-token-refresh";

chrome.alarms.create(ALARM_TOKEN_REFRESH, { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_TOKEN_REFRESH) return;

  const token = await getAccessToken();
  if (!token) return; // Not logged in — skip

  if (isTokenExpired(token)) {
    const ok = await tryRefreshToken();
    if (!ok) {
      await setBadgeError();
      notify({
        type: "logout",
        title: "VENTRA — Sessiya tugadi",
        message: "Tokenni yangilab bo'lmadi. Qayta kiring.",
      }).catch(() => {});
    }
  }
});

// ── Notification click → open dashboard ─────────────────────

const DASHBOARD_URL =
  process.env.PLASMO_PUBLIC_API_URL?.replace("/api/v1", "") ??
  "http://localhost:5173";

chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
  chrome.tabs.create({ url: DASHBOARD_URL });
});

// ── Install event ────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await setBadgeLoggedOut();
});
