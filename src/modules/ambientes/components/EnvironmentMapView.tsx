import { DoorOpen, Plug, Square, ToggleLeft, Triangle, Box, Ruler } from 'lucide-react';
import type { EnvironmentAnalysis, EnvironmentElement } from '../types';

const iconFor = (type: EnvironmentElement['type']) => {
  if (type === 'window') return <Square size={15}/>;
  if (type === 'door') return <DoorOpen size={15}/>;
  if (type === 'outlet') return <Plug size={15}/>;
  if (type === 'switch') return <ToggleLeft size={15}/>;
  if (type === 'corner') return <Triangle size={15}/>;
  if (type === 'obstacle') return <Box size={15}/>;
  return <Ruler size={15}/>;
};

function sideOf(item: EnvironmentElement) {
  const p = `${item.position || ''} ${item.label || ''}`.toLowerCase();
  if (p.includes('direit')) return 'right';
  if (p.includes('esquerd')) return 'left';
  if (p.includes('fundo') || p.includes('trás') || p.includes('tras')) return 'back';
  return 'front';
}

export function EnvironmentMapView({ analysis }: { analysis: EnvironmentAnalysis }) {
  const walls = analysis.elements.filter(item => item.type === 'wall');
  const markers = analysis.elements.filter(item => item.type !== 'wall' && item.type !== 'baseboard');
  const leftWall = walls.find(item => sideOf(item) === 'left');
  const rightWall = walls.find(item => sideOf(item) === 'right');
  const backWall = walls.find(item => sideOf(item) === 'back');

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div><strong className="text-xs text-slate-800">Mapa espacial</strong><p className="text-[10px] text-slate-500">Vista esquemática baseada na leitura da foto — não substitui medição no local.</p></div>
        <span className="text-[10px] text-slate-500">{analysis.perspective.confidence} confiança</span>
      </div>
      <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-lg border-2 border-slate-300 bg-white">
        <div className="absolute left-1/2 top-3 h-1 w-[72%] -translate-x-1/2 rounded bg-slate-700" title={backWall?.label || 'Parede de fundo'} />
        <div className="absolute left-3 top-1/2 h-[72%] w-1 -translate-y-1/2 rounded bg-slate-700" title={leftWall?.label || 'Parede esquerda'} />
        <div className="absolute right-3 top-1/2 h-[72%] w-1 -translate-y-1/2 rounded bg-slate-700" title={rightWall?.label || 'Parede direita'} />
        <div className="absolute left-1/2 bottom-3 h-1 w-[72%] -translate-x-1/2 rounded bg-slate-200" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-[10px] text-slate-400">área livre do ambiente</div>
        {markers.map((item, index) => {
          const side = sideOf(item);
          const style = side === 'left'
            ? { left: '4%', top: `${18 + (index % 5) * 15}%` }
            : side === 'right'
              ? { right: '4%', top: `${18 + (index % 5) * 15}%` }
              : side === 'back'
                ? { left: `${20 + (index % 5) * 14}%`, top: '4%' }
                : { left: `${18 + (index % 5) * 15}%`, bottom: '5%' };
          return <div key={item.id} style={style} title={`${item.label} · ${item.position || 'posição não definida'}`} className="absolute flex h-7 w-7 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm">{iconFor(item.type)}</div>;
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-slate-500">
        {['window','door','outlet','switch','corner','obstacle'].map(type => analysis.elements.some(item => item.type === type) && <span key={type} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-1">{iconFor(type as EnvironmentElement['type'])}{type === 'window' ? 'janela' : type === 'door' ? 'porta' : type === 'outlet' ? 'tomada' : type === 'switch' ? 'interruptor' : type === 'corner' ? 'canto' : 'obstáculo'}</span>)}
      </div>
    </div>
  );
}
