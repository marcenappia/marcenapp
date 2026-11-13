import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Loader2, UploadCloud } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ProjectPlanDocument = {
  id: string;
  name: string;
  file_path: string | null;
  source_url: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const categories = [
  { value: 'technical_project', label: 'Projeto técnico' },
  { value: 'budget', label: 'Orçamento' },
  { value: 'existing_contract', label: 'Documento contratual existente' },
  { value: 'purchase_invoice', label: 'Nota fiscal / compra' },
  { value: 'delivery_evidence', label: 'Foto ou comprovante de entrega' },
  { value: 'other', label: 'Outro documento' },
];

const allowedExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'xls', 'xlsx', 'csv', 'doc', 'docx']);

export default function ProjectDocumentsPanel({ projectId, userId }: { projectId: string; userId: string }) {
  const [documents, setDocuments] = useState<ProjectPlanDocument[]>([]);
  const [category, setCategory] = useState('technical_project');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('project_plans')
      .select('id,name,file_path,source_url,status,metadata,created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) {
      setMessage(error.message);
      return;
    }
    setDocuments((data ?? []) as ProjectPlanDocument[]);
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const uploadFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!allowedExtensions.has(extension)) {
      setMessage('Formato não permitido. Envie PDF, imagem, Excel, CSV ou Word.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setMessage('O arquivo ultrapassa o limite de 25 MB.');
      return;
    }

    setBusy(true);
    setMessage(null);
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 90);
    const path = `${userId}/${projectId}/documentos/${globalThis.crypto?.randomUUID?.() ?? Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('obras').upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
    if (uploadError) {
      setBusy(false);
      setMessage(uploadError.message);
      return;
    }

    const { error: rowError } = await supabase.from('project_plans').insert({
      project_id: projectId,
      name: file.name,
      file_path: path,
      status: 'uploaded',
      metadata: { category, mimeType: file.type || 'application/octet-stream', size: file.size, source: 'diario_project_documents' },
    });
    if (rowError) {
      await supabase.storage.from('obras').remove([path]);
      setBusy(false);
      setMessage(rowError.message);
      return;
    }

    await load();
    setBusy(false);
    setMessage('Documento armazenado e vinculado ao projeto.');
  };

  const downloadDocument = async (document: ProjectPlanDocument) => {
    if (document.source_url) {
      window.open(document.source_url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!document.file_path) {
      setMessage('Este registro não possui arquivo associado.');
      return;
    }
    const { data, error } = await supabase.storage.from('obras').download(document.file_path);
    if (error || !data) {
      setMessage(error?.message ?? 'Não foi possível abrir o arquivo.');
      return;
    }
    const url = URL.createObjectURL(data);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = document.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const categoryLabel = (document: ProjectPlanDocument) => {
    const value = typeof document.metadata?.category === 'string' ? document.metadata.category : '';
    return categories.find(item => item.value === value)?.label ?? 'Documento';
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-indigo-600" />
        <div>
          <h3 className="font-black text-slate-900">Documentos da obra</h3>
          <p className="text-xs text-slate-500">Arquivos vinculados ao projeto, com armazenamento persistente.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <select value={category} onChange={event => setCategory(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          {categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <label className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          {busy ? 'Enviando...' : 'Enviar arquivo'}
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.csv,.doc,.docx"
            className="sr-only"
            disabled={busy}
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) void uploadFile(file);
              event.currentTarget.value = '';
            }}
          />
        </label>
      </div>

      {message && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">{message}</p>}

      <div className="mt-4 divide-y divide-slate-100">
        {documents.length === 0 ? (
          <p className="py-5 text-sm text-slate-500">Nenhum documento foi vinculado a este projeto ainda.</p>
        ) : documents.map(document => (
          <div key={document.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800">{document.name}</p>
              <p className="text-xs text-slate-500">{categoryLabel(document)} · {new Date(document.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            <button type="button" onClick={() => void downloadDocument(document)} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Download size={14} /> Abrir
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">Este painel armazena documentos existentes; não gera contratos nem realiza assinaturas digitais.</p>
    </section>
  );
}
