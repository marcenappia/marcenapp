import React from 'react';
import { Users, Plus, Search } from 'lucide-react';
import { Card, Button } from '@/components/marcenaria/shared';

const ClientesModule = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-indigo-600" /> Gestão de Clientes
          </h2>
          <p className="text-slate-500">Organize sua base de contatos e histórico de projetos.</p>
        </div>
        <Button icon={Plus}>Novo Cliente</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar por nome, e-mail ou telefone..." 
          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>

      <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Users size={32} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-700">Nenhum cliente cadastrado</h3>
          <p className="text-slate-500 max-w-xs mx-auto">Comece adicionando seu primeiro cliente para vincular projetos e orçamentos.</p>
        </div>
        <Button variant="secondary">Importar Contatos</Button>
      </Card>
    </div>
  );
};

export default ClientesModule;
