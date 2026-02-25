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

    // Check badges
    console.log('=== BADGES ===');
    console.log(JSON.stringify(d.badges, null, 2));
    console.log();

    // Check volumeDiscount
    console.log('=== VOLUME DISCOUNT ===');
    console.log(JSON.stringify(d.volumeDiscount, null, 2));
    console.log();

    // Check fastDeliveryInfo
    console.log('=== FAST DELIVERY INFO ===');
    console.log(JSON.stringify(d.fastDeliveryInfo, null, 2));
    console.log();

    // Check returnsInfo
    console.log('=== RETURNS INFO ===');
    console.log(JSON.stringify(d.returnsInfo, null, 2));
    console.log();

    // Check comments/topFeedback
    console.log('=== TOP FEEDBACK ===');
    if (d.topFeedback) {
      console.log('Length:', d.topFeedback.length);
    } else {
      console.log('null');
    }
    console.log();

    // Check bonusProduct
    console.log('=== BONUS PRODUCT ===');
    console.log(JSON.stringify(d.bonusProduct, null, 2));
    console.log();

    // Check totalAvailableAmount
    console.log('=== TOTAL AVAILABLE ===');
    console.log('totalAvailableAmount:', d.totalAvailableAmount);
    console.log();

    // Check SKU details more thoroughly
    console.log('=== FULL SKU DATA ===');
    (d.skuList || []).forEach((sku) => {
      console.log(JSON.stringify(sku, null, 2));
    });
    console.log();

    // Check tags
    console.log('=== TAGS ===');
    console.log(JSON.stringify(d.tags, null, 2));
    console.log();

    // Print ALL keys and their types/short values
    console.log('=== ALL FIELDS (type + short value) ===');
    for (const key of Object.keys(d)) {
      const val = d[key];
      const type = typeof val;
      if (type === 'object' && val !== null) {
        if (Array.isArray(val)) {
          console.log(`  ${key}: Array[${val.length}]`);
        } else {
          console.log(`  ${key}: Object{${Object.keys(val).join(', ')}}`);
        }
      } else {
        console.log(`  ${key}: ${type} = ${val}`);
      }
    }

    // Check description for weekly text
    console.log();
    console.log('=== DESCRIPTION (first 500 chars) ===');
    console.log(typeof d.description === 'string' ? d.description.slice(0, 500) : JSON.stringify(d.description)?.slice(0, 500));

    // Also check the raw payload for any other top-level keys
    console.log();
    console.log('=== PAYLOAD TOP-LEVEL KEYS ===');
    console.log(Object.keys(data.payload).join(', '));
  });
}).on('error', (e) => console.error('Error:', e.message));
