const https = require('https');

// Check multiple products to confirm rOrdersAmount is always rounded lifetime total
const productIds = [118279, 100000, 50000, 200000];

function fetchProduct(id) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.uzum.uz',
      path: '/api/v2/product/' + id,
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
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          const d = data && data.payload && data.payload.data;
          resolve(d);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  for (const id of productIds) {
    const d = await fetchProduct(id);
    if (!d) {
      console.log(`Product ${id}: NOT FOUND`);
      continue;
    }
    const diff = d.ordersAmount - d.rOrdersAmount;
    const pct = d.ordersAmount > 0 ? ((diff / d.ordersAmount) * 100).toFixed(1) : 'N/A';
    console.log(
      `Product ${id}: ordersAmount=${d.ordersAmount}, rOrdersAmount=${d.rOrdersAmount}, diff=${diff} (${pct}%), totalAvail=${d.totalAvailableAmount}, actions=${JSON.stringify(d.actions)}`
    );
  }
}

main().catch(console.error);
