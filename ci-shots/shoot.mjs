// フェーズ14の画面確認(一時的なもの。main には入れない)
// iPhone(WebKit)・Android(Chrome)・パソコン(Chrome)で、主な機能を一通り動かして撮る
import { chromium, webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173/did-todo/';
const PROFILES = [
  { name: 'iphone', engine: webkit, device: devices['iPhone 13'] },
  { name: 'android', engine: chromium, device: devices['Pixel 7'] },
  { name: 'pc', engine: chromium, device: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } },
];

for (const profile of PROFILES) {
  const OUT = `ci-shots/out/${profile.name}`;
  mkdirSync(OUT, { recursive: true });
  const log = (...a) => console.log(`[${profile.name}]`, ...a);
  const browser = await profile.engine.launch();
  const context = await browser.newContext({ ...profile.device, locale: 'ja-JP', timezoneId: 'Asia/Tokyo' });
  const page = await context.newPage();
  page.on('pageerror', (e) => log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') log('CONSOLE', m.text()); });
  const shot = async (name, fullPage = false) => { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage }); };
  const step = async (label, fn) => { try { await fn(); log('ok  ', label); } catch (e) { log('FAIL', label, e.message.split('\n')[0]); await shot(`fail-${label}`); } };

  await step('はじめにが出る', async () => {
    await page.goto(BASE);
    await page.waitForSelector('.intro', { timeout: 15000 });
    await shot('01-intro', true);
  });
  await step('人格を登録する', async () => {
    await page.click('.intro >> text=人格を登録する');
    await page.fill('.field >> input[type=text]', '人格A');
    await page.click('button.primary >> text=保存');
    await page.waitForSelector('text=人格A');
    await page.click('text=‹ 戻る');
    await page.click('text=＋ 人格を追加');
    await page.fill('.field >> input[type=text]', '人格B');
    await page.click('button.primary >> text=保存');
    await page.click('text=‹ 戻る');
    await shot('02-alters');
  });
  await step('呼び方をメンバーにする', async () => {
    await page.click('label.choice >> text=メンバー');
    await page.waitForSelector('.tab-bar >> text=メンバー情報');
    await page.waitForSelector('text=＋ メンバーを追加');
    await shot('03-term-member', true);
  });
  await step('自分で入力の呼び方', async () => {
    await page.click('label.choice >> text=自分で入力');
    await page.fill('.term-form input', 'みんな');
    await page.click('.term-form >> text=保存');
    await page.waitForSelector('.tab-bar >> text=みんな情報');
    await page.click('label.choice >> text=メンバー');
    await page.waitForSelector('.tab-bar >> text=メンバー情報');
  });
  await step('服薬タブの注記', async () => {
    await page.click('.tab-bar >> text=服薬');
    await page.waitForSelector('.medical-notice');
    await shot('04-medication');
  });
  await step('交代の記録', async () => {
    await page.click('.switch-button');
    await page.click('.picker-button >> text=人格A');
    await page.click('.choice-button >> text=今');
    await page.click('.tag-chip >> text=音');
    await page.click('text=記録する');
    await page.waitForSelector('.switch-toast');
    await page.click('.tab-bar >> text=メンバー情報');
    await page.click('text=交代の記録を見る');
    await page.waitForSelector('text=メンバーごと');
    await shot('05-switch-log', true);
  });
  await step('このアプリについて', async () => {
    await page.click('text=‹ 戻る');
    await page.click('button.add-button >> text=このアプリについて');
    await page.waitForSelector('text=版:');
    await shot('06-about', true);
    await page.click('text=‹ 戻る');
  });
  await step('全員分のPDF', async () => {
    await page.evaluate(() => { window.print = () => {}; });
    await page.click('text=全員分をPDFに');
    await page.emulateMedia({ media: 'print' });
    await shot('07-print-all', true);
    await page.emulateMedia({ media: 'screen' });
  });
  await browser.close();
}
console.log('done');
