import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Camera, Check, Copy, ExternalLink, Instagram, Link2, MapPin, Save, Share2, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type LinkItem = { label: string; url: string };
type Form = { name: string; company: string; trade_name: string; cnpj: string; cpf: string; phone: string; bio: string; address: string; city: string; state: string; website_url: string; instagram_url: string; facebook_url: string; whatsapp_url: string; other_links: LinkItem[]; specialties: string[]; public_slug: string; is_public: boolean; avatar_url: string };

const emptyForm: Form = { name: '', company: '', trade_name: '', cnpj: '', cpf: '', phone: '', bio: '', address: '', city: '', state: '', website_url: '', instagram_url: '', facebook_url: '', whatsapp_url: '', other_links: [], specialties: [], public_slug: '', is_public: false, avatar_url: '' };
const onlyDigits = (v: string) => v.replace(/\D/g, '');
const slugify = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const maskCnpj = (v: string) => { const d = onlyDigits(v).slice(0, 14); return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'); };

export default function PerfilMarcenaria() {
  const { user, profile } = useAuth();
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newLink, setNewLink] = useState<LinkItem>({ label: '', url: '' });
  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (data) setForm({ ...emptyForm, ...data, other_links: Array.isArray(data.other_links) ? data.other_links : [], specialties: Array.isArray(data.specialties) ? data.specialties : [] });
      setLoading(false);
    })();
  }, [user]);

  const publicUrl = useMemo(() => form.public_slug ? `${window.location.origin}/marceneiro/${form.public_slug}` : '', [form.public_slug]);
  const set = (key: keyof Form, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const addLink = () => { if (!newLink.label.trim() || !newLink.url.trim()) return; set('other_links', [...form.other_links, newLink]); setNewLink({ label: '', url: '' }); };
  const addSpecialty = () => { const v = newSpecialty.trim(); if (!v || form.specialties.includes(v)) return; set('specialties', [...form.specialties, v]); setNewSpecialty(''); };

  const save = async () => {
    setMessage('');
    if (!onlyDigits(form.cnpj).match(/^\d{14}$/)) { setMessage('Informe um CNPJ válido com 14 dígitos para concluir o cadastro da marcenaria.'); return; }
    if (!form.company.trim()) { setMessage('Informe o nome da marcenaria.'); return; }
    setSaving(true);
    const payload = { ...form, cnpj: onlyDigits(form.cnpj), cpf: onlyDigits(form.cpf), public_slug: slugify(form.public_slug || form.company || form.name) };
    const { error } = await (supabase as any).from('profiles').update(payload).eq('user_id', user?.id);
    setSaving(false);
    if (error) setMessage(error.code === '23505' ? 'Esse endereço público já está em uso. Escolha outro.' : 'Não foi possível salvar agora.');
    else { setForm(prev => ({ ...prev, public_slug: payload.public_slug })); setMessage('Perfil salvo com sucesso.'); }
  };

  const copyShare = async () => { if (!publicUrl) return; await navigator.clipboard?.writeText(publicUrl); setMessage('Link público copiado.'); };

  if (!user) return <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 text-center"><UserRound className="mx-auto mb-3 text-indigo-600" size={32}/><h2 className="text-xl font-black">Entre para editar seu perfil</h2></div>;
  if (loading) return <div className="max-w-4xl mx-auto h-64 rounded-3xl bg-white animate-pulse"/>;

  return <div className="max-w-5xl mx-auto space-y-6">
    <div className="rounded-3xl bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
      <div><p className="text-indigo-300 text-xs font-black uppercase tracking-widest">Meu espaço</p><h1 className="text-2xl md:text-3xl font-black mt-1">Perfil da marcenaria</h1><p className="text-slate-300 mt-2 max-w-2xl">Seu cadastro vira sua identidade dentro do MARCENAPP e, se quiser, uma vitrine que você pode compartilhar.</p></div>
      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10"><Building2 size={30}/></div>
    </div>

    <div className="grid lg:grid-cols-[1.4fr_.8fr] gap-6">
      <section className="bg-white border border-slate-200 rounded-3xl p-5 md:p-7 space-y-7">
        <div><h2 className="font-black text-lg">Identidade profissional</h2><p className="text-sm text-slate-500 mt-1">Os campos fiscais são usados para documentos e propostas.</p></div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Seu nome" value={form.name} onChange={v => set('name', v)} placeholder={profile?.name || 'Nome do responsável'} />
          <Field label="Nome da marcenaria" required value={form.company} onChange={v => set('company', v)} placeholder="Ex.: Marcenaria Silva" />
          <Field label="Nome fantasia" value={form.trade_name} onChange={v => set('trade_name', v)} placeholder="Como seus clientes conhecem" />
          <Field label="CNPJ" required value={maskCnpj(form.cnpj)} onChange={v => set('cnpj', onlyDigits(v))} placeholder="00.000.000/0000-00" />
          <Field label="CPF do responsável" value={form.cpf} onChange={v => set('cpf', onlyDigits(v))} placeholder="Opcional" />
          <Field label="WhatsApp / telefone" value={form.phone} onChange={v => set('phone', v)} placeholder="(00) 00000-0000" />
        </div>
        <Field label="Bio da marcenaria" value={form.bio} onChange={v => set('bio', v)} placeholder="Conte em poucas linhas o que sua marcenaria faz e o seu diferencial." multiline />
        <div><label className="text-xs font-black uppercase tracking-wide text-slate-600">Especialidades</label><div className="flex gap-2 mt-2"><input value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSpecialty()} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Ex.: cozinhas planejadas"/><button onClick={addSpecialty} className="px-4 rounded-xl bg-slate-900 text-white font-bold">Adicionar</button></div><div className="flex flex-wrap gap-2 mt-3">{form.specialties.map(s => <button key={s} onClick={() => set('specialties', form.specialties.filter(x => x !== s))} className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">{s} ×</button>)}</div></div>
        <div><h2 className="font-black text-lg">Localização</h2><div className="grid md:grid-cols-3 gap-4 mt-3"><Field label="Endereço" value={form.address} onChange={v => set('address', v)} placeholder="Opcional"/><Field label="Cidade" value={form.city} onChange={v => set('city', v)} placeholder="Cidade"/><Field label="UF" value={form.state} onChange={v => set('state', v)} placeholder="SP"/></div></div>
        <div><h2 className="font-black text-lg">Presença digital</h2><p className="text-sm text-slate-500 mt-1">Links opcionais para Instagram, site, Facebook, WhatsApp ou outros negócios.</p><div className="grid md:grid-cols-2 gap-4 mt-3"><Field label="Site" value={form.website_url} onChange={v => set('website_url', v)} placeholder="https://..."/><Field label="Instagram" value={form.instagram_url} onChange={v => set('instagram_url', v)} placeholder="https://instagram.com/..."/><Field label="Facebook" value={form.facebook_url} onChange={v => set('facebook_url', v)} placeholder="https://facebook.com/..."/><Field label="WhatsApp" value={form.whatsapp_url} onChange={v => set('whatsapp_url', v)} placeholder="https://wa.me/..."/></div></div>
        <div><div className="flex items-center gap-2"><Link2 size={18} className="text-indigo-600"/><h3 className="font-bold">Outros links</h3></div><div className="grid md:grid-cols-[.7fr_1.3fr_auto] gap-2 mt-3"><input value={newLink.label} onChange={e => setNewLink({...newLink,label:e.target.value})} className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Nome do link"/><input value={newLink.url} onChange={e => setNewLink({...newLink,url:e.target.value})} className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="https://..."/><button onClick={addLink} className="rounded-xl bg-slate-100 px-4 font-bold">Adicionar</button></div>{form.other_links.map((l,i)=><div key={`${l.url}-${i}`} className="mt-2 flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold">{l.label}</span><button onClick={()=>set('other_links',form.other_links.filter((_,x)=>x!==i))} className="text-red-500 font-bold">Remover</button></div>)}</div>
      </section>

      <aside className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6"><div className="flex items-center gap-3"><div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black">{(form.company || form.name || 'M').charAt(0).toUpperCase()}</div><div><p className="font-black">{form.company || 'Sua marcenaria'}</p><p className="text-xs text-slate-500">{form.city ? `${form.city}${form.state ? ` · ${form.state}` : ''}` : 'Complete seu perfil'}</p></div></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><div><p className="font-bold text-sm">Vitrine pública</p><p className="text-xs text-slate-500 mt-1">Mostra bio, especialidades e links. Não mostra CPF/CNPJ.</p></div><button onClick={()=>set('is_public',!form.is_public)} className={`w-12 h-7 rounded-full p-1 transition ${form.is_public?'bg-indigo-600':'bg-slate-300'}`}><span className={`block w-5 h-5 bg-white rounded-full transition ${form.is_public?'translate-x-5':''}`}/></button></div></div></section>
        <section className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 space-y-4"><h3 className="font-black">Seu link</h3><div><label className="text-xs font-bold text-slate-500">Endereço público</label><input value={form.public_slug} onChange={e=>set('public_slug',slugify(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder={slugify(form.company || form.name || 'minha-marcenaria')}/></div>{publicUrl && <div className="flex gap-2"><button onClick={copyShare} className="flex-1 rounded-xl bg-slate-900 text-white py-2.5 font-bold flex items-center justify-center gap-2"><Copy size={16}/> Copiar link</button><a href={publicUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-100 px-4 flex items-center justify-center"><ExternalLink size={16}/></a></div>}</section>
        <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5"><div className="flex gap-3"><Share2 className="text-indigo-600 shrink-0"/><div><p className="font-black text-indigo-950">Feito para compartilhar</p><p className="text-sm text-indigo-800 mt-1">Depois você poderá usar essa identidade em propostas, apresentação do projeto e compartilhamento com o cliente.</p></div></div></section>
      </aside>
    </div>
    <div className="sticky bottom-4 flex items-center justify-end gap-3"><span className="text-sm font-semibold text-slate-500">{message}</span><button onClick={save} disabled={saving} className="rounded-2xl bg-indigo-600 text-white px-6 py-3 font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-60"><Save size={18}/>{saving?'Salvando...':'Salvar perfil'}</button></div>
  </div>;
}

function Field({ label, value, onChange, placeholder, required, multiline }: {label:string;value:string;onChange:(v:string)=>void;placeholder?:string;required?:boolean;multiline?:boolean}) { return <label className="block"><span className="text-xs font-black uppercase tracking-wide text-slate-600">{label}{required && <b className="text-red-500"> *</b>}</span>{multiline?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={4} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100"/>:<input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100"/>}</label>; }
