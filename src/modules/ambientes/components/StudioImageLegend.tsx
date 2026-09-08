import React from 'react';
import { Camera, PencilRuler, Image as ImageIcon } from 'lucide-react';

export const StudioImageLegend = () => (
  <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-2">
    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600"><Camera size={13} className="text-slate-500"/> Foto original</div>
    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600"><PencilRuler size={13} className="text-slate-500"/> Referência / planta</div>
    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600"><ImageIcon size={13} className="text-indigo-600"/> Resultado</div>
  </div>
);
