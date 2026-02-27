// Test: does Uzum HTML contain __NEXT_DATA__ with products?
const url = 'https://uzum.uz/ru/category/makiyazh--10091';

async function test() {
  console.log('Fetching:', url);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
    }
  });

  console.log('Status:', res.status, res.statusText);
  console.log('Content-Type:', res.headers.get('content-type'));

  if (!res.ok) {
    const body = await res.text();
    console.error('Error body:', body.slice(0, 500));
    return;
  }

  const html = await res.text();
  console.log('HTML size:', html.length, 'chars');

  // Find __NEXT_DATA__
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    console.log('❌ __NEXT_DATA__ NOT found in HTML');
    // Check if it's a different format
    if (html.includes('__NEXT_DATA__')) {
      console.log('  → __NEXT_DATA__ string exists but regex failed');
    }
    if (html.includes('window.__') ) {
      const win = html.match(/window\.__\w+/g);
      console.log('  → window.__ vars:', win?.slice(0, 5));
    }
    // Save HTML for inspection
    const { writeFileSync } = await import('fs');
    writeFileSync('tools/uzum-page.html', html);
    console.log('Saved HTML to tools/uzum-page.html');
    return;
  }

  console.log('✅ __NEXT_DATA__ found!');
  let nextData;
  try {
    nextData = JSON.parse(match[1]);
  } catch (e) {
    console.error('JSON parse error:', e.message);
    return;
  }

  console.log('\n--- Structure ---');
  console.log('Top keys:', Object.keys(nextData));
  console.log('Props keys:', Object.keys(nextData.props || {}));
  console.log('PageProps keys:', Object.keys(nextData.props?.pageProps || {}));

  const pageProps = nextData.props?.pageProps;

  // React-Query dehydrated state (most common in Next.js apps)
  if (pageProps?.dehydratedState?.queries) {
    const queries = pageProps.dehydratedState.queries;
    console.log('\n--- React-Query dehydratedState ---');
    console.log('Queries count:', queries.length);
    queries.forEach((q, i) => {
      const key = JSON.stringify(q.queryKey || q.queryHash || i);
      const data = q.state?.data;
      if (!data) return;
      const items = data?.makeSearch?.items ?? data?.products ?? data?.items ?? null;
      if (items) {
        console.log(`Query ${i} [${key.slice(0, 60)}]: items=${items.length}`);
        if (items.length > 0) {
          const first = items[0];
          console.log('  First item keys:', Object.keys(first));
          const card = first?.catalogCard ?? first;
          console.log('  Card keys:', Object.keys(card));
        }
      } else {
        console.log(`Query ${i} [${key.slice(0, 60)}]: data keys=${Object.keys(data).join(', ')}`);
      }
    });
  }

  // Direct pageProps data
  if (pageProps?.initialData || pageProps?.products || pageProps?.data) {
    console.log('\n--- Direct pageProps data ---');
    const d = pageProps.initialData ?? pageProps.data ?? pageProps;
    const items = d?.products ?? d?.items ?? d?.makeSearch?.items ?? null;
    console.log('Items found:', items?.length ?? 'none');
  }

  // Save for manual inspection
  const { writeFileSync } = await import('fs');
  writeFileSync('tools/nextdata-dump.json', JSON.stringify(nextData, null, 2));
  console.log('\nFull __NEXT_DATA__ saved to tools/nextdata-dump.json');
}

test().catch(console.error);
