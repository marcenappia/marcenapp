import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.marcenapp.com.br';
const output = process.env.PWA_AUDIT_OUTPUT || 'artifacts/pwa-performance-audit.md';
const startedAt = new Date().toISOString();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL, serviceWorkers: 'allow' });
const page = await context.newPage();
const checks = [];

const check = (name, passed, details) => checks.push({ name, passed, details });

try {
  const versionResponse = await page.request.get('/version.json');
  const version = await versionResponse.json();
  check('version.json', versionResponse.ok(), `${version.shortCommit ?? 'unknown'} / ${version.environment ?? 'unknown'}`);

  const manifestResponse = await page.request.get('/manifest.webmanifest');
  const manifest = await manifestResponse.json();
  const manifestValid = manifestResponse.ok()
    && manifest.display === 'standalone'
    && manifest.start_url === '/'
    && manifest.icons?.some((icon) => icon.src === '/icons/icon-192.png' && icon.sizes === '192x192')
    && manifest.icons?.some((icon) => icon.src === '/icons/icon-512.png' && icon.sizes === '512x512');
  check('manifest.webmanifest', manifestValid, `display=${manifest.display}; start_url=${manifest.start_url}`);

  for (const path of ['/icons/icon-192.png', '/icons/icon-512.png', '/sw.js']) {
    const response = await page.request.get(path);
    check(path, response.ok(), `HTTP ${response.status()}`);
  }

  const navigationStarted = Date.now();
  const response = await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  const navigationElapsedMs = Date.now() - navigationStarted;
  const timing = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0];
    if (!entry) return null;
    return {
      dns: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
      tcp: Math.round(entry.connectEnd - entry.connectStart),
      ttfb: Math.round(entry.responseStart - entry.requestStart),
      domContentLoaded: Math.round(entry.domContentLoadedEventEnd),
      loadEvent: Math.round(entry.loadEventEnd),
    };
  });
  check('landing page', response?.ok() === true, `HTTP ${response?.status()}; elapsed=${navigationElapsedMs}ms`);
  check('performance timing', Boolean(timing), JSON.stringify(timing));

  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  const swState = await page.evaluate(() => ({
    supported: 'serviceWorker' in navigator,
    controller: Boolean(navigator.serviceWorker?.controller),
    registrations: navigator.serviceWorker?.getRegistrations ? undefined : 0,
  }));
  check('Service Worker registration', swState.supported && swState.controller, JSON.stringify(swState));

  const checkRows = checks
    .map(({ name, passed, details }) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} | ${String(details).replaceAll('|', '\\|')} |`)
    .join('\n');
  const report = [
    '# Marcenapp — Auditoria semanal de performance e PWA',
    '',
    `- **URL:** ${baseURL}`,
    `- **Executado em:** ${startedAt}`,
    `- **Commit servido:** ${version.commit ?? 'unknown'}`,
    `- **Ambiente:** ${version.environment ?? 'unknown'}`,
    '',
    '## Resumo',
    '',
    '| Check | Status | Detalhes |',
    '|---|---|---|',
    checkRows,
    '',
    '## Métricas de navegação',
    '',
    '```json',
    JSON.stringify({ navigationElapsedMs, timing }, null, 2),
    '```',
    '',
    '## Critérios',
    '',
    '- Manifest em modo `standalone`.',
    '- Ícones PNG de 192px e 512px acessíveis.',
    '- Service Worker registrado e controlando a página.',
    '- Landing page respondendo com sucesso.',
    '- Métricas de navegação coletadas via Performance Navigation Timing.',
    '',
  ].join('\n');

  await mkdir(new URL('.', `file://${process.cwd()}/${output}`).pathname, { recursive: true });
  await writeFile(output, report, 'utf8');
  console.log(JSON.stringify({ output, checks, timing }, null, 2));

  if (checks.some(({ passed }) => !passed)) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
