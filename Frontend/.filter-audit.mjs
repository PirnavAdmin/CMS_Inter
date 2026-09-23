import { createServer } from 'vite';
import { puppeteer } from 'file:///C:/Users/ADMIN/AppData/Local/npm-cache/_npx/15c61037b1978c83/node_modules/chrome-devtools-mcp/build/src/third_party/index.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const server = await createServer({ server: { host: '127.0.0.1', port: 5199, strictPort: true, open: false } });
let browser;
const failures = [];
try {
  await server.listen();
  browser = await puppeteer.launch({ executablePath: 'C:/Users/ADMIN/.cache/puppeteer/chrome/win64-152.0.7977.54/chrome-win64/chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', req => req.url().includes('/api/') && !req.url().includes('/src/') ? req.respond({ status: 200, contentType: 'application/json', body: '{"data":[]}' }) : req.continue());
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('token', 'local-ui-test');
    localStorage.setItem('user', JSON.stringify({ name: 'Administrator', role: 'admin', isAdmin: true }));
  });
  const paths = ['/dashboard','/dashboard/holidays','/dashboard/students','/dashboard/staff/list','/dashboard/staff/add-teaching','/dashboard/courses','/dashboard/sections','/dashboard/attendance/student','/dashboard/attendance/staff','/dashboard/payroll','/dashboard/transport','/dashboard/hostel','/dashboard/hostel/master','/dashboard/hostel/students','/dashboard/hostel/reports','/dashboard/fee-structure','/dashboard/board-academic-year','/dashboard/examinations','/dashboard/examinations/add','/dashboard/subjects','/dashboard/settings/templates','/driver/reports'];
  let checked = 0;
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 950 });
    for (const theme of ['dark','light']) {
      for (const path of (width === 1440 ? paths : ['/dashboard/holidays','/dashboard/staff/list','/dashboard/hostel/master','/driver/reports'])) {
        await page.goto('http://127.0.0.1:5199' + path, { waitUntil: 'networkidle0' });
        await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
        const rows = await page.evaluate(() => [...document.querySelectorAll('select,.app-select-control')].filter(el => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden').map(el => {
          if (!el.disabled) el.focus();
          const s=getComputedStyle(el), r=el.getBoundingClientRect();
          const option = el.querySelector('option:not(:checked)') || el.querySelector('option');
          return { tag:el.tagName, class:el.className, label:el.getAttribute('aria-label') || el.value || el.innerText.slice(0,50), background:s.backgroundColor, color:s.color, border:s.borderWidth, radius:s.borderRadius, height:r.height, font:s.fontSize, shadow:s.boxShadow, blur:s.backdropFilter, arrow:s.backgroundImage, option:option ? getComputedStyle(option).backgroundColor : null };
        }));
        for(const row of rows){
          checked++;
          const bg=theme==='dark'?'rgb(28, 32, 26)':'rgb(255, 255, 255)';
          const fg=theme==='dark'?'rgb(242, 243, 238)':'rgb(28, 36, 22)';
          if(row.background!==bg || row.border!=='1px' || row.radius!=='8px' || row.height!==40 || row.font!=='13px' || row.shadow!=='none' || row.blur!=='none' || (row.tag==='SELECT'&&row.arrow==='none'))failures.push({width,theme,path,...row});
        }
        if(path==='/dashboard/holidays')await page.screenshot({path:join(tmpdir(),`filter-standard-${width}-${theme}.png`)});
        console.log(`${width} ${theme} ${path}: ${rows.length} controls`);
      }
    }
  }
  console.log(JSON.stringify({checked,failures},null,2));
  if(failures.length)process.exitCode=1;
} finally { await browser?.close(); await server.close(); }
