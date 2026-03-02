export async function setBadgeLoggedOut(): Promise<void> {
  await chrome.action.setBadgeText({ text: "" });
}

export async function setBadgeError(): Promise<void> {
  await chrome.action.setBadgeText({ text: "!" });
  await chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
}

export async function setBadgeCount(count: number): Promise<void> {
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#6366F1" });
}
