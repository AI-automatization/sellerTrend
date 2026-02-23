export function setMetaTags(title: string, description: string, ogImage?: string) {
  document.title = title;

  function upsertMeta(attr: string, value: string, content: string) {
    let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, value);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  if (ogImage) upsertMeta('property', 'og:image', ogImage);
}
