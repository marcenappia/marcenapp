import { supabase } from '@/integrations/supabase/client';

type JsonRecord = Record<string, unknown>;

export type ProductionFreeze = {
  freezeId: string;
  projectId: string;
  versionId: string;
  approvalId: string;
  environmentId?: string;
  snapshotHash: string;
  snapshot: JsonRecord;
  createdAt: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) return Object.keys(value).sort().reduce<JsonRecord>((result, key) => {
    result[key] = stableValue(value[key]);
    return result;
  }, {});
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function loadApprovedVersion(args: { projectId: string; userId: string; versionId?: string }) {
  if (args.versionId) {
    const { data, error } = await supabase
      .from('project_versions')
      .select('id,project_id,user_id,status,snapshot,environment_id,version_number')
      .eq('id', args.versionId)
      .eq('project_id', args.projectId)
      .eq('user_id', args.userId)
      .maybeSingle();
    return { data, error };
  }

  const { data: approvals, error: approvalError } = await supabase
    .from('project_approvals')
    .select('id,project_id,project_version_id,environment_id,approved_at')
    .eq('project_id', args.projectId)
    .not('approved_at', 'is', null)
    .order('approved_at', { ascending: false })
    .limit(20);
  if (approvalError) return { data: null, error: approvalError };
  if (!approvals?.length) return { data: null, error: null };

  for (const approval of approvals) {
    const { data, error } = await supabase
      .from('project_versions')
      .select('id,project_id,user_id,status,snapshot,environment_id,version_number')
      .eq('id', approval.project_version_id)
      .eq('project_id', args.projectId)
      .eq('user_id', args.userId)
      .maybeSingle();
    if (error) return { data: null, error };
    if (data) return { data, error: null };
  }
  return { data: null, error: null };
}

/**
 * Resolves an approved project version and freezes the exact technical package
 * used for production. A later project edit can create another version without
 * changing this immutable production snapshot.
 */
export async function freezeProductionPackage(args: {
  projectId: string;
  userId: string;
  versionId?: string;
  environmentId?: string;
  technicalPackage: JsonRecord;
  correlationId?: string;
}): Promise<{ ok: true; freeze: ProductionFreeze } | { ok: false; error: string }> {
  const { data: version, error: versionError } = await loadApprovedVersion(args);
  if (versionError) return { ok: false, error: `Não foi possível localizar a versão aprovada: ${versionError.message}` };
  if (!version) return { ok: false, error: 'Produção bloqueada: nenhum projeto aprovado foi encontrado.' };

  const { data: approval, error: approvalError } = await supabase
    .from('project_approvals')
    .select('id,project_id,project_version_id,environment_id,approved_at')
    .eq('project_id', args.projectId)
    .eq('project_version_id', version.id)
    .not('approved_at', 'is', null)
    .order('approved_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (approvalError) return { ok: false, error: `Não foi possível validar a aprovação: ${approvalError.message}` };
  if (!approval) return { ok: false, error: 'Produção bloqueada: esta versão ainda não possui aprovação registrada.' };

  const environmentId = args.environmentId || version.environment_id || approval.environment_id || undefined;
  if (version.environment_id && approval.environment_id && version.environment_id !== approval.environment_id) {
    return { ok: false, error: 'Produção bloqueada: a aprovação e a versão pertencem a ambientes diferentes.' };
  }

  const technicalPackageHash = await sha256(stableJson(args.technicalPackage));
  const snapshot: JsonRecord = {
    schemaVersion: 1,
    project: {
      id: version.project_id,
      versionId: version.id,
      versionNumber: version.version_number,
      status: version.status,
      environmentId,
    },
    approvedVersionSnapshot: isRecord(version.snapshot) ? version.snapshot : {},
    technicalPackage: args.technicalPackage,
    technicalPackageHash,
    correlationId: args.correlationId,
    frozenAt: new Date().toISOString(),
  };
  const snapshotHash = await sha256(stableJson(snapshot));

  const { data: existing, error: existingError } = await supabase
    .from('project_production_freezes')
    .select('id,project_id,project_version_id,project_approval_id,environment_id,snapshot,snapshot_hash,created_at')
    .eq('project_version_id', version.id)
    .eq('user_id', args.userId)
    .maybeSingle();

  if (existingError) return { ok: false, error: `Não foi possível consultar o congelamento técnico: ${existingError.message}` };
  if (existing) {
    const existingSnapshot = isRecord(existing.snapshot) ? existing.snapshot : {};
    const existingPackageHash = typeof existingSnapshot.technicalPackageHash === 'string' ? existingSnapshot.technicalPackageHash : '';
    if (existingPackageHash && existingPackageHash !== technicalPackageHash) {
      return { ok: false, error: 'Produção bloqueada: esta versão já possui um pacote técnico congelado diferente. Crie uma nova versão aprovada antes de alterar a produção.' };
    }
    return {
      ok: true,
      freeze: {
        freezeId: existing.id,
        projectId: existing.project_id,
        versionId: existing.project_version_id,
        approvalId: existing.project_approval_id,
        environmentId: existing.environment_id || undefined,
        snapshotHash: existing.snapshot_hash,
        snapshot: existingSnapshot,
        createdAt: existing.created_at,
      },
    };
  }

  const { data: created, error: createError } = await supabase
    .from('project_production_freezes')
    .insert({
      project_id: version.project_id,
      project_version_id: version.id,
      project_approval_id: approval.id,
      user_id: args.userId,
      environment_id: environmentId ?? null,
      snapshot,
      snapshot_hash: snapshotHash,
      status: 'frozen',
    })
    .select('id,project_id,project_version_id,project_approval_id,environment_id,snapshot,snapshot_hash,created_at')
    .single();

  if (createError || !created) {
    if (createError?.code === '23505') {
      const { data: concurrent } = await supabase
        .from('project_production_freezes')
        .select('id,project_id,project_version_id,project_approval_id,environment_id,snapshot,snapshot_hash,created_at')
        .eq('project_version_id', version.id)
        .eq('user_id', args.userId)
        .maybeSingle();
      if (concurrent) {
        const concurrentSnapshot = isRecord(concurrent.snapshot) ? concurrent.snapshot : {};
        const concurrentPackageHash = typeof concurrentSnapshot.technicalPackageHash === 'string' ? concurrentSnapshot.technicalPackageHash : '';
        if (concurrentPackageHash && concurrentPackageHash !== technicalPackageHash) {
          return { ok: false, error: 'Produção bloqueada: esta versão já possui um pacote técnico congelado diferente. Crie uma nova versão aprovada antes de alterar a produção.' };
        }
        return { ok: true, freeze: { freezeId: concurrent.id, projectId: concurrent.project_id, versionId: concurrent.project_version_id, approvalId: concurrent.project_approval_id, environmentId: concurrent.environment_id || undefined, snapshotHash: concurrent.snapshot_hash, snapshot: concurrentSnapshot, createdAt: concurrent.created_at } };
      }
    }
    return { ok: false, error: `Não foi possível criar o congelamento técnico: ${createError?.message || 'registro não criado'}` };
  }

  return {
    ok: true,
    freeze: {
      freezeId: created.id,
      projectId: created.project_id,
      versionId: created.project_version_id,
      approvalId: created.project_approval_id,
      environmentId: created.environment_id || undefined,
      snapshotHash: created.snapshot_hash,
      snapshot: created.snapshot as JsonRecord,
      createdAt: created.created_at,
    },
  };
}
