import React, { useState } from 'react';
import { X, Loader2, LogIn, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AuthDialogProps { isOpen: boolean; onClose: () => void; onSuccess: () => void; }
const digits = (v: string) => v.replace(/\D/g, '');
const maskCnpj = (v: string) => { const d = digits(v).slice(0,14); return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'); };

const AuthDialog = ({ isOpen, onClose, onSuccess }: AuthDialogProps) => {
  const [isLogin, setIsLogin] = useState(true); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [company, setCompany] = useState(''); const [cnpj, setCnpj] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  if (!isOpen) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else { onSuccess(); onClose(); }
    } else {
      if (!company.trim()) { setError('Informe o nome da marcenaria.'); setLoading(false); return; }
      if (!/^\d{14}$/.test(digits(cnpj))) { setError('Informe um CNPJ válido com 14 dígitos.'); setLoading(false); return; }
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { name, company, cnpj: digits(cnpj) }, emailRedirectTo: window.location.origin } });
      if (error) setError(error.message); else setSuccess('Verifique seu e-mail para confirmar o cadastro. Depois, complete seu perfil para adicionar bio, links e dados públicos.');
    }
    setLoading(false);
  };
  const inputClass = 'w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-active))] text-sm';
  return <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm overflow-hidden"><div className="flex items-center justify-between p-4 border-b border-border"><h3 className="text-lg font-bold text-foreground flex items-center gap-2"><LogIn size={18} className="text-[hsl(var(--sidebar-active))]" />{isLogin ? 'Entrar' : 'Cadastrar'}</h3><button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"><X size={18}/></button></div><form onSubmit={handleSubmit} className="p-6 space-y-4"><p className="text-sm text-muted-foreground">{isLogin ? 'Entre para continuar seus projetos.' : 'Crie sua conta profissional da marcenaria.'}</p>{!isLogin && <><input type="text" placeholder="Nome completo" value={name} onChange={e=>setName(e.target.value)} required className={inputClass}/><input type="text" placeholder="Nome da marcenaria" value={company} onChange={e=>setCompany(e.target.value)} required className={inputClass}/><label className="block"><span className="text-xs font-bold text-muted-foreground">CNPJ <b className="text-red-500">*</b></span><div className="relative mt-1"><Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input type="text" inputMode="numeric" placeholder="00.000.000/0000-00" value={maskCnpj(cnpj)} onChange={e=>setCnpj(e.target.value)} required className={`${inputClass} pl-9`}/></div></label></>}<input type="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required className={inputClass}/><input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} className={inputClass}/>{error&&<p className="text-red-400 text-sm bg-red-950/50 p-3 rounded-lg">{error}</p>}{success&&<p className="text-emerald-400 text-sm bg-emerald-950/50 p-3 rounded-lg">{success}</p>}<button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-[hsl(var(--sidebar-active))] text-white font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">{loading&&<Loader2 className="animate-spin" size={18}/>} {isLogin?'Entrar':'Criar conta'}</button><p className="text-center text-muted-foreground text-sm">{isLogin?'Não tem conta?':'Já tem conta?'}{' '}<button type="button" onClick={()=>{setIsLogin(!isLogin);setError('');setSuccess('');}} className="text-[hsl(var(--sidebar-active))] font-semibold hover:underline">{isLogin?'Cadastre-se':'Entrar'}</button></p></form></div></div>;
};
export default AuthDialog;
