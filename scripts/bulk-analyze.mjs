// Bulk analyze: 10 accounts × 20 URLs each = 200 analyses
const API = 'http://localhost:3000/api/v1';

const USERS = [
  { email: 'sardor@namangan-tech.uz', password: 'Test123!', name: 'Namangan Tech Hub' },
  { email: 'bobur@andijon-foods.uz', password: 'Test123!', name: 'Andijon Foods' },
  { email: 'sherzod@buxoro-cosmetics.uz', password: 'Test123!', name: 'Buxoro Cosmetics' },
  { email: 'jasur@samarkand-fashion.uz', password: 'Test123!', name: 'Samarkand Fashion' },
  { email: 'malika@toshkent-electronics.uz', password: 'Test123!', name: 'Toshkent Electronics' },
  { email: 'pw-test-1771887471690@test.uz', password: 'Test123!', name: 'PW Test 1' },
  { email: 'pw-test-1771881239631@test.uz', password: 'Test123!', name: 'PW Test 2' },
  { email: 'pw-test-1771881211323@test.uz', password: 'Test123!', name: 'PW Test 3' },
  { email: 'demo@uzum-trend.uz', password: 'Demo123!', name: 'Demo Sotuvchi' },
  { email: 'admin@uzum-trend.uz', password: 'Admin123!', name: 'Super Admin' },
];

// 200 URLs from mahsulot.md — 20 per account
const ALL_URLS = [
  // Account 1: Namangan Tech (Smartfonlar + Elektronika)
  'https://uzum.uz/ru/product/smartfon-samsung-galaxy-1494443',
  'https://uzum.uz/ru/product/smartfon-samsung-galaxy-a56-5g-8256-1618755',
  'https://uzum.uz/ru/product/smartfon-samsung-galaxy-a54-5g-8128-711150',
  'https://uzum.uz/ru/product/smartfon-samsung-galaxy-s24-fe-256-1749559',
  'https://uzum.uz/ru/product/apple-smartfon-iphone-bezhevyj---11-1952593',
  'https://uzum.uz/ru/product/smartfon-xiaomi-poco-1704941',
  'https://uzum.uz/ru/product/smartfon-tecno-spark-chernyj---1-1972796',
  'https://uzum.uz/ru/product/smartfon-infinix-hot-1875105',
  'https://uzum.uz/ru/product/smartfon-asus-rog-757621',
  'https://uzum.uz/ru/product/smartfon-asus-rog-phone-7-global-848658',
  'https://uzum.uz/ru/product/igrovoj-telefon-tecno-2021268',
  'https://uzum.uz/ru/product/planshet-samsung-galaxy-1462027',
  'https://uzum.uz/ru/product/fleshkarta-micro-sd-2481632-gb-316816',
  'https://uzum.uz/ru/product/telesufler-pronstoor-dlya-1007610',
  'https://uzum.uz/ru/product/mnogofunkcionalnyj-lazernyj-printer-307799',
  'https://uzum.uz/ru/product/besprovodnye-naushniki-tnue-717601',
  'https://uzum.uz/ru/product/igrovye-naushniki-noutbuk-planshet-gejmerov-605581',
  'https://uzum.uz/ru/product/besprovodnye-kompyuternye-naushniki-895464',
  'https://uzum.uz/ru/product/provodnye-naushniki-cherez-871102',
  'https://uzum.uz/ru/product/besprovodnye-naushniki-lenovo-852041',

  // Account 2: Andijon Foods (Naushnik + Maishiy texnika)
  'https://uzum.uz/ru/product/besprovodnye-naushniki-sportivnye-1098782',
  'https://uzum.uz/ru/product/Provodnoj-naushnik-s-183266',
  'https://uzum.uz/ru/product/besprovodnye-naushniki-sportivnye-1138093',
  'https://uzum.uz/ru/product/besprovodnye-naushniki-s-1247358',
  'https://uzum.uz/ru/product/muzhskie-naruchnye-chasy-rezinovye-sportivnye-1221490',
  'https://uzum.uz/ru/product/moyuschij-pylesos-dlya-1304414',
  'https://uzum.uz/ru/product/ciklonnyj-filtr-dlya-pylesosa-240311',
  'https://uzum.uz/ru/product/pylesos-lg-vc73189-884630',
  'https://uzum.uz/ru/product/umnyj-robot-pylesos-1059984',
  'https://uzum.uz/ru/product/pylesos-dlya-avtomobilya-1269110',
  'https://uzum.uz/ru/product/umnyj-robotpylesos-dreame-trouver-e20-pro-1369753',
  'https://uzum.uz/ru/product/pylesos-samsung-powerpro-1800673',
  'https://uzum.uz/ru/product/portativnyj-besprovodnoj-minipylesos-1562047',
  'https://uzum.uz/ru/product/moschnyj-pylesos-3600-1155250',
  'https://uzum.uz/ru/product/besprovodnoj-pylesos-portativnyj-1040935',
  'https://uzum.uz/ru/product/ochistitel-vozdukha-ultrafiolet-338432',
  'https://uzum.uz/ru/product/mobilnyj-kondicioner-ice-322601',
  'https://uzum.uz/ru/product/zaschitnyj-ekran-dlya-kondicionera-554382',
  'https://uzum.uz/product/blender-dlya-smuzi-i-koktejl-400-731913',
  'https://uzum.uz/product/pylesos-ferre-vc-1108c-seryj-753547',

  // Account 3: Buxoro Cosmetics (Kiyim + Beauty)
  'https://uzum.uz/ru/product/butsy-sorokonozhki-882946',
  'https://uzum.uz/ru/product/zhenskaya-obuv-1011001',
  'https://uzum.uz/ru/product/stilnye-kurtki-bez-rukavov-dlya-zhenschin-1318628',
  'https://uzum.uz/ru/product/platki-zhenskie-826310',
  'https://uzum.uz/ru/product/zhenskaya-sportivnaya-futbolka-1033048',
  'https://uzum.uz/ru/product/zhenskaya-sumka-s-krugloj-ruchkoj-i-chernyj---1-599801',
  'https://uzum.uz/ru/product/pryamougolnaya-sumka-krossbodi-1882635',
  'https://uzum.uz/ru/product/sumka-dorozhnaya-zhenskaya-bordovyj---263-746985',
  'https://uzum.uz/ru/product/povsednevnaya-kvadratnaya-zhenskaya-2240403',
  'https://uzum.uz/ru/product/kosushka-426515',
  'https://uzum.uz/ru/product/naturalnyj-kremdezodorant-zaschita-1854760',
  'https://uzum.uz/ru/product/uspokaivayuschij-krem-s-belyj---5-1728522',
  'https://uzum.uz/ru/product/uvlazhnyayuschij-krem-dlya-1061117',
  'https://uzum.uz/ru/product/krem-dlya-ukhoda-1728204',
  'https://uzum.uz/ru/product/uvlazhnyayuschij-krem-dlya-1006427',
  'https://uzum.uz/ru/product/krem-dlya-lica-1206520',
  'https://uzum.uz/ru/product/bystrodejstvuyuschij-feromon-parfyum-bagrovyj---12-1875503',
  'https://uzum.uz/ru/product/ochischayuschij-kremgel-cerave-844712',
  'https://uzum.uz/ru/product/ellipticheskij-trenazher-velolyzhi-1235088',
  'https://uzum.uz/product/karandash-dlya-brovej-678128',

  // Account 4: Samarkand Fashion (Kitoblar + Kiyim)
  'https://uzum.uz/ru/product/kniga-solutions-preintermediate-tim-falla-563175',
  'https://uzum.uz/ru/product/ingliz-tili-grammatikasi-806632',
  'https://uzum.uz/ru/product/nozimzhon-khoshimzhon-allokhning-1116356',
  'https://uzum.uz/ru/product/novaya-detskaya-enciklopediya-836689',
  'https://uzum.uz/ru/product/detskie-knizhki-razvivayuschie-1246886',
  'https://uzum.uz/ru/product/razvivayuschie-aktivitiknigi-s-naklejkami-6-rozovyj---16-1712190',
  'https://uzum.uz/ru/product/poznavatelnye-i-razvivayuschie-432139',
  'https://uzum.uz/ru/product/knizhka-detskaya-knigatrenazhyor-1497924',
  'https://uzum.uz/product/ayollar-koylagi-519981',
  'https://uzum.uz/product/zhenskaya-tunika-265179',
  'https://uzum.uz/product/yubka-zhenskaya-541468',
  'https://uzum.uz/product/zhenskaya-kofta-s-ryushkami--525167',
  'https://uzum.uz/product/zhenskij-vyazanyj-udlinennyj-762907',
  'https://uzum.uz/product/dzhoggery-zhenskie-selfie-788367',
  'https://uzum.uz/product/ayollar-uchun-libos-fn079-596661',
  'https://uzum.uz/product/tolstovka-mma-139472',
  'https://uzum.uz/product/zhenskie-krossovki-644016',
  'https://uzum.uz/product/krossovki-muzhskie-687745',
  'https://uzum.uz/product/tufli-muzhskie-m-715476',
  'https://uzum.uz/product/suniy-teridan-tikilgan-past-poyabzal-96962',

  // Account 5: Toshkent Electronics (Bolalar + O'yinchoq + Kitob)
  'https://uzum.uz/ru/product/kubik-rubik-3-1038047',
  'https://uzum.uz/ru/product/russkoyazychnaya-i-obuchayuschaya-863982',
  'https://uzum.uz/ru/product/detskaya-razvivayuschaya-myagkaya-943497',
  'https://uzum.uz/ru/product/bolshaya-kniga-dlya-218597',
  'https://uzum.uz/ru/product/detskij-velosiped-velomax-20-909-936867',
  'https://uzum.uz/ru/product/velosiped-977063',
  'https://uzum.uz/product/Bolalar-golf-toplami-255201',
  'https://uzum.uz/product/Yogoch-tetris-Montessori-36098',
  'https://uzum.uz/product/Bolalar-uchun-magnit-169981',
  'https://uzum.uz/product/igrushka-podushka-edinorog-s-krylyami-249439',
  'https://uzum.uz/product/konstruktor-lego-creator-off-road-buggy-31123-418055',
  'https://uzum.uz/product/konstruktor-lego-minecraftthe-frozen-peaks-21243-418105',
  'https://uzum.uz/product/bolalar-uchun-aqlli-761368',
  'https://uzum.uz/product/detskie-noski-s-555985',
  'https://uzum.uz/product/100-iq-muammo-kitob-oyini-3-44-bet-334438',
  'https://uzum.uz/product/cant-hurt-me-david-goggins-773158',
  'https://uzum.uz/product/kitob-klub-meri-shelli-moldavski-goldi-522128',
  'https://uzum.uz/product/Odatnoma-2-kitob-26912',
  'https://uzum.uz/product/detskie-knizhki-razvivayuschie-432060',
  'https://uzum.uz/product/ayol-erkaklar-khakida-568782',

  // Account 6: PW Test 1 (Sport + Zaryadka + Aksessuar)
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
  'https://uzum.uz/product/yoga-uchun-top-pushti---16-694175',
  'https://uzum.uz/product/massaj-gilam-1141562',
  'https://uzum.uz/product/akupunkturnyj-massazhnyj-kovrik-691835',
  'https://uzum.uz/product/utolschennyj-kovrik-dlya-637761',
  'https://uzum.uz/product/Avtomobil-uchun-telefon-raqami-124431',

  // Account 7: PW Test 2 (Uy + Oshxona)
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

  // Account 8: PW Test 3 (Parfyum + Salomatlik + Telefon aksessuar)
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

  // Account 9: Demo Sotuvchi (Bolalar + Beauty + Bayram)
  'https://uzum.uz/uz/product/kop-marta-ishlatiladigan-podguzniklar-oq---5-1734243',
  'https://uzum.uz/uz/product/pcalm-yuz-uchun-zardoblar-binafsha---130-2385282',
  'https://uzum.uz/uz/product/sanoq-chop-hisoblash-tayoqchalari-toplami-pushti---16-1563985',
  'https://uzum.uz/product/akvarelnyj-nabor-luch-198533',
  'https://uzum.uz/uz/product/uzum-naqshi-bilan-fuksiya---15-1684138',
  'https://uzum.uz/uz/product/romol-ayollar-uchun-mango---117-1810563',
  'https://uzum.uz/uz/product/mahsulotni-suratga-olish-1076676',
  'https://uzum.uz/uz/product/geldan-kop-martalik-tirnoqlar-kumush-rang---4-1503765',
  'https://uzum.uz/uz/product/stepler-10-0229-deli-oq---5-1124271',
  'https://uzum.uz/uz/product/ayollar-uchun-top-qora---1-606195',
  'https://uzum.uz/product/Erkaklar-etiklari-SIOUX-292610',
  'https://uzum.uz/uz/product/uzuklar-toplami-788882',
  'https://uzum.uz/uz/product/yuz-niqoblari-laym---122-1302252',
  'https://uzum.uz/uz/product/1-yillik-kop-1649640',
  'https://uzum.uz/product/Yangi-yil-tabriknomasi-174754',
  'https://uzum.uz/uz/product/oyin-toplami-fast-food-1187274',
  'https://uzum.uz/product/premium-daftar-a4f-463366',
  'https://uzum.uz/product/saundbar-s-provodnymi-148471',
  'https://uzum.uz/product/Pablosky-qizlar-uchun-poyabzal-865008-114014',
  'https://uzum.uz/product/televizor-vesta-32-smart-tv-v32lh4300-645951',

  // Account 10: Super Admin (Avto + misc)
  'https://uzum.uz/ru/product/zadnie-fary-dlya-cobalt-461740',
  'https://uzum.uz/ru/product/otdel-prodazh-s-1322463',
  'https://uzum.uz/ru/product/magnitnyj-ellipticheskij-trenazher-880837',
  'https://uzum.uz/ru/product/magnitnyj-ellipticheskij-trenazher-880809',
  'https://uzum.uz/product/1500980',
  'https://uzum.uz/product/1076537',
  'https://uzum.uz/product/1260451',
  'https://uzum.uz/product/1314652',
  'https://uzum.uz/product/1678363',
  'https://uzum.uz/product/1909172',
  'https://uzum.uz/product/1774838',
  'https://uzum.uz/product/1629981',
  'https://uzum.uz/product/1673675',
  'https://uzum.uz/product/1080184',
  'https://uzum.uz/product/1455010',
  'https://uzum.uz/product/ayollar-ichki-kiyimlari-toplami-547009',
  'https://uzum.uz/product/smes-molochnaya-nuppi-f-3-s-54766',
  'https://uzum.uz/product/Quruq-sut-aralashmasi-172276',
  'https://uzum.uz/product/tirnagich-oyinchoq-mushuk-uchun-3-ta-topi-551418',
  'https://uzum.uz/product/1141562',
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
  const data = await res.json();
  return data.access_token;
}

async function analyze(token, url) {
  const res = await fetch(`${API}/uzum/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, status: res.status, error: err, url };
  }
  const data = await res.json();
  return { ok: true, title: data.title || data.product_id || '?', url };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`Starting bulk analyze: ${USERS.length} accounts × 20 URLs = ${ALL_URLS.length} total\n`);

  let totalOk = 0, totalFail = 0;

  for (let i = 0; i < USERS.length; i++) {
    const user = USERS[i];
    const urls = ALL_URLS.slice(i * 20, (i + 1) * 20);

    console.log(`\n[${'='.repeat(60)}]`);
    console.log(`Account ${i + 1}/10: ${user.name} (${user.email})`);
    console.log(`URLs: ${urls.length}`);

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
      const url = urls[j];
      try {
        const result = await analyze(token, url);
        if (result.ok) {
          ok++;
          console.log(`  [${j + 1}/20] OK: ${result.title}`);
        } else {
          fail++;
          console.log(`  [${j + 1}/20] FAIL (${result.status}): ${url}`);
        }
      } catch (e) {
        fail++;
        console.log(`  [${j + 1}/20] ERROR: ${e.message}`);
      }
      // Small delay to avoid rate limiting
      await sleep(300);
    }

    console.log(`  Result: ${ok} OK, ${fail} FAIL`);
    totalOk += ok;
    totalFail += fail;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`DONE: ${totalOk} OK, ${totalFail} FAIL out of ${ALL_URLS.length} total`);
}

main().catch(console.error);
