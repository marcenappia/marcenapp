export type ProjectFileKind = 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'csv' | 'image' | 'other';
export type ProjectEvidenceKind = 'text' | 'table' | 'image' | 'drawing' | 'dimension' | 'specification';

export interface ProjectEvidence {
  fileName: string; page?: number; sheet?: string; kind: ProjectEvidenceKind;
  text?: string; confidence: number; sourceRef: string;
}

export interface BudgetDraftItem {
  category: 'furniture' | 'material' | 'hardware' | 'labor' | 'other';
  description: string; quantity?: number; unit?: string;
  widthMm?: number; heightMm?: number; depthMm?: number; material?: string;
  evidenceRefs: string[]; confidence: number; needsConfirmation: boolean;
}

export interface ProjectBudgetDraft {
  projectName?: string; clientName?: string; sourceFiles: string[];
  evidences: ProjectEvidence[]; items: BudgetDraftItem[];
  missingInformation: string[]; assumptions: string[];
  status: 'draft' | 'needs_confirmation' | 'ready_for_pricing';
}

export function detectProjectFileKind(fileName: string): ProjectFileKind {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'doc') return 'doc';
  if (ext === 'docx') return 'docx';
  if (ext === 'xls') return 'xls';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'csv') return 'csv';
  if (/^(png|jpe?g|webp|heic|heif)$/.test(ext)) return 'image';
  return 'other';
}

export function finalizeBudgetDraft(draft: Omit<ProjectBudgetDraft, 'status'>): ProjectBudgetDraft {
  const missing = [...new Set(draft.missingInformation.filter(Boolean))];
  const needsConfirmation = draft.items.some(item => item.needsConfirmation || item.confidence < 0.82);
  return {
    ...draft,
    missingInformation: missing,
    status: missing.length || needsConfirmation ? 'needs_confirmation' : 'ready_for_pricing',
  };
}
