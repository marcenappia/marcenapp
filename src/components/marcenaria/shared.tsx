import React from 'react';
import { X, ChevronDown, Sofa, Box, Coffee, Leaf, Gem, Briefcase } from 'lucide-react';

// --- API KEY ---
export const API_KEY = "AIzaSyDXpH9QbeiMYTfU3CZIeoAr3nQE3REz-s4";

// --- BUTTON ---
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark' | 'magic';
interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  title?: string;
}
export const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled, title }: ButtonProps) => {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 active:bg-indigo-800",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
    ghost: "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
    dark: "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700",
    magic: "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-900/20"
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-4 py-3 sm:py-2.5 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2 touch-manipulation ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// --- CARD ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}
export const Card = ({ children, className = "", onClick }: CardProps) => (
  <div
    className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

// --- INPUT GROUP ---
interface InputGroupProps {
  label: string;
  value: string | number;
  onChange: (val: string | number) => void;
  type?: string;
  suffix?: string;
  prefix?: string;
  placeholder?: string;
}
export const InputGroup = ({ label, value, onChange, type = "number", suffix, prefix, placeholder }: InputGroupProps) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-3 text-slate-400">{prefix}</span>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        className={`w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 ${prefix ? 'pl-8' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'} text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
      />
      {suffix && <span className="absolute right-3 text-slate-400 text-sm">{suffix}</span>}
    </div>
  </div>
);

// --- SELECT GROUP ---
interface SelectGroupProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}
export const SelectGroup = ({ label, value, onChange, options }: SelectGroupProps) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-3 pr-8 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none transition-all"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
    </div>
  </div>
);

// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}
export const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = "max-w-5xl" }: ModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl ${maxWidth} w-full max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-slate-950/30 text-slate-300 scrollbar-thin">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// --- DECORATION PANEL ---
const decorOptions = [
  { id: 'minimal', label: 'Minimalista', icon: Box, prompt: 'Minimalist style, clean surfaces, few objects, museum-like, organized.' },
  { id: 'cozy', label: 'Aconchego', icon: Coffee, prompt: 'Cozy atmosphere, soft rugs, throw pillows, warm lighting, books, lived-in feel.' },
  { id: 'nature', label: 'Natural', icon: Leaf, prompt: 'Biophilic design, many indoor plants, natural light, wooden textures, fresh atmosphere.' },
  { id: 'luxury', label: 'Luxo', icon: Gem, prompt: 'Luxury styling, gold accents, marble textures, expensive art, dramatic lighting, high-end furniture.' },
  { id: 'office', label: 'Executivo', icon: Briefcase, prompt: 'Home office style, books, desk accessories, leather textures, professional look.' }
];

export type DecorOption = typeof decorOptions[number];

interface DecorationPanelProps {
  selectedDecor: DecorOption;
  onSelect: (opt: DecorOption) => void;
}
export const DecorationPanel = ({ selectedDecor, onSelect }: DecorationPanelProps) => (
  <div className="space-y-2 mt-3">
    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
      <Sofa size={14} /> Humanização
    </label>
    <div className="grid grid-cols-5 gap-1">
      {decorOptions.map(opt => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt)}
          title={opt.label}
          className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${selectedDecor.id === opt.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
        >
          <opt.icon size={16} />
          <span className="text-[8px] mt-1 font-medium hidden sm:block truncate w-full text-center">{opt.label}</span>
        </button>
      ))}
    </div>
  </div>
);
