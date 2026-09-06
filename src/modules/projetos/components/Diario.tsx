import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, BookOpen, Camera, ChevronRight, CircleStop, FileText, Mic, Star, Trash2 } from 'lucide-react';
import { Card, Button } from '@/components/marcenaria/shared';
import { adicionarEntrada, carregarDiario, salvarDiario, type DiarioEntrada } from '../services/diarioStorage';
import type { ProjectData } from '../types';

const contextKey = 'marcenapp_studio_diary_context';

const resizePhoto = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject; img.src = String(reader.result);
  };
  reader.onerror = reject; reader.readAsDataURL(file);
});

interface Props { project?: ProjectData; navigateTo?: (id: string, params?: Record<string, string>) => void; }

const DiarioModule = ({ project, navigateTo }: Props) => {
  const projectId = project?.id || 'local';
  const [entries, setEntries] = useState<DiarioEntrada[]>([]);
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => { setEntries(carregarDiario(projectId)); }, [projectId]);

  const addNote = (extra: Partial<DiarioEntrada> = {}) => {
    if (!text.trim() && !extra.fotoDataUrl && !extra.audioDataUrl) return;
    const next = adicionarEntrada(projectId, { tipo: extra.tipo || 'nota', texto: text.trim(), ...extra });
    setEntries(next); setText('');
  };

  const addPhoto = async (file?: File) => { if (!file) return; try { const fotoDataUrl = await resizePhoto(file); addNote({ tipo: 'foto', fotoDataUrl }); } catch { /* foto não suportada */ } };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => { if (e.data.size) audioChunks.current.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      const blob = new Blob(audioChunks.current, { type: recorder.mimeType || 'audio/webm' });
      const reader = new FileReader(); reader.onloadend = () => { const url = String(reader.result); setAudioUrl(url); addNote({ tipo: 'audio', audioDataUrl: url }); }; reader.readAsDataURL(blob);
    };
    recorder.start(); mediaRecorder.current = recorder; setRecording(true);
  };
  const stopRecording = () => { mediaRecorder.current?.stop(); mediaRecorder.current = null; setRecording(false); };

  const sendTo = (entry: DiarioEntrada, target: string) => {
    localStorage.setItem(contextKey, JSON.stringify({ projectId, texto: entry.texto, tipo: entry.tipo, createdAt: entry.createdAt }));
    navigateTo?.(target, projectId === 'local' ? {} : { projeto: projectId });
  };

  const toggleImportant = (entry: DiarioEntrada) => { const next = entries.map(item => item.id === entry.id ? { ...item, importante: !item.importante } : item); setEntries(next); salvarDiario(projectId, next); };
  const removeEntry = (entry: DiarioEntrada) => { const next = entries.filter(item => item.id !== entry.id); setEntries(next); salvarDiario(projectId, next); };

  return <div className="space-y-5 animate-in fade-in duration-500">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BookOpen className="text-amber-600"/> Plancheta digital do marceneiro</h2><p className="text-slate-500">Anote, fotografe ou grave. O registro acompanha o projeto.</p></div><span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-2">Projeto: {project?.id ? project.id.slice(0, 8) : 'local'}</span></div>

    <Card className="p-4 border-amber-200 bg-amber-50/60"><div className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileText size={18} className="text-amber-600"/> Nova anotação</div><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ex.: cliente pediu nicho à direita; tomada fica 35 cm do piso; conferir medida da janela..." className="mt-3 w-full min-h-28 rounded-xl border border-amber-200 bg-white p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-300"/><div className="flex flex-wrap gap-2 mt-3"><Button onClick={() => addNote()} disabled={!text.trim()} icon={FileText}>Salvar nota</Button><Button variant="secondary" onClick={() => photoInput.current?.click()} icon={Camera}>Adicionar foto</Button><Button variant={recording ? 'danger' : 'secondary'} onClick={recording ? stopRecording : startRecording} icon={recording ? CircleStop : Mic}>{recording ? 'Parar gravação' : 'Gravar áudio'}</Button><input ref={photoInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { addPhoto(e.target.files?.[0]); e.currentTarget.value = ''; }}/></div>{recording && <div className="mt-2 text-xs text-red-600 flex items-center gap-1"><AudioLines size={14}/> Gravando… fale normalmente. Toque em parar quando terminar.</div>}{audioUrl && <audio className="mt-3 w-full" controls src={audioUrl}/>}</Card>

    <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-800">Histórico</h3><p className="text-xs text-slate-500">{entries.length} registro(s) neste projeto</p></div></div>
    {entries.length === 0 ? <Card className="p-10 text-center border-dashed"><BookOpen size={30} className="mx-auto text-slate-300"/><p className="mt-3 font-semibold text-slate-600">Comece a usar sua plancheta</p><p className="text-xs text-slate-500 mt-1">O que você registrar aqui poderá ser levado para o Estúdio, orçamento, produção e corte.</p></Card> : <div className="space-y-3">{entries.map(entry => <Card key={entry.id} className="p-4"><div className="flex items-start gap-3"><div className="shrink-0 rounded-xl bg-slate-100 p-2 text-slate-600">{entry.tipo === 'foto' ? <Camera size={18}/> : entry.tipo === 'audio' ? <Mic size={18}/> : <FileText size={18}/>}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-[10px] uppercase font-bold text-slate-400">{new Date(entry.createdAt).toLocaleString('pt-BR')}</span><button onClick={() => toggleImportant(entry)} title="Marcar importante" className={entry.importante ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}><Star size={16} fill={entry.importante ? 'currentColor' : 'none'}/></button></div>{entry.texto && <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{entry.texto}</p>}{entry.fotoDataUrl && <img src={entry.fotoDataUrl} alt="Registro do diário" className="mt-3 max-h-56 w-full object-cover rounded-xl border border-slate-200"/>}{entry.audioDataUrl && <audio className="mt-3 w-full" controls src={entry.audioDataUrl}/>}<div className="flex flex-wrap gap-2 mt-3"><button onClick={() => { setSelectedId(selectedId === entry.id ? null : entry.id); }} className="text-xs font-semibold text-indigo-600">Conectar…</button><button onClick={() => removeEntry(entry)} className="text-xs font-semibold text-red-500 flex items-center gap-1"><Trash2 size={13}/> excluir</button></div>{selectedId === entry.id && <div className="mt-2 flex flex-wrap gap-2 rounded-xl bg-slate-50 p-2"><Button variant="secondary" className="text-xs" onClick={() => sendTo(entry, 'studio')} icon={ChevronRight}>Estúdio</Button><Button variant="secondary" className="text-xs" onClick={() => sendTo(entry, 'orcamento')} icon={ChevronRight}>Orçamento</Button><Button variant="secondary" className="text-xs" onClick={() => sendTo(entry, 'corte')} icon={ChevronRight}>Produção / Corte</Button></div>}</div></div></Card>)}</div>}
  </div>;
};

export default DiarioModule;
