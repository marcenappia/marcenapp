import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const base = process.env.GITHUB_BASE_SHA || '9632ea1a73ac364b4a9c443c5f996fea7a414e9f';
let changed = [];
try {
  changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
} catch {
  changed = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
}
const textFiles = changed.filter((p) => !/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip|lockb)$/i.test(p));
const secretPatterns = [
  /-----BEGIN (?:RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----/,
  /(?:SUPABASE_SERVICE_ROLE_KEY|ASAAS_API_KEY|GOOGLE_GEMINI_API_KEY|LOVABLE_API_KEY)\s*=\s*[^\s#]+/,
  /(?:AKIA|ASIA)[0-9A-Z]{16}/,
];
const clientForbidden = [/SUPABASE_SERVICE_ROLE_KEY\b/, /ASAAS_API_KEY\b/, /GOOGLE_GEMINI_API_KEY\b/, /LOVABLE_API_KEY\b/];
let failures = 0;
for (const path of textFiles) {
  let content;
  try { content = readFileSync(path, 'utf8'); } catch { continue; }
  if (path.startsWith('src/')) {
    for (const re of clientForbidden) {
      if (re.test(content)) { console.error(`SECURITY: server secret name exposed in client source: ${path} (${re})`); failures++; }
    }
  }
  if (path.startsWith('.env')) continue;
  for (const re of secretPatterns) {
    if (re.test(content)) { console.error(`SECURITY: high-confidence secret pattern found in changed tracked file: ${path} (${re})`); failures++; break; }
  }
}
let diff = '';
try { diff = execFileSync('git', ['diff', '--unified=0', `${base}...HEAD`, '--', 'supabase/migrations'], { encoding: 'utf8' }); } catch {}
const destructive = /(^|\n)\+\s*(drop\s+table|drop\s+column|truncate\b|alter\s+table[^\n]*drop\s+constraint)/im;
if (destructive.test(diff)) { console.error('SECURITY: destructive migration DDL detected.'); failures++; }
if (failures) process.exit(1);
console.log(`security-check: PASS (${textFiles.length} changed text files inspected)`);
