const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TOTAL_SLIDES = 12;
const SLIDE_DURATION = 15; // секунд на слайд (12 × 15 = 3 минуты)
const WIDTH  = 1080;
const HEIGHT = 1920;
const OUTPUT = path.join(__dirname, 'AppTochite_shorts.mp4');
const TMP    = path.join(__dirname, '_frames');

async function main() {
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true });
  fs.mkdirSync(TMP);

  console.log('Запускаю браузер...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  const htmlFile = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
  await page.goto(htmlFile, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  for (let i = 1; i <= TOTAL_SLIDES; i++) {
    await page.evaluate((n) => window.go(n), i);
    await new Promise(r => setTimeout(r, 600)); // ждём transition

    const file = path.join(TMP, `slide_${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: file });
    console.log(`  Слайд ${i}/${TOTAL_SLIDES} → ${path.basename(file)}`);
  }

  await browser.close();
  console.log('Скриншоты готовы. Собираю видео...');

  // ffmpeg concat list
  const listPath = path.join(TMP, 'list.txt');
  let list = '';
  for (let i = 1; i <= TOTAL_SLIDES; i++) {
    const f = path.join(TMP, `slide_${String(i).padStart(2, '0')}.png`).replace(/\\/g, '/');
    list += `file '${f}'\nduration ${SLIDE_DURATION}\n`;
  }
  // последний кадр повторяем без duration (требование concat demuxer)
  const last = path.join(TMP, `slide_${String(TOTAL_SLIDES).padStart(2, '0')}.png`).replace(/\\/g, '/');
  list += `file '${last}'\n`;
  fs.writeFileSync(listPath, list);

  const cmd = [
    'ffmpeg -y',
    `-f concat -safe 0 -i "${listPath.replace(/\\/g, '/')}"`,
    `-vf scale=${WIDTH}:${HEIGHT}`,
    `-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p`,
    `-movflags +faststart`,
    `"${OUTPUT.replace(/\\/g, '/')}"`,
  ].join(' ');

  execSync(cmd, { stdio: 'inherit' });

  fs.rmSync(TMP, { recursive: true });
  console.log(`\nГотово! Видео: ${OUTPUT}`);
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
