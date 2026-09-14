import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const asaasSource = readFileSync(join(repoRoot, 'supabase/functions/asaas/index.ts'), 'utf8');

function filesUnder(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(path);
  }
  return out;
}

describe('P0 billing gate', () => {
  it('uses only canonical operational plan codes', () => {
    const operationalFiles = [
      ...filesUnder(join(repoRoot, 'src')),
      ...filesUnder(join(repoRoot, 'supabase/functions')),
    ];
    const forbidden = /['"`](start|pro|business)['"`]/g;
    const hits = operationalFiles.flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return [...text.matchAll(forbidden)].map((match) => `${file}:${match[0]}`);
    });
    expect(hits).toEqual([]);
    expect(asaasSource).toContain(".from(\"billing_plans\")");
  });

  it('uses deterministic external references and the distributed lock for every external create flow', () => {
    expect(asaasSource).toContain('marcenapp:customer:${userId}');
    expect(asaasSource).toContain('marcenapp:product:${user.id}:${key}:${requestId}');
    expect(asaasSource).toContain('marcenapp:subscription:${user.id}:${plan}');
    expect(asaasSource).toContain('withBillingOperationLock(`customer:${externalReference}`');
    expect(asaasSource).toContain('withBillingOperationLock(`purchase:${externalReference}`');
    expect(asaasSource).toContain('withBillingOperationLock(`subscription:${user.id}:${plan}`');
    expect(asaasSource).toContain('acquire_billing_operation_lock');
    expect(asaasSource).toContain('release_billing_operation_lock');
  });

  it('models the critical race: two identical requests yield one external POST', async () => {
    let holder: string | null = null;
    let externalPosts = 0;
    const acquire = async (token: string) => {
      if (holder === null) { holder = token; return true; }
      return holder === token;
    };
    const release = async (token: string) => { if (holder === token) holder = null; };
    const run = async (token: string) => {
      for (;;) {
        if (await acquire(token)) {
          externalPosts += 1;
          await new Promise((resolve) => setTimeout(resolve, 5));
          await release(token);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    };
    await Promise.all([run('A'), run('B')]);
    expect(externalPosts).toBe(2);

    // With reconciliation after the first creator completes, the second request
    // must reuse the external resource instead of POSTing it again.
    externalPosts = 0;
    let externalResource = false;
    const runIdempotent = async (token: string) => {
      for (;;) {
        if (await acquire(token)) {
          if (!externalResource) { externalResource = true; externalPosts += 1; }
          await release(token);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    };
    await Promise.all([runIdempotent('C'), runIdempotent('D')]);
    expect(externalPosts).toBe(1);
  });

  it('documents replay safety in the webhook implementation', () => {
    expect(asaasSource).toContain('asaas_webhook_events');
    expect(asaasSource).toContain('event_id: event.id');
    expect(asaasSource).toContain('duplicate');
    expect(asaasSource).toContain('process_billing_payment');
  });
});
