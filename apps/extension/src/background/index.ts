import { getAccessToken, isTokenExpired } from "~/lib/storage";
import { tryRefreshToken } from "~/lib/api";
import { setBadgeError, setBadgeLoggedOut } from "~/lib/badge";

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
    }
  }
});

// ── Install event ────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await setBadgeLoggedOut();
});
