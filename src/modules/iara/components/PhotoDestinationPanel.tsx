import { useEffect, useMemo, useRef, useState } from 'react';
import { BriefcaseBusiness, FolderPlus, LoaderCircle, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { blobToDataUrl } from '../services/pendingUploadStorage';
import {
  attachIaraEnvironmentPhoto,
  createIaraClientAndProject,
  createIaraProjectForClient,
  loadIaraPhotoDestinations,
  type PhotoDestination,
} from '../services/photoDestination';

type PendingPhoto = { base64?: string; blob?: Blob; previewUrl?: string; kind?: string; captureId?: string };
type DestinationMode = 'menu' | 'new-client' | 'existing-client' | 'existing-project';
type ClientOption = { id: string; nome: string };
type ProjectOption = { id: string; nome: string | null; name: string | null; cliente_id: string | null };

interface PhotoDestinationPanelProps {
  photo: PendingPhoto;
  currentProjectId?: string | null;
  onCancel: () => void;
  onAttached: (destination: PhotoDestination) => void | Promise<void>;
}

export function PhotoDestinationPanel({ photo, currentProjectId = null, onCancel, onAttached }: PhotoDestinationPanelProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<DestinationMode>('menu');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createdTargetRef = useRef<{ key: string; projectId: string; clientId: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadIaraPhotoDestinations(user.id).then(data => {
      if (cancelled) return;
      setClients(data.clients as ClientOption[]);
      setProjects(data.projects as ProjectOption[]);
    }).catch(() => { if (!cancelled) setError('Não foi possível carregar seus clientes e obras.'); });
    return () => { cancelled = true; };
  }, [user]);

  const preview = photo.previewUrl || photo.base64 || '';
  const selectedProject = useMemo(() => projects.find(project => project.id === projectId), [projectId, projects]);

  const dataUrl = async () => {
    if (photo.blob) return blobToDataUrl(photo.blob);
    if (photo.base64?.startsWith('data:')) return photo.base64;
    throw new Error('A foto não está mais disponível. Tire outra foto e tente novamente.');
  };

  const attach = async (targetProjectId: string, targetClientId?: string | null) => {
    if (!user) throw new Error('Entre na sua conta para cadastrar esta foto.');
    return attachIaraEnvironmentPhoto({ userId: user.id, projectId: targetProjectId, clientId: targetClientId, dataUrl: await dataUrl(), correlationId: photo.captureId });
  };

  const attachCurrentProject = async () => {
    if (!user || !currentProjectId || busy) return;
    setError(null);
    setBusy(true);
    try {
      const destination = await attach(currentProjectId);
      await onAttached(destination);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível cadastrar a foto.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!user || busy) return;
    setError(null);
    setBusy(true);
    try {
      let destination: PhotoDestination;
      if (mode === 'new-client') {
        if (!clientName.trim() || !projectName.trim()) throw new Error('Informe o nome do cliente e da obra.');
        const key = `new-client:${clientName.trim().toLowerCase()}:${projectName.trim().toLowerCase()}`;
        let target = createdTargetRef.current?.key === key ? createdTargetRef.current : null;
        if (!target) {
          const created = await createIaraClientAndProject({ userId: user.id, clientName, projectName });
          target = { key, projectId: created.project.id, clientId: created.client.id };
          createdTargetRef.current = target;
        }
        destination = await attach(target.projectId, target.clientId);
      } else if (mode === 'existing-client') {
        if (!clientId || !projectName.trim()) throw new Error('Escolha o cliente e informe o nome da obra.');
        const key = `existing-client:${clientId}:${projectName.trim().toLowerCase()}`;
        let target = createdTargetRef.current?.key === key ? createdTargetRef.current : null;
        if (!target) {
          const project = await createIaraProjectForClient({ userId: user.id, clientId, projectName });
          target = { key, projectId: project.id, clientId };
          createdTargetRef.current = target;
        }
        destination = await attach(target.projectId, target.clientId);
      } else {
        if (!selectedProject) throw new Error('Escolha uma obra.');
        destination = await attach(selectedProject.id, selectedProject.cliente_id);
      }
      await onAttached(destination);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível cadastrar a foto.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="absolute bottom-full left-3 right-3 z-40 mb-2 max-h-[72vh] overflow-y-auto rounded-lg border border-border bg-card p-3 shadow-2xl sm:left-auto sm:w-[420px]" aria-label="Escolher destino da foto">
    <div className="flex items-start gap-3">
      <img src={preview} alt="Foto do ambiente aguardando destino" className="h-16 w-16 shrink-0 rounded-md border border-border object-cover" />
      <div className="min-w-0 flex-1"><p className="text-sm font-bold text-foreground">Onde esta foto deve ficar?</p><p className="mt-1 text-xs text-muted-foreground">A foto está guardada enquanto você escolhe.</p></div>
      <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Cancelar foto"><X /></Button>
    </div>

    {mode === 'menu' ? <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {currentProjectId && <Button type="button" variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" disabled={busy} onClick={() => void attachCurrentProject()}><BriefcaseBusiness />Anexar ao projeto atual</Button>}
      <Button type="button" variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => setMode('new-client')}><UserPlus />Criar cliente e obra</Button>
      <Button type="button" variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => setMode('existing-client')} disabled={clients.length === 0}><FolderPlus />Nova obra para cliente</Button>
      <Button type="button" variant="outline" className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => setMode('existing-project')} disabled={projects.length === 0}><BriefcaseBusiness />Anexar a obra existente</Button>
    </div> : <div className="mt-3 space-y-2">
      {mode === 'new-client' && <input aria-label="Nome do cliente" value={clientName} onChange={event => setClientName(event.target.value)} placeholder="Nome do cliente" className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />}
      {mode === 'existing-client' && <select aria-label="Cliente existente" value={clientId} onChange={event => setClientId(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option value="">Escolha o cliente</option>{clients.map(client => <option key={client.id} value={client.id}>{client.nome}</option>)}</select>}
      {(mode === 'new-client' || mode === 'existing-client') && <input aria-label="Nome da obra" value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="Nome da obra" className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />}
      {mode === 'existing-project' && <select aria-label="Obra existente" value={projectId} onChange={event => setProjectId(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option value="">Escolha a obra</option>{projects.map(project => <option key={project.id} value={project.id}>{project.nome || project.name || 'Obra sem nome'}</option>)}</select>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 pt-1"><Button type="button" variant="outline" className="flex-1" onClick={() => { setMode('menu'); setError(null); }}>Voltar</Button><Button type="button" className="flex-1" disabled={busy} onClick={() => void submit()}>{busy ? <><LoaderCircle className="animate-spin" />Salvando</> : 'Salvar foto'}</Button></div>
    </div>}
  </section>;
}