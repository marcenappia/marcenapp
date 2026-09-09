import React from 'react';
import { BookOpen, Calendar, Camera, Clock, ArrowLeft } from 'lucide-react';
import { Card, Button } from '@/components/marcenaria/shared';

interface Props {
  navigateTo?: (id: string) => void;
}

const DiarioModule = ({ navigateTo }: Props) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigateTo ? navigateTo('dashboard') : window.history.back()}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Voltar para a jornada"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="text-amber-600" /> Diário de Obra
          </h2>
          <p className="text-slate-500">Acompanhe a evolução de cada montagem e instalação.</p>
        </div>
        <Button variant="magic" icon={Camera}>Nova Atualização</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-100 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Clock size={20} /></div>
          <div><p className="text-xs text-blue-700 font-bold uppercase">Hoje</p><p className="text-sm font-medium">3 Obras Ativas</p></div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-100 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg text-green-600"><Calendar size={20} /></div>
          <div><p className="text-xs text-green-700 font-bold uppercase">Entregas</p><p className="text-sm font-medium">2 Finalizadas esta semana</p></div>
        </Card>
        <Card className="p-4 bg-purple-50 border-purple-100 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Camera size={20} /></div>
          <div><p className="text-xs text-purple-700 font-bold uppercase">Mídia</p><p className="text-sm font-medium">12 Novas Fotos</p></div>
        </Card>
      </div>

      <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Calendar size={32} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-700">Seu diário está vazio</h3>
          <p className="text-slate-500 max-w-xs mx-auto">Registre fotos e notas das suas instalações para gerar relatórios profissionais para seus clientes.</p>
        </div>
        <Button variant="secondary">Ver Exemplo</Button>
      </Card>
    </div>
  );
};

export default DiarioModule;
