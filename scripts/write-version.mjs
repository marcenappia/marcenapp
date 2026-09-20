import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const publicDir = resolve(repoRoot, 'public');
const outputFile = resolve(publicDir, 'version.json');

const gitSha = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.GITHUB_SHA
  || (() => {
    try {
      return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  })();

const version = {
  commit: gitSha,
  shortCommit: gitSha === 'unknown' ? gitSha : gitSha.slice(0, 8),
  branch: process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || 'local',
  environment: process.env.VERCEL_ENV || (process.env.CI ? 'ci' : 'local'),
  builtAt: new Date().toISOString(),
};

await mkdir(publicDir, { recursive: true });
await writeFile(outputFile, `${JSON.stringify(version, null, 2)}\n`, 'utf8');
console.log(`Generated ${outputFile}: ${version.shortCommit} (${version.environment})`);
