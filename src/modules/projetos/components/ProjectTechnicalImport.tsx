import React, { useRef, useState } from 'react';
import { FileUp, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { detectProjectFileKind, type ProjectBudgetDraft } from '@/core/yara/projectIngestion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  onDraft?: (draft: ProjectBudgetDraft, files: File[]) => void;
}

export default function ProjectTechnicalImport({ onDraft }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'ready'>('idle');

  const accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.heic,.heif';

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter(file => detectProjectFileKind(file.name) !== 'other');
    setFiles(next);
    setStatus(next.length ? 'ready' : 'idle');
  }

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    if (!files.length || !user) return;
    setProcessing(true);
    setError('');
    try {
      const uploaded: Array<{ name: string; mimeType: string; url: string }> = [];
      for (const file of files) {
        const path = `project-intake/${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('obras').upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
        if (uploadError) throw uploadError;
        const { data: signed, error: signedError } = await supabase.storage.from('obras').createSignedUrl(path, 60 * 15);
        if (signedError || !signed?.signedUrl) throw signedError ?? new Error('Não foi possível preparar o arquivo para análise.');
        uploaded.push({ name: file.name, mimeType: file.type || 'application/octet-stream', url: signed.signedUrl });
      }

      const prompt = `Você é a YARA, engenheira de orçamento de uma marcenaria. Analise TODOS os arquivos anexados do projeto técnico, página por página e planilha por planilha. Leia textos, tabelas, especificações, desenhos e dimensões visíveis. NÃO invente medidas, materiais, ferragens, quantidades ou preços. Gere SOMENTE JSON válido neste formato: {"projectName":"","clientName":"","items":[{"category":"furniture|material|hardware|labor|other","description":"","quantity":0,"unit":"","widthMm":0,"heightMm":0,"depthMm":0,"material":"","evidenceRefs":["arquivo/página"],"confidence":0,"needsConfirmation":true}],"missingInformation":[],"assumptions":[]}. Se houver informação suficiente para iniciar um orçamento, preencha os itens; se não houver, retorne o que foi comprovado e liste exatamente o que falta. O resultado é um RASCUNHO DE ORÇAMENTO, não uma aprovação final.`;
      const { data, error: invokeError } = await supabase.functions.invoke('ai-text', {
        body: { prompt, files: uploaded, jsonMode: false },
      });
      if (invokeError) throw invokeError;
      const raw = typeof data?.text === 'string' ? data.text : '';
      const cleaned = raw.replace(/^\`\`\`json\s*/i, '').replace(/\s*\`\`\`$/i, '').trim();
      const parsed = JSON.parse(cleaned) as Omit<ProjectBudgetDraft, 'sourceFiles' | 'evidences' | 'status'>;
      const draft: ProjectBudgetDraft = {
        ...parsed,
        sourceFiles: files.map(file => file.name),
        evidences: [],
        status: parsed.missingInformation?.length || parsed.items?.some(item => item.needsConfirmation || item.confidence < 0.82) ? 'needs_confirmation' : 'ready_for_pricing',
      };
      onDraft?.(draft, files);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível analisar o projeto.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted"><FileUp size={18} /></span>
        <div>
          <h2 className="text-base font-bold">Orçar a partir de projeto técnico</h2>
          <p className="mt-1 text-xs text-muted-foreground">Envie PDF, Word, Excel ou imagens. A YARA deverá analisar páginas, tabelas, textos e desenhos e transformar as evidências em um orçamento inicial.</p>
        </div>
      </div>
      <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={event => handleFiles(event.target.files)} />
      <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 w-full rounded-xl border border-dashed border-border px-4 py-5 text-sm font-semibold hover:bg-muted">
        Selecionar arquivos do projeto
      </button>
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map(file => (
            <div key={file.name + file.size} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs">
              <FileText size={14} /><span className="min-w-0 flex-1 truncate">{file.name}</span><CheckCircle2 size={14} />
            </div>
          ))}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle size={14} className="mr-1 inline" /> A YARA não deve inventar dimensões, materiais ou preços. Tudo que não estiver comprovado no projeto será marcado para confirmação.
          </div>
          <button type="button" disabled={status !== 'ready'} onClick={start} className="mt-1 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background disabled:opacity-50">
            {processing ? "Analisando projeto página por página..." : "Iniciar orçamento com YARA"}
          </button>
        </div>
      )}
    </section>
  );
}
