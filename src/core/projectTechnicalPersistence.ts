import { supabase } from '@/integrations/supabase/client';
import type { ProjectData } from '@/modules/projetos/types';
import {
  buildTechnicalStructure,
  type TechnicalStructure,
} from './projectTechnicalModel';

type PersistedVersion = {
  id: string;
  version_number: number;
  status: string;
  snapshot: Record<string, unknown> | null;
};

export async function persistProjectTechnicalStructure(args: {
  project: ProjectData;
  userId: string;
  environmentId?: string | null;
}): Promise<{ versionId: string; versionNumber: number; structure: TechnicalStructure }> {
  if (!args.project.id) throw new Error('Projeto sem id não pode ter estrutura técnica persistida.');

  const structure = buildTechnicalStructure(args.project);
  const materialRoles = [
    ['external', args.project.externalMaterial],
    ['internal', args.project.internalMaterial],
    ['back', args.project.backMaterial],
  ] as const;
  for (const [role, name] of materialRoles) {
    if (!name?.trim()) continue;
    const { data: rows, error } = await supabase
      .from('marcenaria_materiais')
      .select('id,nome,espessura,fornecedor_id,largura_chapa,altura_chapa,sentido_veio')
      .ilike('nome', name.trim())
      .limit(10);
    if (error) throw error;
    const material = rows?.find((row) => row.nome?.trim().toLocaleLowerCase('pt-BR') === name.trim().toLocaleLowerCase('pt-BR')) ?? rows?.[0];
    if (!material) continue;
    structure.materialBindings.push({
      role,
      materialId: material.id,
      name: material.nome,
      thicknessMm: material.espessura == null ? null : Number(material.espessura),
      sheetWidthMm: material.largura_chapa == null ? null : Number(material.largura_chapa),
      sheetHeightMm: material.altura_chapa == null ? null : Number(material.altura_chapa),
      grainSensitive: Boolean(material.sentido_veio),
      supplierId: material.fornecedor_id ?? null,
      supplierName: null,
      status: 'confirmed',
      source: 'marcenaria_materiais',
    });
    for (const part of structure.parts) {
      const applies = role === 'external'
        ? part.material === args.project.externalMaterial
        : role === 'internal'
          ? part.material === args.project.internalMaterial
          : false;
      if (applies) {
        part.materialId = material.id;
        part.thicknessMm = material.espessura == null ? null : Number(material.espessura);
        part.grainSensitive = Boolean(material.sentido_veio && material.sentido_veio !== 'none' && material.sentido_veio !== 'nenhum');
      }
    }
  }

  const { data: hardwareRows, error: hardwareError } = await supabase
    .from('project_hardware_requirements')
    .select('hardware_id,quantity_required,rule_key,hardware_items(name,category,unit)')
    .eq('user_id', args.userId)
    .eq('project_id', args.project.id);
  if (hardwareError) throw hardwareError;
  structure.hardwareRequirements = (hardwareRows ?? []).map((row) => {
    const item = Array.isArray(row.hardware_items) ? row.hardware_items[0] : row.hardware_items;
    return {
      hardwareId: row.hardware_id,
      name: item?.name ?? 'Ferragem sem cadastro disponível',
      category: item?.category ?? 'não informado',
      quantity: Number(row.quantity_required),
      unit: item?.unit ?? 'un',
      status: 'confirmed' as const,
      source: row.rule_key ? `regra:${row.rule_key}` : 'project_hardware_requirements',
    };
  });
  if (structure.hardwareRequirements.length) {
    structure.missingInformation = structure.missingInformation.filter((item) => item !== 'ferragens do projeto');
  } else {
    structure.missingInformation.push('ferragens do projeto ainda não vinculadas');
  }
  const { data: existing, error: readError } = await supabase
    .from('project_versions')
    .select('id,version_number,status,snapshot')
    .eq('user_id', args.userId)
    .eq('project_id', args.project.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) throw readError;

  const snapshot = {
    ...((existing?.snapshot && typeof existing.snapshot === 'object') ? existing.snapshot : {}),
    technicalStructure: structure,
    technicalStructureUpdatedAt: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from('project_versions')
      .update({
        snapshot,
        ...(args.environmentId ? { environment_id: args.environmentId } : {}),
      })
      .eq('id', existing.id)
      .eq('user_id', args.userId);
    if (error) throw error;
    return { versionId: existing.id, versionNumber: existing.version_number, structure };
  }

  const { data: created, error: createError } = await supabase
    .from('project_versions')
    .insert({
      project_id: args.project.id,
      user_id: args.userId,
      version_number: 1,
      status: 'draft',
      snapshot,
      environment_id: args.environmentId ?? null,
    })
    .select('id,version_number,status,snapshot')
    .single();

  if (createError) throw createError;
  const version = created as PersistedVersion;
  return { versionId: version.id, versionNumber: version.version_number, structure };
}
