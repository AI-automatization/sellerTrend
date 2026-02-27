// Bulk analyze for 3 PW Test accounts × 20 URLs each
const API = 'http://localhost:3000/api/v1';

const USERS = [
  { email: 'pw-test-1771887471690@test.uz', password: 'Test123!', name: 'PW Test 1' },
  { email: 'pw-test-1771881239631@test.uz', password: 'Test123!', name: 'PW Test 2' },
  { email: 'pw-test-1771881211323@test.uz', password: 'Test123!', name: 'PW Test 3' },
];

const ALL_URLS = [
  // PW Test 1: Sport + Zaryadka + Aksessuar
  'https://uzum.uz/ru/product/velosiped-658758',
  'https://uzum.uz/ru/product/ellipticheskij-trenazher-skladnoj-1354406',
  'https://uzum.uz/ru/product/kovrik-dlya-fitnesa-sinij---125-1412983',
  'https://uzum.uz/ru/product/vinilovye-ganteli-dlya-1548641',
  'https://uzum.uz/ru/product/neoprenovye-i-vinilovye-ganteli-1818879',
  'https://uzum.uz/ru/product/adaptivnyj-trenazher-dlya-2194474',
  'https://uzum.uz/ru/product/komplekt-osvetitelnykh-priborov-1135326',
  'https://uzum.uz/ru/product/perednyaya-korzina-dlya-velosipeda-642086',
  'https://uzum.uz/ru/product/besprovodnaya-zaryadka-3-792834',
  'https://uzum.uz/ru/product/bystroe-zaryadnoe-ustrojstvo-1247527',
  'https://uzum.uz/ru/product/besprovodnaya-zaryadka-3-belyj---5-1344263',
  'https://uzum.uz/ru/product/kabel-dlya-bystroj-124016',
  'https://uzum.uz/ru/product/kovrik-dlya-myshi-24-20-sm-507259',
  'https://uzum.uz/ru/product/kovrik-dlya-myshi-24-20-sm-317247',
  'https://uzum.uz/ru/product/kovrik-dlya-myshi-1044190',
  'https://uzum.uz/uz/product/yoga-uchun-top-pushti---16-694175',
  'https://uzum.uz/product/akupunkturnyj-massazhnyj-kovrik-691835',
  'https://uzum.uz/product/utolschennyj-kovrik-dlya-637761',
  'https://uzum.uz/product/Avtomobil-uchun-telefon-raqami-124431',
  'https://uzum.uz/ru/product/magnitnyj-ellipticheskij-trenazher-880837',

  // PW Test 2: Uy + Oshxona
  'https://uzum.uz/ru/product/rolikovye-kryuchki-dlya-shtor-100-i-1558889',
  'https://uzum.uz/ru/product/kapkir-268-sm-kichik-1563900',
  'https://uzum.uz/ru/product/tarelka-zdorovogo-pitaniya--364940',
  'https://uzum.uz/ru/product/chashki-kofejnye-s-956942',
  'https://uzum.uz/ru/product/rychazhnye-maslenki-dlya-mashinnogo-masla-1060748',
  'https://uzum.uz/product/oshxona-qogoz-sochiq-673156',
  'https://uzum.uz/product/Oshxona-toplami-My-191663',
  'https://uzum.uz/product/ayollar--oshxona-526211',
  'https://uzum.uz/product/Yivli-oshxona-spatulasi-160940',
  'https://uzum.uz/product/Oshxona-Kukmara-anjomlari-244',
  'https://uzum.uz/product/tochilka-dlya-nozhej-447289',
  'https://uzum.uz/product/Oshxona-chotkasishimgich-132646',
  'https://uzum.uz/product/kop-funksiyali-qirgich-laym---122-1013485',
  'https://uzum.uz/product/koridor-va-kiyinish-716358',
  'https://uzum.uz/product/poyafzal-kiyimlar-ichki-754415',
  'https://uzum.uz/ru/product/kitajskij-zelenyj-chaj-1021010',
  'https://uzum.uz/ru/product/chaj-s-molokom-teh-tarik-1108158',
  'https://uzum.uz/ru/product/dzhem-makheev-apelsinovyj-stakan-400-g-169787',
  'https://uzum.uz/ru/product/kofe-zhokej-imper-sublimirovannyj-75-g-27133',
  'https://uzum.uz/product/nabor-chertezhnyj-globus-11539',

  // PW Test 3: Parfyum + Salomatlik + Telefon aksessuar
  'https://uzum.uz/product/santar-33-muzhskoj-i-zhenskij-parfyum-793273',
  'https://uzum.uz/product/erkaklar-uchun-parfyumlangan-474644',
  'https://uzum.uz/product/893186',
  'https://uzum.uz/product/antiseptik-hamda-parfyum-53982',
  'https://uzum.uz/product/Yuz-uchun-tungi-287002',
  'https://uzum.uz/product/sochlar-uchun-quruq-shampun-150-ml-736164',
  'https://uzum.uz/product/vitamin-d3-naturex-me-600-40-191279',
  'https://uzum.uz/product/227488',
  'https://uzum.uz/product/chekhol-dlya-poco-f5-720384',
  'https://uzum.uz/product/prozrachnyj-chekhol-dlya-644622',
  'https://uzum.uz/product/1637738',
  'https://uzum.uz/product/chekhol-dlya-noutbuka-264053',
  'https://uzum.uz/product/qattiq-xotira-noutbuk-787093',
  'https://uzum.uz/product/podstavka-dlya-noutbuka-deepcool-wind-pal-280648',
  'https://uzum.uz/product/ip-telefon-fanvil-x7a-601509',
  'https://uzum.uz/product/smartfon-ajib-x1-1176929',
  'https://uzum.uz/product/besprovodnoj-mini-termoprinter-721107',
  'https://uzum.uz/product/chekhol-selektora-skorosti-698003',
  'https://uzum.uz/product/pult-signalizaciya-magicar-295469',
  'https://uzum.uz/product/noutbuk-huawei-matebook-572692',
];

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${err}`);
  }
  return (await res.json()).access_token;
}

async function analyze(token, url) {
  const res = await fetch(`${API}/uzum/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, status: res.status, error: err, url };
  }
  const data = await res.json();
  return { ok: true, title: data.title || data.product_id || '?', url };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`PW Test accounts: ${USERS.length} × 20 URLs = ${ALL_URLS.length}\n`);
  let totalOk = 0, totalFail = 0;

  for (let i = 0; i < USERS.length; i++) {
    const user = USERS[i];
    const urls = ALL_URLS.slice(i * 20, (i + 1) * 20);
    console.log(`\nAccount ${i + 1}/3: ${user.name} (${user.email})`);

    let token;
    try {
      token = await login(user.email, user.password);
      console.log(`  Login OK`);
    } catch (e) {
      console.error(`  LOGIN FAILED: ${e.message}`);
      totalFail += urls.length;
      continue;
    }

    let ok = 0, fail = 0;
    for (let j = 0; j < urls.length; j++) {
      try {
        const result = await analyze(token, urls[j]);
        if (result.ok) { ok++; console.log(`  [${j+1}/20] OK: ${result.title}`); }
        else { fail++; console.log(`  [${j+1}/20] FAIL (${result.status}): ${urls[j]}`); }
      } catch (e) { fail++; console.log(`  [${j+1}/20] ERROR: ${e.message}`); }
      await sleep(300);
    }
    console.log(`  Result: ${ok} OK, ${fail} FAIL`);
    totalOk += ok; totalFail += fail;
  }
  console.log(`\nDONE: ${totalOk} OK, ${totalFail} FAIL out of ${ALL_URLS.length}`);
}
main().catch(console.error);
