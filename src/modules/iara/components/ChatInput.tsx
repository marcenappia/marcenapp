import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, X, Command, Ruler, Image, ClipboardList, Boxes, Scissors, PackageCheck, Calculator, FileText, ShoppingCart, Wrench, Truck, ListChecks, Camera, PencilLine, Plus, ArrowUpFromLine, HelpCircle } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { IARA_SMART_ACTIONS, type IaraSmartAction } from '../message-system';
import { supabase } from '@/integrations/supabase/client';
import { attachIaraEnvironmentPhoto, createIaraClientAndProject, loadIaraPhotoDestinations, rememberIaraPhotoHandoff, consumeIaraPhotoHandoff } from '../services/photoDestination';
import { blobToDataUrl, clearIaraPendingUpload, createIaraPreviewUrl, loadIaraPendingUpload } from '../services/pendingUploadStorage';

type PendingUpload = { base64: string; baseRaw?: string; maskRaw?: string; kind?: 'environment' | 'reference' | 'sketch' | 'plan'; blob?: Blob; previewUrl?: string };
export type SmartAction = IaraSmartAction & { prompt: string };

const SMART_ACTIONS: Array<{ domain: SmartAction['domain']; title: string; items: SmartAction[] }> = [
  { domain: 'project', title: 'Projeto', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'project').map(a => ({ ...a, prompt: a.intent })) },
  { domain: 'production', title: 'Produção', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'production').map(a => ({ ...a, prompt: a.intent })) },
  { domain: 'business', title: 'Negócio', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'business').map(a => ({ ...a, prompt: a.intent })) },
  { domain: 'execution', title: 'Execução', items: IARA_SMART_ACTIONS.filter(a => a.domain === 'execution').map(a => ({ ...a, prompt: a.intent })) },
];

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  'project.analyze': Image, 'project.create': ClipboardList, 'project.measurements': Ruler, 'project.elevation': ArrowUpFromLine,
  'project.render': Image, 'project.review': ClipboardList, 'production.materials': Boxes, 'production.hardware': Wrench,
  'production.cut': Scissors, 'production.inventory': PackageCheck, 'production.production': ClipboardList, 'business.budget': Calculator,
  'business.documents': FileText, 'business.order': ShoppingCart, 'execution.assembly': Wrench, 'execution.installation': Wrench,
  'execution.checklist': ListChecks, 'execution.delivery': Truck,
};

const ONBOARDING_KEY = 'marcenapp.iara.attachments.onboarding.v1';

interface ChatInputProps {
  chatInput: string; setChatInput: (val: string) => void; onSend: () => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>, kind?: PendingUpload['kind']) => void;
  toggleRecording: () => void; isListening: boolean; pendingUpload: PendingUpload | null;
  setPendingUpload: (val: PendingUpload | null) => void; onSmartAction?: (action: SmartAction) => void; navigateTo?: (id: string, params?: Record<string, string>) => void;
}

export const ChatInput = ({ chatInput, setChatInput, onSend, onImageSelect, toggleRecording, isListening, pendingUpload, setPendingUpload, onSmartAction, navigateTo }: ChatInputProps) => {
  const [open, setOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [destinationMode, setDestinationMode] = useState<'choices' | 'client' | 'project'>('choices');
  const [clients, setClients] = useState<Array<{id:string;nome:string}>>([]);
  const [projects, setProjects] = useState<Array<{id:string;nome?:string|null;name?:string|null;cliente_id?:string|null}>>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [clientName, setClientName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [destinationBusy, setDestinationBusy] = useState(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const environmentInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const sketchInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      // Durable Blob storage is the source of truth. sessionStorage/handoff is
      // kept only as a compatibility fallback for captures created by older builds.
      try {
        const persisted = await loadIaraPendingUpload();
        if (!cancelled && persisted) {
          const previewUrl = createIaraPreviewUrl(persisted.blob);
          setPendingUpload({
            blob: persisted.blob,
            previewUrl,
            base64: previewUrl,
            baseRaw: '',
            maskRaw: '',
            kind: persisted.kind,
          });
          return;
        }
      } catch {
        // Fall through to legacy temporary storage.
      }

      let handoff = consumeIaraPhotoHandoff();
      if (!handoff) {
        try {
          const raw = sessionStorage.getItem('marcenapp.iara.pending-upload.v1');
          if (raw) handoff = JSON.parse(raw);
        } catch { /* ignore invalid temporary state */ }
      }
      if (handoff && !cancelled) setPendingUpload(handoff);
    };
    void restore();
    return () => { cancelled = true; };
  }, [setPendingUpload]);

  useEffect(() => {
    if (!pendingUpload || pendingUpload.kind !== 'environment') return;
    setDestinationOpen(true);
    setDestinationMode('choices');
    setDestinationError(null);
  }, [pendingUpload]);

  useEffect(() => {
    return () => {
      if (pendingUpload?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingUpload.previewUrl);
    };
  }, [pendingUpload]);

  const loadDestinations = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setDestinationBusy(true); setDestinationError(null);
    try { const data = await loadIaraPhotoDestinations(auth.user.id); setClients(data.clients); setProjects(data.projects); }
    catch { setDestinationError('Não foi possível carregar clientes e projetos.'); }
    finally { setDestinationBusy(false); }
  };

  useEffect(() => {
    if (!destinationOpen || destinationMode === 'choices') return;
    void loadDestinations();
  }, [destinationOpen, destinationMode]);

  const keepWithoutCadastro = () => { setDestinationOpen(false); setDestinationMode('choices'); };

  const attachToProject = async (targetProjectId: string) => {
    if (!pendingUpload) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setDestinationBusy(true); setDestinationError(null);
    try {
      const dataUrl = pendingUpload.blob ? await blobToDataUrl(pendingUpload.blob) : pendingUpload.base64;
      rememberIaraPhotoHandoff({ ...pendingUpload, base64: dataUrl });
      const destination = await attachIaraEnvironmentPhoto({ userId: auth.user.id, projectId: targetProjectId, dataUrl });
      if (pendingUpload.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingUpload.previewUrl);
      await clearIaraPendingUpload().catch(() => undefined);
      setPendingUpload(null); setDestinationOpen(false);
      navigateTo?.('ambientes', { projeto: destination.projectId });
    } catch (error) { setDestinationError(error instanceof Error ? error.message : 'Não foi possível anexar a foto.'); }
    finally { setDestinationBusy(false); }
  };

  const createClientProject = async () => {
    if (!clientName.trim() || !newProjectName.trim() || !pendingUpload) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setDestinationBusy(true); setDestinationError(null);
    try {
      const created = await createIaraClientAndProject({ userId: auth.user.id, clientName, projectName: newProjectName });
      const dataUrl = pendingUpload.blob ? await blobToDataUrl(pendingUpload.blob) : pendingUpload.base64;
      rememberIaraPhotoHandoff({ ...pendingUpload, base64: dataUrl });
      const destination = await attachIaraEnvironmentPhoto({ userId: auth.user.id, projectId: created.project.id, dataUrl, clientId: created.client.id });
      if (pendingUpload.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingUpload.previewUrl);
      await clearIaraPendingUpload().catch(() => undefined);
      setPendingUpload(null); setDestinationOpen(false);
      navigateTo?.('ambientes', { projeto: destination.projectId });
    } catch (error) { setDestinationError(error instanceof Error ? error.message : 'Não foi possível criar o cadastro.'); }
    finally { setDestinationBusy(false); }
  };

  useEffect(() => {
    if (!open) return;
    try {
      setShowOnboarding(window.localStorage.getItem(ONBOARDING_KEY) !== 'seen');
    } catch {
      setShowOnboarding(false);
    }
  }, [open]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try { window.localStorage.setItem(ONBOARDING_KEY, 'seen'); } catch { /* non-blocking */ }
  };

  const selectImage = (ref: React.RefObject<HTMLInputElement | null>, kind: PendingUpload['kind'], prompt?: string) => {
    dismissOnboarding();
    setOpen(false);
    if (prompt) setChatInput(prompt);
    ref.current?.click();
  };

  const startElevation = () => {
    selectImage(planInputRef, 'plan', 'Prepare a elevação desta planta.');
  };

  return <footer className="bg-card border-t border-border p-3 sm:p-4 shrink-0 relative" aria-label="Compositor da IARA">
    {destinationOpen && pendingUpload?.kind === 'environment' && <div role="dialog" aria-label="Destino da foto do ambiente" className="absolute bottom-full left-3 right-3 mb-2 bg-card border border-border rounded-2xl shadow-2xl p-3 z-40 max-h-[70vh] overflow-y-auto">
      <div className="flex items-start gap-3 mb-3"><div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-border bg-muted"><img src={pendingUpload.base64} className="w-full h-full object-cover" alt="Prévia da foto do ambiente" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold">Foto capturada</p><button type="button" onClick={() => setDestinationOpen(false)} className="p-2 rounded-lg hover:bg-muted" aria-label="Fechar"><X size={15}/></button></div><p className="mt-1 text-[10px] text-muted-foreground">A foto ficou guardada. Agora escolha onde quer salvar.</p></div></div>
      {destinationMode === 'choices' && <div className="grid gap-2">
        <button type="button" onClick={() => setDestinationMode('client')} className="rounded-xl border border-border p-3 text-left hover:border-primary hover:bg-primary/5"><strong className="block text-xs">Criar novo cliente</strong><span className="text-[10px] text-muted-foreground">Cliente + obra + ambiente</span></button>
        <button type="button" onClick={() => setDestinationMode('project')} className="rounded-xl border border-border p-3 text-left hover:border-primary hover:bg-primary/5"><strong className="block text-xs">Usar cliente ou projeto existente</strong><span className="text-[10px] text-muted-foreground">Escolha onde a foto deve ficar</span></button>
        <button type="button" onClick={keepWithoutCadastro} className="rounded-xl border border-border p-3 text-left hover:bg-muted"><strong className="block text-xs">Continuar sem cadastrar</strong><span className="text-[10px] text-muted-foreground">Manter a foto no chat</span></button>
      </div>}
      {destinationMode === 'client' && <div className="space-y-2">
        <button type="button" onClick={() => setDestinationMode('choices')} className="text-[10px] font-semibold text-muted-foreground">← Voltar</button>
        <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome do cliente" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"/>
        <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Nome da obra/projeto" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"/>
        <button type="button" disabled={destinationBusy || !clientName.trim() || !newProjectName.trim()} onClick={() => void createClientProject()} className="w-full rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{destinationBusy ? 'Salvando…' : 'Criar e anexar foto'}</button>
      </div>}
      {destinationMode === 'project' && <div className="space-y-2">
        <button type="button" onClick={() => setDestinationMode('choices')} className="text-[10px] font-semibold text-muted-foreground">← Voltar</button>
        {destinationBusy && <p className="text-[10px] text-muted-foreground">Carregando…</p>}
        {!destinationBusy && projects.length > 0 && <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="">Selecione a obra/projeto</option>{projects.filter(p => !selectedClientId || p.cliente_id === selectedClientId).map(p => <option key={p.id} value={p.id}>{p.nome || p.name || 'Projeto'}</option>)}</select>}
        {!destinationBusy && clients.length > 0 && <select value={selectedClientId} onChange={e => { setSelectedClientId(e.target.value); setSelectedProjectId(''); }} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option value="">Filtrar por cliente (opcional)</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>}
        <button type="button" disabled={destinationBusy || !selectedProjectId} onClick={() => void attachToProject(selectedProjectId)} className="w-full rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{destinationBusy ? 'Anexando…' : 'Anexar foto ao projeto'}</button>
      </div>}
      {destinationError && <p className="mt-2 text-[10px] text-destructive">{destinationError}</p>}
    </div>}

    {pendingUpload && <div className="absolute bottom-full left-0 mb-2 ml-3 p-2 bg-card border border-border rounded-2xl shadow-xl flex items-end gap-3 animate-in slide-in-from-bottom-2">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
        <img src={pendingUpload.base64} className="w-full h-full object-cover" alt="Imagem anexada" />
        <button type="button" aria-label="Remover imagem anexada" onClick={() => { if (pendingUpload.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(pendingUpload.previewUrl); setPendingUpload(null); void clearIaraPendingUpload().catch(() => undefined); }} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"><X size={10} /></button>
      </div>
      <span className="text-[9px] font-bold text-muted-foreground tracking-wide pb-1">{pendingUpload.kind === 'reference' ? 'Referência' : pendingUpload.kind === 'sketch' ? 'Rascunho' : pendingUpload.kind === 'plan' ? 'Planta' : 'Ambiente'}</span>
    </div>}

    {open && <div role="dialog" aria-label="Adicionar ao contexto da IARA" className="absolute bottom-full left-3 right-3 sm:left-3 sm:right-auto mb-2 w-auto sm:w-[min(430px,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-3 z-30">
      <div className="flex items-center justify-between px-1 pb-2">
        <div><p className="text-xs font-bold">Adicionar ao projeto</p><p className="text-[10px] text-muted-foreground">Escolha o tipo de material para a IARA entender o contexto.</p></div>
        <button type="button" aria-label="Fechar menu adicionar" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-muted"><X size={16} /></button>
      </div>

      {showOnboarding && <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3" role="note" aria-label="Como usar os anexos da IARA">
        <div className="flex items-start gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background text-primary border border-primary/15"><HelpCircle size={15} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold">Primeira vez por aqui?</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">Você não precisa saber mexer com IA. É só mandar o que já tem do projeto:</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="rounded-lg bg-background/80 px-2 py-1.5"><strong className="block text-[10px]">📷 Ambiente</strong><span className="text-[9px] text-muted-foreground">foto do local</span></div>
              <div className="rounded-lg bg-background/80 px-2 py-1.5"><strong className="block text-[10px]">🖼️ Referência</strong><span className="text-[9px] text-muted-foreground">modelo ou inspiração</span></div>
              <div className="rounded-lg bg-background/80 px-2 py-1.5"><strong className="block text-[10px]">✏️ Rascunho</strong><span className="text-[9px] text-muted-foreground">desenho à mão</span></div>
              <div className="rounded-lg bg-background/80 px-2 py-1.5"><strong className="block text-[10px]">📐 Planta</strong><span className="text-[9px] text-muted-foreground">planta ou medidas</span></div>
            </div>
            <p className="mt-2 text-[9px] text-muted-foreground">Depois, conte para a IARA o que você quer fazer. Ela usa esse contexto na conversa.</p>
          </div>
        </div>
        <button type="button" onClick={dismissOnboarding} className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[10px] font-semibold hover:bg-muted transition-colors">Entendi</button>
      </div>}

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <button type="button" onClick={() => selectImage(environmentInputRef, 'environment')} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors">
          <Camera size={17} className="shrink-0 text-muted-foreground" /><span><strong className="block text-[11px]">Foto do ambiente</strong><small className="text-[9px] text-muted-foreground">Câmera ou galeria</small></span>
        </button>
        <button type="button" onClick={() => selectImage(referenceInputRef, 'reference')} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors">
          <Image size={17} className="shrink-0 text-muted-foreground" /><span><strong className="block text-[11px]">Foto de referência</strong><small className="text-[9px] text-muted-foreground">Estilo ou inspiração</small></span>
        </button>
        <button type="button" onClick={() => selectImage(sketchInputRef, 'sketch')} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors">
          <PencilLine size={17} className="shrink-0 text-muted-foreground" /><span><strong className="block text-[11px]">Rascunho à mão</strong><small className="text-[9px] text-muted-foreground">Foto do desenho</small></span>
        </button>
        <button type="button" onClick={() => selectImage(planInputRef, 'plan')} className="flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-border hover:border-primary hover:bg-muted transition-colors">
          <Ruler size={17} className="shrink-0 text-muted-foreground" /><span><strong className="block text-[11px]">Planta / medidas</strong><small className="text-[9px] text-muted-foreground">Planta ou cotas</small></span>
        </button>
        <button type="button" onClick={startElevation} className="col-span-2 flex items-center gap-2 text-left px-2.5 py-3 min-h-12 rounded-xl border border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors">
          <ArrowUpFromLine size={17} className="shrink-0 text-primary" /><span><strong className="block text-[11px]">Fazer elevação da planta</strong><small className="text-[9px] text-muted-foreground">Envie a planta e a IARA prepara a elevação</small></span>
        </button>
      </div>

      <div className="border-t border-border pt-2">
        <p className="px-1 mb-1.5 text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Ações da IARA</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SMART_ACTIONS.flatMap(group => group.items.map(action => ({ group, action }))).map(({ group, action }) => {
            const Icon = ICONS[action.id] ?? Command;
            return <button key={action.id} type="button" onClick={() => { dismissOnboarding(); setOpen(false); onSmartAction?.(action); }} aria-label={`${action.label} — ${group.title}`} className="group flex items-center gap-2 text-left px-2.5 py-2.5 min-h-11 rounded-xl border border-border bg-background/70 hover:border-primary/40 hover:bg-primary/5 transition-colors">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors"><Icon size={15} /></span>
              <span className="text-[11px] font-semibold leading-tight">{action.label}</span>
            </button>;
          })}
        </div>
      </div>
    </div>}

    <input ref={environmentInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={e => onImageSelect(e, 'environment')} />
    <input ref={referenceInputRef} type="file" className="hidden" accept="image/*" onChange={e => onImageSelect(e, 'reference')} />
    <input ref={sketchInputRef} type="file" className="hidden" accept="image/*" onChange={e => onImageSelect(e, 'sketch')} />
    <input ref={planInputRef} type="file" className="hidden" accept="image/*" onChange={e => onImageSelect(e, 'plan')} />

    <div className="flex items-end gap-2">
      <div className="flex gap-1 bg-muted p-1 rounded-2xl border border-border shrink-0">
        <button type="button" aria-label="Adicionar foto, referência ou planta" aria-expanded={open} onClick={() => setOpen(v => !v)} className={`p-2.5 min-w-11 min-h-11 rounded-xl transition-all ${open ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-primary'}`}><Plus size={20} /></button>
        <button type="button" aria-label={isListening ? 'Parar gravação' : 'Iniciar gravação'} onClick={toggleRecording} className={`p-2.5 min-w-11 min-h-11 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-muted-foreground hover:text-primary'}`}>{isListening ? <MicOff size={18} /> : <Mic size={18} />}</button>
      </div>
      <div className="flex-1 relative group">
        <textarea aria-label="Mensagem para a IARA" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={isListening ? 'IARA está ouvindo...' : 'Ex.: Quero uma cozinha em L de 2,80 m, com torre quente e portas lisas...'} className="w-full bg-muted border border-border rounded-2xl py-3 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none max-h-32 scrollbar-none min-h-11" rows={1} />
        <button type="button" aria-label="Enviar mensagem" onClick={onSend} className="absolute right-2 bottom-1.5 min-w-9 min-h-9 p-2 bg-primary text-primary-foreground rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all"><Send size={18} /></button>
      </div>
    </div>
  </footer>;
};
