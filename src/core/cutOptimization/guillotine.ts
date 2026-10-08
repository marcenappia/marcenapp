export type GrainDirection = 'any' | 'lengthwise' | 'crosswise';

export interface CutPart {
  id: number;
  name: string;
  w: number;
  h: number;
  qtd: number;
  mat: 'white' | 'wood';
  grain?: GrainDirection;
}

export interface CutPlacement extends CutPart {
  uid: string;
  x: number;
  y: number;
  rotated: boolean;
  cutW: number;
  cutH: number;
}

export interface CutSheet {
  items: CutPlacement[];
  usedArea: number;
  width: number;
  height: number;
}

export interface CutOptions {
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
  trim: number;
  allowRotation: boolean;
  sheetGrain: GrainDirection;
}

export interface CutPlan {
  sheets: CutSheet[];
  invalid: CutPart[];
  utilization: number;
  strategy: string;
}

type Rect = { x:number; y:number; w:number; h:number };

const EPS = 0.0001;

function canRotate(part: CutPart, options: CutOptions): boolean {
  if (!options.allowRotation) return false;
  if (!part.grain || part.grain === 'any' || options.sheetGrain === 'any' || options.sheetGrain === 'none') return true;
  return part.grain !== options.sheetGrain;
}

function orientations(part: CutPart, options: CutOptions) {
  const trim = Math.max(0, options.trim);
  const base = { w: part.w + trim * 2, h: part.h + trim * 2, rotated:false };
  const result = [base];
  if (canRotate(part, options) && Math.abs(part.w - part.h) > EPS) result.push({ w:base.h, h:base.w, rotated:true });
  return result;
}

function sortParts(parts: CutPart[], strategy: string): CutPart[] {
  return [...parts].sort((a,b) => {
    const aa = strategy === 'short-side' ? Math.min(a.w,a.h) : strategy === 'perimeter' ? a.w+a.h : strategy === 'max-side' ? Math.max(a.w,a.h) : a.w*a.h;
    const bb = strategy === 'short-side' ? Math.min(b.w,b.h) : strategy === 'perimeter' ? b.w+b.h : strategy === 'max-side' ? Math.max(b.w,b.h) : b.w*b.h;
    return bb-aa || Math.max(b.w,b.h)-Math.max(a.w,a.h) || a.id-b.id;
  });
}

function packWithStrategy(parts: CutPart[], options: CutOptions, strategy: string): CutPlan {
  const expanded = parts.flatMap(p => Array.from({length:Math.max(0,Math.floor(p.qtd))},(_,i)=>({...p, id:p.id, qtd:1})));
  const ordered = sortParts(expanded, strategy);
  const invalid: CutPart[] = [];
  const sheets: CutSheet[] = [];
  let free: Rect[] = [];

  const newSheet = () => {
    sheets.push({ items:[], usedArea:0, width:options.sheetWidth, height:options.sheetHeight });
    free = [{x:0,y:0,w:options.sheetWidth,h:options.sheetHeight}];
  };

  const place = (part: CutPart) => {
    let best: { rectIndex:number; o:{w:number;h:number;rotated:boolean}; waste:number; short:number } | null = null;
    for (let ri=0;ri<free.length;ri++) {
      const r=free[ri];
      for (const o of orientations(part,options)) {
        if (o.w > r.w + EPS || o.h > r.h + EPS) continue;
        const waste=r.w*r.h-o.w*o.h;
        const short=Math.min(r.w-o.w,r.h-o.h);
        const score=waste*100000+short*10+ri;
        if (!best || score < best.waste*100000+best.short*10+best.rectIndex) best={rectIndex:ri,o,waste,short};
      }
    }
    if (!best) { invalid.push(part); return; }
    const r=free[best.rectIndex];
    const o=best.o;
    const placement: CutPlacement={...part,uid:`${part.id}-${sheets.length}-${sheets[sheets.length-1].items.length}`,x:r.x,y:r.y,rotated:o.rotated,cutW:o.w,cutH:o.h};
    const sheet=sheets[sheets.length-1];
    sheet.items.push(placement);
    sheet.usedArea += part.w*part.h;
    free.splice(best.rectIndex,1);
    const rightW=r.w-o.w-options.kerf;
    const bottomH=r.h-o.h-options.kerf;
    if (rightW>EPS) free.push({x:r.x+o.w+options.kerf,y:r.y,w:rightW,h:o.h});
    if (bottomH>EPS) free.push({x:r.x,y:r.y+o.h+options.kerf,w:r.w,h:bottomH});
    if (rightW>EPS && bottomH>EPS) free.push({x:r.x+o.w+options.kerf,y:r.y+o.h+options.kerf,w:rightW,h:bottomH});
  };

  for (const part of ordered) {
    if (!sheets.length) newSheet();
    const before=sheets.length;
    place(part);
    if (invalid.length && invalid[invalid.length-1]===part && sheets.length===before) {
      invalid.pop();
      newSheet();
      place(part);
    }
  }
  const utilization=sheets.length ? sheets.reduce((s,x)=>s+x.usedArea,0)/(sheets.length*options.sheetWidth*options.sheetHeight)*100 : 0;
  return {sheets,invalid,utilization,strategy};
}

export function optimizeGuillotine(parts: CutPart[], options: CutOptions): CutPlan {
  const strategies=['area','max-side','short-side','perimeter'];
  const candidates=strategies.map(s=>packWithStrategy(parts,options,s));
  candidates.sort((a,b)=>a.invalid.length-b.invalid.length || a.sheets.length-b.sheets.length || b.utilization-a.utilization || a.strategy.localeCompare(b.strategy));
  return candidates[0] ?? {sheets:[],invalid:parts,utilization:0,strategy:'area'};
}
