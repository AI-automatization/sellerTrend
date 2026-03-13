export type HotkeyAction = "toggle-overlay" | "toggle-favorite";

/**
 * Register global hotkeys for the product page overlay.
 * Returns a cleanup function to remove the listener.
 *
 * Ctrl+Shift+T — toggle overlay visibility
 * Ctrl+Shift+S — toggle favorite for current product
 */
export function registerHotkeys(handler: (action: HotkeyAction) => void): () => void {
  function onKeyDown(e: KeyboardEvent) {
    if (!e.ctrlKey || !e.shiftKey) return;

    const key = e.key.toUpperCase();

    if (key === "T") {
      e.preventDefault();
      handler("toggle-overlay");
    } else if (key === "S") {
      e.preventDefault();
      handler("toggle-favorite");
    }
  }

  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}
