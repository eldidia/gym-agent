// scripts/download-equipment-images.js
// מוריד תמונות מ-Wikipedia ושומר אותן ב-public/equipment/
// מריץ: node scripts/download-equipment-images.js

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR = path.join(__dirname, '..', 'public', 'equipment');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const ITEMS = [
  { key: 'squat_rack',     wiki: 'Power rack' },
  { key: 'smith',          wiki: 'Smith machine' },
  { key: 'leg_press',      wiki: 'Leg press' },
  { key: 'leg_ext',        wiki: 'Leg extension (exercise)' },
  { key: 'leg_curl',       wiki: 'Leg curl' },
  { key: 'hack_squat',     wiki: 'Hack squat' },
  { key: 'abductor',       wiki: 'Hip abduction' },
  { key: 'calf_raise',     wiki: 'Calf raise' },
  { key: 'bench_flat',     wiki: 'Bench press' },
  { key: 'bench_incline',  wiki: 'Incline press' },
  { key: 'pec_deck',       wiki: 'Pec deck' },
  { key: 'cable_cross',    wiki: 'Cable machine' },
  { key: 'lat_pulldown',   wiki: 'Lat pulldown' },
  { key: 'seated_row',     wiki: 'Seated row' },
  { key: 'back_ext',       wiki: 'Hyperextension (exercise)' },
  { key: 'pullup_bar',     wiki: 'Pull-up (exercise)' },
  { key: 'shoulder_press', wiki: 'Overhead press' },
  { key: 'rear_delt',      wiki: 'Reverse fly' },
  { key: 'lateral_raise',  wiki: 'Shoulder fly' },
  { key: 'preacher_curl',  wiki: 'Preacher curl' },
  { key: 'tricep_push',    wiki: 'Triceps pushdown' },
  { key: 'treadmill',      wiki: 'Treadmill' },
  { key: 'elliptical',     wiki: 'Elliptical trainer' },
  { key: 'bike',           wiki: 'Stationary bicycle' },
  { key: 'rowing_m',       wiki: 'Rowing machine' },
  { key: 'stair',          wiki: 'Stair climbing' },
  { key: 'ab_machine',     wiki: 'Abdominal exercise' },
  { key: 'dumbbell_rack',  wiki: 'Dumbbell' },
  { key: 'barbell_area',   wiki: 'Barbell' },
  { key: 'dip_station',    wiki: 'Dip (exercise)' },
  { key: 'cable_rotate',   wiki: 'Woodchop (exercise)' },
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'GymAgent-ImageDownloader/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function getWikiImageUrl(title) {
  const api = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
  const raw  = await get(api);
  const data = JSON.parse(raw.toString());
  const page = Object.values(data.query.pages)[0];
  return page?.thumbnail?.source || null;
}

async function downloadOne(item) {
  const dest = path.join(OUT_DIR, item.key + '.jpg');
  if (fs.existsSync(dest)) { console.log(`⏭  skip  ${item.key}`); return; }
  try {
    const url = await getWikiImageUrl(item.wiki);
    if (!url) { console.log(`⚠️  no img ${item.key}`); return; }
    const data = await get(url);
    fs.writeFileSync(dest, data);
    console.log(`✅  saved  ${item.key}`);
  } catch (e) {
    console.log(`❌  error  ${item.key}: ${e.message}`);
  }
}

(async () => {
  console.log(`Downloading ${ITEMS.length} images to ${OUT_DIR}\n`);
  for (const item of ITEMS) {
    await downloadOne(item);
    await new Promise(r => setTimeout(r, 200)); // be polite to Wikipedia
  }
  console.log('\nDone ✓');
})();
