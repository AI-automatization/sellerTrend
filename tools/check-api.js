const https = require('https');

const options = {
  hostname: 'api.uzum.uz',
  path: '/api/v2/product/118279',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Origin': 'https://uzum.uz',
    'Referer': 'https://uzum.uz/',
    'Accept': 'application/json',
  },
};

https.get(options, (res) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    const d = data && data.payload && data.payload.data;
    if (!d) {
      console.log('NO DATA');
      return;
    }
    console.log('=== ASOSIY FIELDLAR ===');
    console.log('ordersAmount (lifetime):', d.ordersAmount);
    console.log('rOrdersAmount (weekly):', d.rOrdersAmount);
    console.log('reviewsAmount:', d.reviewsAmount);
    console.log('rating:', d.rating);
    console.log('title:', d.title);
    console.log();
    console.log('=== SKU LIST ===');
    (d.skuList || []).forEach((sku) => {
      console.log(
        '  SKU', sku.id,
        ': purchasePrice=', sku.purchasePrice,
        'fullPrice=', sku.fullPrice,
        'availableAmount=', sku.availableAmount,
        'stockType=', sku.stock && sku.stock.type,
      );
    });
    console.log();
    console.log('=== ACTIONS ===');
    console.log('actions:', JSON.stringify(d.actions));
    console.log();
    console.log('=== SELLER ===');
    const s = d.seller || {};
    console.log('seller.id:', s.id);
    console.log('seller.title:', s.title);
    console.log('seller.orders:', s.orders);
    console.log();

    // Check all top-level keys for anything related to orders
    console.log('=== ALL TOP-LEVEL KEYS ===');
    console.log(Object.keys(d).join(', '));
    console.log();

    // Print any key containing "order" or "week" or "bought"
    console.log('=== ORDER/WEEK RELATED FIELDS ===');
    for (const key of Object.keys(d)) {
      if (/order|week|bought|recent|amount/i.test(key)) {
        console.log(`  ${key}:`, d[key]);
      }
    }
  });
}).on('error', (e) => console.error('Error:', e.message));
