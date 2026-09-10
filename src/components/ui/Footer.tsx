import React from 'react';
import { Link } from 'react-router-dom';
import { Hammer, Calculator, FileText, Instagram, Linkedin, Github } from 'lucide-react';
import logo from '@/assets/marcenapp-logo.svg';

const FOOTER_LINKS = {
  produto: [
    { label: 'Novo Projeto', to: '/?module=novo' },
    { label: 'Estúdio 3D', to: '/?module=studio' },
    { label: 'Orçamento', to: '/?module=orcamento' },
    { label: 'Plano de Corte', to: '/?module=corte' },
  ],
  empresa: [
    { label: 'Contratos', to: '/?module=contrato' },
    { label: 'Clientes', to: '/?module=clientes' },
    { label: 'Diário de Obra', to: '/?module=diario' },
  ],
  suporte: [
    { label: 'Autenticar', to: '/auth' },
    { label: 'Início', to: '/?module=dashboard' },
  ],
};

export const Footer = () => (
  <footer className="hidden md:block bg-slate-900 border-t border-slate-800 text-slate-400" role="contentinfo">
    <div className="max-w-7xl mx-auto px-8 pt-12 pb-8">
      <div className="grid grid-cols-4 gap-8 mb-10">
        <div className="col-span-1">
          <div className="flex items-center gap-2.5 mb-3">
            <img src={logo} alt="Marcenapp" className="w-9 h-9 rounded-full border-2 border-indigo-500" />
            <span className="text-white font-black tracking-tight text-sm">
              MARCENA<span className="text-indigo-400">PP</span>
            </span>
          </div>
          <p className="text-[13px] leading-relaxed">
            Plataforma 4.0 para marcenarias. Orçamento, projeto 3D, plano de corte e contratos — tudo em um só lugar.
          </p>
          <div className="flex gap-3 mt-4">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 flex items-center justify-center transition-all"
              aria-label="Instagram"
            >
              <Instagram size={14} />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 flex items-center justify-center transition-all"
              aria-label="LinkedIn"
            >
              <Linkedin size={14} />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 flex items-center justify-center transition-all"
              aria-label="GitHub"
            >
              <Github size={14} />
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Hammer size={10} /> Produto
          </h3>
          <ul className="space-y-2.5">
            {FOOTER_LINKS.produto.map(l => (
              <li key={l.label}>
                <Link to={l.to} className="text-[13px] hover:text-white transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <FileText size={10} /> Empresa
          </h3>
          <ul className="space-y-2.5">
            {FOOTER_LINKS.empresa.map(l => (
              <li key={l.label}>
                <Link to={l.to} className="text-[13px] hover:text-white transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Calculator size={10} /> Suporte
          </h3>
          <ul className="space-y-2.5">
            {FOOTER_LINKS.suporte.map(l => (
              <li key={l.label}>
                <Link to={l.to} className="text-[13px] hover:text-white transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px]">
          © {new Date().getFullYear()} Marcenapp OS. Todos os direitos reservados.
        </p>
        <p className="text-[11px] text-slate-600">
          Feito para marceneiros que não param de crescer.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
