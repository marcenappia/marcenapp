// Re-export StudioView como Studio para compatibilidade com quem importa de ./index
// (拆分 de StudioHub para evitar import circular: StudioView.tsx → StudioHub.tsx → index.tsx)
export { StudioView as Studio } from './StudioView';
