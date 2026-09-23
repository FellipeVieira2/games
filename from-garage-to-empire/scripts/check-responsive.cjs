const { chromium } = require(process.env.PLAYWRIGHT_PATH);
const fs = require('node:fs');
fs.mkdirSync('.layout-check', { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  for (const [width, height] of JSON.parse(
    process.env.LAYOUT_SIZES || '[[320,568],[360,640],[667,375],[844,390],[768,1024],[1280,720]]',
  )) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:4180/');
    const fixture = await page.evaluate(async () => {
      const { newGame } = await import('/src/core/state.ts');
      const state = newGame();
      state.money = state.financial.baseline = 1000000;
      state.office = 2;
      state.employees = [1, 2, 3, 4, 5, 6].map((id) => ({ id, level: 10 }));
      state.reputation = 100;
      state.contractHistory = { landing: 10, restaurant: 10, shop: 10, app: 10 };
      state.completed = 40;
      return JSON.stringify(state);
    });
    await page.addInitScript(
      (data) => localStorage.setItem('garage-empire.save.v1', data),
      fixture,
    );
    await page.reload();
    await page.waitForSelector('[data-tab="team"]');
    for (const tab of ['company', 'team', 'upgrades', 'contracts', 'missions', 'more']) {
      await page.locator(`button[data-tab="${tab}"]`).click();
      await page.waitForTimeout(100);
      if (tab === 'company' || tab === 'team' || tab === 'more')
        await page.screenshot({ path: `.layout-check/${width}x${height}-${tab}.png` });
      const inspect = async (view) => {
        const clipped = await page.evaluate(() => {
          const out = [];
          for (const el of document.querySelectorAll('button,p,h2,h3,dt,dd')) {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height || el.closest('[hidden]') || !el.checkVisibility()) continue;
            let bad =
              r.right > innerWidth + 2 || r.bottom > innerHeight + 2 || r.left < -2 || r.top < -2;
            for (let a = el.parentElement; a; a = a.parentElement) {
              const c = getComputedStyle(a),
                b = a.getBoundingClientRect();
              if (c.overflowY === 'hidden' && (r.bottom > b.bottom + 2 || r.top < b.top - 2))
                bad = true;
            }
            if (bad)
              out.push({
                text: (el.textContent || '').trim().slice(0, 85),
                rect: { x: r.x, y: r.y, width: r.width, height: r.height },
                parent: el.parentElement.className,
              });
          }
          return out;
        });
        results.push({ width, height, tab: view, clipped, errors: [...errors] });
        fs.writeFileSync('.layout-check/results.json', JSON.stringify(results, null, 2));
      };
      await inspect(tab);
      for (let round = 0; round < 10; round++) {
        const next = page.locator('.content-pager button:last-child:enabled').first();
        if (!(await next.count())) break;
        await next.click();
        await inspect(tab + '-details-' + round);
      }
      if (tab === 'company') {
        await page.locator('[data-action="stages"]').click();
        await inspect('stages-dialog');
        await page.keyboard.press('Escape');
      }
      if (tab === 'team') {
        await page.locator('button[data-tab="team"]').click();
        const allocate = page.locator('[data-action="allocation"]:visible').first();
        if (await allocate.count()) {
          await allocate.click();
          await inspect('allocation-dialog');
          for (let n = 0; n < 8; n++) {
            const next = page.locator('#game-dialog .content-pager button:last-child:enabled');
            if (!(await next.count())) break;
            await next.click();
            await inspect('allocation-dialog-' + n);
          }
          await page.keyboard.press('Escape');
        }
        await page.locator('button[data-tab="team"]').click();
        for (
          let n = 0;
          n < 8 && !(await page.locator('[data-employee-view="training"]:visible').count());
          n++
        ) {
          await page.locator('.content-pager button:last-child:enabled:visible').first().click();
        }
        await page.locator('[data-employee-view="training"]:visible').first().click();
        await inspect('team-training');
        for (let n = 0; n < 8; n++) {
          const next = page.locator('.content-pager button:last-child:enabled:visible').first();
          if (!(await next.count())) break;
          await next.click();
          await inspect('team-training-' + n);
        }
        await page.locator('[data-team-view="hire"]').click();
        await inspect('team-hiring');
      }
      if (tab === 'contracts') {
        await page.locator('[data-business-view="contracts"]').click();
        await inspect('agency-contracts');
      }
      if (tab === 'more') {
        for (const view of ['recovery', 'movements', 'settings']) {
          await page.locator('.finance-switch [data-more-view="' + view + '"]').click();
          await inspect(view);
          for (let round = 0; round < 8; round++) {
            const next = page.locator('.content-pager button:last-child:enabled').first();
            if (!(await next.count())) break;
            await next.click();
            await inspect(view + '-details-' + round);
          }
        }
      }
    }
    await page.close();
  }
  fs.writeFileSync('.layout-check/results.json', JSON.stringify(results, null, 2));
  const failures = results.filter((r) => r.clipped.length || r.errors.length);
  console.log(JSON.stringify({ checked: results.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
