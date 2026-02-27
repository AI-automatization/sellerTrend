export interface ExternalItem {
  title: string;
  price: string;
  source: string;
  link: string;
  image: string;
  store: string;
}

export const MAX_SCORE = 10;

export const SOURCE_META: Record<string, { label: string; flag: string; color: string }> = {
  EBAY:          { label: 'eBay',          flag: '\uD83D\uDED2', color: 'badge-warning' },
  JOOM:          { label: 'Joom',          flag: '\uD83C\uDF0D', color: 'badge-primary' },
  BANGGOOD:      { label: 'Banggood',      flag: '\uD83D\uDECD\uFE0F', color: 'badge-accent' },
  SHOPEE:        { label: 'Shopee',        flag: '\uD83D\uDED2', color: 'badge-success' },
  ALIBABA:       { label: 'Alibaba',       flag: '\uD83C\uDDE8\uD83C\uDDF3', color: 'badge-secondary' },
  ALIEXPRESS:    { label: 'AliExpress',    flag: '\uD83D\uDECD\uFE0F', color: 'badge-error' },
  DHGATE:        { label: 'DHgate',        flag: '\uD83C\uDFEA', color: 'badge-accent' },
  MADE_IN_CHINA: { label: 'MadeInChina',   flag: '\uD83C\uDFED', color: 'badge-neutral' },
  SERPAPI:        { label: 'Google',        flag: '\uD83D\uDD0D', color: 'badge-info' },
};
