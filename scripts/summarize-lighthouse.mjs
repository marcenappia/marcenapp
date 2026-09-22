import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const inputDir = process.env.LIGHTHOUSE_RESULTS_DIR ?? 'lighthouse-results';
const outputFile = process.env.LIGHTHOUSE_SUMMARY_OUTPUT ?? 'artifacts/lighthouse-daily-summary.md';

const files = (await readdir(inputDir))
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => path.join(inputDir, file));

if (files.length === 0) {
  throw new Error(`Nenhum relatório Lighthouse JSON encontrado em ${inputDir}`);
}

const reports = await Promise.all(files.map(async (file) => JSON.parse(await readFile(file, 'utf8'))));
const score = (report, category) => Math.round((report.categories?.[category]?.score ?? 0) * 100);
const metric = (report, id) => report.audits?.[id]?.numericValue ?? null;
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const formatScore = (value) => `${value.toFixed(0)}/100`;
const formatMs = (value) => value == null ? 'n/a' : `${(value / 1000).toFixed(2)} s`;
const formatNumber = (value) => value == null ? 'n/a' : value.toFixed(4);

const rows = reports.map((report, index) => ({
  run: index + 1,
  performance: score(report, 'performance'),
  accessibility: score(report, 'accessibility'),
  seo: score(report, 'seo'),
  bestPractices: score(report, 'best-practices'),
  fcp: metric(report, 'first-contentful-paint'),
  lcp: metric(report, 'largest-contentful-paint'),
  cls: metric(report, 'cumulative-layout-shift'),
}));

const avg = {
  performance: average(rows.map((row) => row.performance)),
  accessibility: average(rows.map((row) => row.accessibility)),
  seo: average(rows.map((row) => row.seo)),
  bestPractices: average(rows.map((row) => row.bestPractices)),
  fcp: average(rows.map((row) => row.fcp).filter((value) => value != null)),
  lcp: average(rows.map((row) => row.lcp).filter((value) => value != null)),
  cls: average(rows.map((row) => row.cls).filter((value) => value != null)),
};

const target = avg.performance >= 90 ? 'atingida' : 'ainda não atingida';
const lines = [
  '# Resumo diário do Lighthouse — Marcenapp',
  '',
  `- **Data da coleta:** ${new Date().toISOString()}`,
  `- **Relatórios processados:** ${reports.length}`,
  `- **Meta mobile de performance:** 90/100 — **${target}**`,
  '',
  '## Médias',
  '',
  '| Categoria | Resultado |',
  '|---|---:|',
  `| Performance | ${formatScore(avg.performance)} |`,
  `| Acessibilidade | ${formatScore(avg.accessibility)} |`,
  `| SEO | ${formatScore(avg.seo)} |`,
  `| Boas práticas | ${formatScore(avg.bestPractices)} |`,
  `| First Contentful Paint | ${formatMs(avg.fcp)} |`,
  `| Largest Contentful Paint | ${formatMs(avg.lcp)} |`,
  `| Cumulative Layout Shift | ${formatNumber(avg.cls)} |`,
  '',
  '## Execuções individuais',
  '',
  '| Execução | Performance | Acessibilidade | SEO | Boas práticas | FCP | LCP | CLS |',
  '|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...rows.map((row) => `| ${row.run} | ${row.performance} | ${row.accessibility} | ${row.seo} | ${row.bestPractices} | ${formatMs(row.fcp)} | ${formatMs(row.lcp)} | ${formatNumber(row.cls)} |`),
  '',
  '## Próximas ações recomendadas',
  '',
  avg.performance >= 90
    ? '- Manter o orçamento de recursos e observar regressões nas próximas coletas.'
    : '- Priorizar redução de JavaScript inicial, imagens responsivas, fontes e trabalho de terceiros antes de aumentar os thresholds.',
  avg.lcp > 2500 ? '- Investigar o elemento LCP e entregar seu recurso crítico com prioridade.' : '- LCP dentro da meta configurada.',
  avg.cls > 0.1 ? '- Reservar dimensões para imagens, fontes e componentes dinâmicos para reduzir CLS.' : '- CLS dentro da meta configurada.',
  '',
];

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${lines.join('\n')}\n`);
console.log(`Resumo Lighthouse escrito em ${outputFile}`);
