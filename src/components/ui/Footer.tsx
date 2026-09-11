import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Hammer, Instagram, Linkedin, WalletCards } from 'lucide-react';
import logo from '@/assets/marcenapp-logo.svg';

const FOOTER_LINKS = {
  produto: [
    { label: 'Novo projeto', to: '/?module=novo' },
    { label: 'Estúdio 3D', to: '/?module=studio' },
    { label: 'Orçamento', to: '/?module=orcamento' },
    { label: 'Plano de corte', to: '/?module=corte' },
  ],
  ecossistema: [
    { label: 'Parceiros', to: '/?module=dashboard&section=parceiros' },
    { label: 'Distribuidores', to: '/?module=dashboard&section=distribuidores' },
    { label: 'Contratos', to: '/?module=contrato' },
    { label: 'Clientes', to: '/?module=clientes' },
  ],
  acesso: [
    { label: 'Central de uso', to: '/?module=billing' },
    { label: 'Entrar', to: '/auth' },
    { label: 'Começar agora', to: '/auth' },
  ],
};

export const Footer = () => (
  <footer className="hidden border-t border-slate-800 bg-slate-950 text-slate-300 md:block" role="contentinfo">
    <div className="mx-auto max-w-7xl px-8 py-12">
      <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="Marcenapp" className="h-9 w-9 rounded-xl" />
            <div><p className="font-black text-white">MARCENAPP</p><p className="text-xs text-slate-500">Do projeto à produção, tudo no lugar.</p></div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">Plataforma para profissionais que projetam e produzem móveis sob medida.</p>
          <Link to="/auth" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-600/20">Começar agora <ArrowRight size={15} /></Link>
          <div className="mt-5 flex gap-2"><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"><Instagram size={14} /></a><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"><Linkedin size={14} /></a></div>
        </div>
        <div><p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[.18em] text-slate-500"><Hammer size={11} /> Produto</p><ul className="mt-4 space-y-3 text-sm font-semibold">{FOOTER_LINKS.produto.map(link => <li key={link.label}><Link to={link.to} className="hover:text-white">{link.label}</Link></li>)}</ul></div>
        <div><p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[.18em] text-slate-500"><FileText size={11} /> Ecossistema</p><ul className="mt-4 space-y-3 text-sm font-semibold">{FOOTER_LINKS.ecossistema.map(link => <li key={link.label}><Link to={link.to} className="hover:text-white">{link.label}</Link></li>)}</ul></div>
        <div><p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[.18em] text-slate-500"><WalletCards size={11} /> Acesso</p><ul className="mt-4 space-y-3 text-sm font-semibold">{FOOTER_LINKS.acesso.map(link => <li key={link.label}><Link to={link.to} className="hover:text-white">{link.label}</Link></li>)}</ul></div>
      </div>
      <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Marcenapp. Todos os direitos reservados.</p><p>Do projeto à produção, tudo no lugar.</p></div>
    </div>
  </footer>
);

export default Footer;
