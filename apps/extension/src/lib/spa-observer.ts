/**
 * SPA navigation detection for Uzum.uz (Vue SPA).
 * Monkey-patches pushState/replaceState and uses MutationObserver.
 */

type UrlChangeCallback = (url: string) => void

/**
 * Listen for URL changes in a SPA.
 * Overrides history.pushState/replaceState and listens for popstate.
 * Returns a cleanup function.
 */
export function onUrlChange(callback: UrlChangeCallback): () => void {
  let lastUrl = window.location.href

  function check() {
    const currentUrl = window.location.href
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl
      callback(currentUrl)
    }
  }

  const origPush = history.pushState.bind(history)
  history.pushState = function (...args: Parameters<typeof origPush>) {
    origPush(...args)
    check()
  }

  const origReplace = history.replaceState.bind(history)
  history.replaceState = function (...args: Parameters<typeof origReplace>) {
    origReplace(...args)
    check()
  }

  window.addEventListener("popstate", check)

  return () => {
    history.pushState = origPush
    history.replaceState = origReplace
    window.removeEventListener("popstate", check)
  }
}

const CARD_SELECTOR = '[data-test-id="product-card--default"]'

/**
 * Observe DOM for newly added product cards (infinite scroll).
 * Calls callback with the new card elements.
 * Returns a cleanup function.
 */
export function onProductCardsAdded(
  callback: (newCards: Element[]) => void
): () => void {
  const seen = new WeakSet<Element>()

  // Mark existing cards as already seen
  document.querySelectorAll(CARD_SELECTOR).forEach((el) => seen.add(el))

  const observer = new MutationObserver(() => {
    const allCards = document.querySelectorAll(CARD_SELECTOR)
    const newCards: Element[] = []
    allCards.forEach((card) => {
      if (!seen.has(card)) {
        seen.add(card)
        newCards.push(card)
      }
    })
    if (newCards.length > 0) {
      callback(newCards)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  return () => observer.disconnect()
}
