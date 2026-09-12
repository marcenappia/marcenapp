import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Cloud, Flame, Gift, Image as ImageIcon, Loader2, Plus, Sparkles, Trophy, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Props { navigateTo?: (id: string, params?: Record<string, string>) => void; }
interface OfflineEntry { id: string; text: string; createdAt: string; photoDataUrl?: string; photoType?: string; }
interface DiaryRow { id: string; created_at: string; metadata?: Record<string, unknown> | null; foto_path?: string | null; }

const queueKey = (userId: string) => `marcenapp:diario:offline:${userId}`;
function readQueue(userId: string): OfflineEntry[] { try { return JSON.parse(localStorage.getItem(queueKey(userId)) || '[]') as OfflineEntry[]; } catch { return []; } }
function writeQueue(userId: string, value: OfflineEntry[]) { localStorage.setItem(queueKey(userId), JSON.stringify(value)); }
async function fileToDataUrl(file: File) { return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
async function dataUrlToBlob(dataUrl: string) { return (await fetch(dataUrl)).blob(); }

export default function DiarioFreeLayer({ navigateTo }: Props) {
  const { user } = useAuth();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [queue, setQueue] = useState<OfflineEntry[]>([]);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [entries, setEntries] = useState<DiaryRow[]>([]);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!user) return;
    setQueue(readQueue(user.id));
    const { data } = await supabase.from('diario_entradas').select('id,created_at,metadata,foto_path').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    setEntries((data || []) as DiaryRow[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void refresh();
    const onOnline = () => setOnline(true); const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [user, refresh]);

  const sync = useCallback(async () => {
    if (!user || !navigator.onLine || syncing) return;
    const pending = readQueue(user.id); if (!pending.length) return;
    setSyncing(true); setMessage('Sincronizando seus registros…');
    const remaining: OfflineEntry[] = [];
    for (const item of pending) {
      try {
        let fotoPath: string | null = null;
        if (item.photoDataUrl) {
          const blob = await dataUrlToBlob(item.photoDataUrl);
          fotoPath = `${user.id}/diario/${item.id}.${(item.photoType || 'image/jpeg').split('/')[1] || 'jpg'}`;
          const { error } = await supabase.storage.from('obras').upload(fotoPath, blob, { upsert: true, contentType: item.photoType || 'image/jpeg' });
          if (error) throw error;
        }
        const { error } = await supabase.from('diario_entradas').insert({ user_id: user.id, tipo: fotoPath ? 'foto' : 'texto', texto: item.text || 'Registro feito offline.', categoria: 'geral', importante: false, foto_path: fotoPath, metadata: { origem: 'offline', criado_offline_em: item.createdAt } });
        if (error) throw error;
      } catch { remaining.push(item); }
    }
    writeQueue(user.id, remaining); setQueue(remaining); setMessage(remaining.length ? 'Ainda há registros aguardando conexão.' : 'Tudo sincronizado.'); setSyncing(false); void refresh();
  }, [user, syncing, refresh]);

  useEffect(() => { if (online) void sync(); }, [online, sync]);

  const capture = async () => {
    if (!user || (!text.trim() && !photo)) return;
    setSaving(true); setMessage('');
    try {
      const item: OfflineEntry = { id: crypto.randomUUID(), text: text.trim(), createdAt: new Date().toISOString() };
      if (photo) { item.photoDataUrl = await fileToDataUrl(photo); item.photoType = photo.type; }
      const next = [...readQueue(user.id), item]; writeQueue(user.id, next); setQueue(next); setText(''); setPhoto(null);
      setMessage(online ? 'Registro guardado. Sincronizando…' : 'Guardado neste aparelho. Vai sincronizar quando a conexão voltar.');
      if (online) void sync();
    } catch { setMessage('Não foi possível guardar este registro neste aparelho.'); }
    finally { setSaving(false); }
  };

  const total = entries.length + queue.length;
  const streak = useMemo(() => {
    const days = new Set<string>(entries.map(e => new Date(e.created_at).toLocaleDateString('sv-SE')));
    queue.forEach(e => days.add(new Date(e.createdAt).toLocaleDateString('sv-SE')));
    let cursor = new Date(); let count = 0;
    while (days.has(cursor.toLocaleDateString('sv-SE'))) { count += 1; cursor.setDate(cursor.getDate() - 1); }
    return count;
  }, [entries, queue]);
  const level = Math.max(1, Math.floor(total / 10) + 1); const progress = total % 10;
  if (!user) return null;

  return <section className="grid gap-4 lg:grid-cols-[1.5fr_.9fr]">
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-700"><Gift size={15} /> Diário grátis</div><h3 className="mt-1 text-lg font-black text-slate-900">Seu registro é seu. Mesmo sem internet.</h3><p className="mt-1 max-w-xl text-sm text-slate-600">Texto, foto e registros de campo ficam disponíveis sem cobrar créditos. Quando a conexão voltar, o que você fez offline é sincronizado.</p></div>
        <div className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${online ? 'bg-white text-emerald-700' : 'bg-slate-900 text-white'}`}>{online ? <><Wifi size={14} /> Online</> : <><WifiOff size={14} /> Offline</>}</div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Escreva uma anotação rápida…" className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700"><ImageIcon size={16} /> Foto<input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setPhoto(e.target.files?.[0] || null)} /></label>
        <button type="button" disabled={saving || (!text.trim() && !photo)} onClick={() => void capture()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40"><Plus size={16} /> {saving ? 'Salvando…' : 'Registrar'}</button>
      </div>
      {photo && <p className="mt-2 text-xs font-semibold text-emerald-800">Foto pronta: {photo.name}</p>}{message && <p className="mt-3 text-xs font-semibold text-slate-600">{message}</p>}
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Trophy size={17} className="text-amber-500" /><h3 className="font-black text-slate-900">Evolução</h3></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">Nível {level}</span></div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-xl">{total}</strong><span className="text-[11px] font-bold text-slate-500">registros</span></div><div className="rounded-xl bg-orange-50 p-3"><strong className="flex items-center justify-center gap-1 text-xl"><Flame size={16} /> {streak}</strong><span className="text-[11px] font-bold text-slate-500">dias seguidos</span></div><div className="rounded-xl bg-indigo-50 p-3"><strong className="block text-xl">{progress}/10</strong><span className="text-[11px] font-bold text-slate-500">próximo nível</span></div></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${Math.max(8, progress * 10)}%` }} /></div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Sparkles size={14} /> Registro e organização valem progresso. A IA é uma camada paga separada.</div>
      {queue.length > 0 && <button type="button" onClick={() => void sync()} disabled={!online || syncing} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-indigo-600 disabled:opacity-40">{syncing ? <Loader2 size={13} className="animate-spin" /> : <Cloud size={13} />} {queue.length} pendente{queue.length > 1 ? 's' : ''} para sincronizar</button>}
      {online && queue.length === 0 && <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-700"><Cloud size={13} /> Tudo sincronizado</div>}
    </div>
    <div className="lg:col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-700"><Sparkles size={15} /> Quando quiser inteligência</div><h3 className="mt-1 text-base font-black text-slate-900">Use a IARA para transformar seus registros em trabalho.</h3><p className="mt-1 text-sm text-slate-600">Criar projeto, interpretar medidas, gerar desenho, renderizar ou analisar o material usa IA e consome créditos. O Diário continua grátis.</p></div><button type="button" onClick={() => navigateTo?.('studio')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-indigo-700"><Sparkles size={15} /> Usar IARA</button></div>
    </div>
  </section>;
}
