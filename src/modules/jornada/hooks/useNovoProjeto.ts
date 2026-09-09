import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { callAIText, requireAuth } from '@/services/ai';
import { studioService } from '@/modules/ambientes/services/studioService';
import { useStudioStore } from '@/store/useStudioStore';
import { AnaliseIara, EtapaId, carregarProgresso, salvarProgresso } from '../types';
import { baixarComoDataUrl, dataUrlParaBlob, carregarObra, enviarApresentacao, enviarFotoAmbiente, salvarJornada, JornadaSalva, StatusObra } from '../services/obraService';

interface Foto { dataUrl: string; base64: string; mime: string; }
interface Opcoes { projectId: string | null; setBudgetProject: React.Dispatch<React.SetStateAction<any>>; }

export const useNovoProjeto = ({ projectId: inicialId, setBudgetProject }: Opcoes) => {
  const { user } = useAuth();
  const setGeneratedImage = useStudioStore((s) => s.setGeneratedImage);
  const [projectId, setProjectId] = useState<string | null>(inicialId);
  const [etapa, setEtapa] = useState<EtapaId>(1);
  const [nome, setNome] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [foto, setFoto] = useState<Foto | null>(null);
  const [pedido, setPedido] = useState('');
  const [analise, setAnalise] = useState<AnaliseIara | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [imagem, setImagem] = useState<string | null>(null);
  const [ajuste, setAjuste] = useState('');
  const [loading, setLoading] = useState<null | 'salvando' | 'analisando' | 'gerando' | 'ajustando'>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [retomando, setRetomando] = useState(!!inicialId);
  const [status, setStatus] = useState<StatusObra>('rascunho');
  const pendente = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!inicialId) { setRetomando(false); return; }
    let ativo = true;
    (async () => {
      const remoto = user ? await carregarObra(inicialId).catch(() => null) : null;
      const p = remoto ?? carregarProgresso(inicialId);
      if (!ativo) return;
      if (!p) { setRetomando(false); return; }
      setNome(p.nome ?? ''); setClienteNome(p.clienteNome ?? ''); setPedido(p.pedido ?? ''); setAnalise(p.analise ?? null); setRespostas(p.respostas ?? {});
      if (remoto) setStatus(remoto.status);
      let temFoto = false;
      if (remoto?.fotoPath) {
        const dataUrl = await baixarComoDataUrl(remoto.fotoPath);
        if (dataUrl && ativo) { const mime = /data:(.*?);/.exec(dataUrl)?.[1] ?? 'image/jpeg'; setFoto({ dataUrl, base64: dataUrl.split(',')[1], mime }); temFoto = true; }
      }
      if (remoto?.imagemPath) { const img = await baixarComoDataUrl(remoto.imagemPath); if (img && ativo) { setImagem(img); setGeneratedImage(img); } }
      if (!ativo) return;
      const alvo = !temFoto && p.etapa > 2 && p.etapa < 7 ? 2 : p.etapa;
      setEtapa(alvo as EtapaId); setRetomando(false);
    })();
    return () => { ativo = false; };
  }, [inicialId, user?.id]);

  const persistir = (patch: JornadaSalva, extra?: { status?: StatusObra; aprovado?: boolean }) => {
    if (!projectId) return;
    salvarJornada(projectId, patch, extra).catch(() => salvarProgresso(projectId, { ...patch, aprovado: extra?.aprovado }));
  };

  const comAuth = async (acao: () => void) => { const ok = await requireAuth(); if (ok) return acao(); pendente.current = acao; setShowAuth(true); };
  const onAuthSuccess = () => { setShowAuth(false); const a = pendente.current; pendente.current = null; a?.(); };

  const salvarNome = () => comAuth(async () => {
    if (!user || !nome.trim()) return;
    setLoading('salvando'); setErro(null);
    try {
      let clienteId: string | null = null;
      if (clienteNome.trim()) {
        const { data: existente } = await supabase.from('clientes').select('id').eq('user_id', user.id).ilike('nome', clienteNome.trim()).limit(1);
        if (existente?.[0]) clienteId = existente[0].id;
        else { const { data: novo } = await supabase.from('clientes').insert({ user_id: user.id, nome: clienteNome.trim() }).select('id').single(); clienteId = novo?.id ?? null; }
      }
      let id = projectId;
      if (id) await supabase.from('projects').update({ nome: nome.trim(), name: nome.trim(), cliente_id: clienteId }).eq('id', id);
      else { const { data, error } = await supabase.from('projects').insert({ user_id: user.id, nome: nome.trim(), name: nome.trim(), cliente_id: clienteId }).select('id').single(); if (error) throw error; id = data.id; setProjectId(id); }
      if (id) { salvarProgresso(id, { etapa: 2, nome: nome.trim(), clienteNome: clienteNome.trim() }); await salvarJornada(id, { etapa: Math.max(etapa, 2) as EtapaId }).catch(() => undefined); }
      setEtapa(2);
    } catch (e: any) { setErro(e?.message || 'Não deu para salvar a obra. Tente de novo.'); }
    finally { setLoading(null); }
  });

  const escolherFoto = (file: File) => { const reader = new FileReader(); reader.onloadend = () => { const dataUrl = reader.result as string; setFoto({ dataUrl, base64: dataUrl.split(',')[1], mime: file.type || 'image/jpeg' }); }; reader.readAsDataURL(file); };

  const confirmarFoto = () => comAuth(async () => {
    if (!foto) return;
    setLoading('salvando'); setErro(null);
    try { if (user && projectId) { const { blob, mime } = dataUrlParaBlob(foto.dataUrl); await enviarFotoAmbiente(user.id, projectId, blob, mime); } persistir({ etapa: 3 }); setEtapa(3); }
    catch (e: any) { setErro(e?.message || 'Não deu para guardar a foto. Tente de novo.'); }
    finally { setLoading(null); }
  });

  const analisar = () => comAuth(async () => {
    if (!foto || !pedido.trim()) return;
    setLoading('analisando'); setErro(null);
    try {
      const prompt = `Você é a IARA, assistente de um marceneiro brasileiro. Veja a foto do ambiente e o pedido do cliente.\nPedido do cliente: "${pedido.trim()}"\nResponda SOMENTE JSON válido neste formato:\n{"resumo":"1 frase simples do que será feito","ambiente":"cozinha|quarto|sala|banheiro|escritório|outro","medidas":{"width":número ou null,"height":número ou null,"depth":número ou null},"perguntas":[{"id":"chave_curta","pergunta":"pergunta curta em português simples","dica":"ex.: em metros"}]}\nRegras: medidas em metros, só preencha se der para estimar pela foto com segurança; senão use null. Faça no máximo 4 perguntas e somente sobre o que realmente falta para orçar. Se nada faltar, "perguntas": [].`;
      const texto = await callAIText(prompt, [{ mimeType: foto.mime, data: foto.base64 }], true);
      const limpo = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
      const json = JSON.parse(limpo) as AnaliseIara;
      const resultado: AnaliseIara = { resumo: json.resumo || pedido.trim(), ambiente: json.ambiente, medidas: json.medidas || {}, perguntas: Array.isArray(json.perguntas) ? json.perguntas.slice(0, 4) : [] };
      setAnalise(resultado); persistir({ etapa: 4, pedido: pedido.trim(), analise: resultado }); setEtapa(4);
    } catch (e: any) { setErro(e?.message || 'A IARA não conseguiu analisar agora. Tente de novo.'); }
    finally { setLoading(null); }
  });

  const aplicarMedidas = () => {
    const m = analise?.medidas;
    const num = (v: unknown, chave: string) => { const r = parseFloat(String(respostas[chave] ?? '').replace(',', '.')); return Number.isFinite(r) && r > 0 ? r : typeof v === 'number' && v > 0 ? v : undefined; };
    const w = num(m?.width, 'largura'); const h = num(m?.height, 'altura'); const d = num(m?.depth, 'profundidade');
    setBudgetProject((prev: any) => ({ ...prev, id: projectId ?? prev?.id, width: w ?? prev.width, height: h ?? prev.height, depth: d ?? prev.depth }));
  };

  const gerarApresentacao = () => comAuth(async () => {
    if (!foto) return;
    setLoading('gerando'); setErro(null);
    try {
      const extras = Object.entries(respostas).filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v}`).join('; ');
      const prompt = `Insira móveis planejados de marcenaria neste ambiente real, mantendo paredes, piso, janelas e iluminação da foto. Pedido do cliente: ${pedido}. ${analise?.resumo ?? ''}. Detalhes: ${extras || 'nenhum'}.`;
      const img = await studioService.generateVisual(prompt, [{ mimeType: foto.mime, data: foto.base64 }], 'photorealistic, 8k, architectural photography', 'modern Brazilian carpentry, MDF cabinetry');
      if (!img) throw new Error('Não saiu imagem. Tente de novo.');
      setImagem(img); setGeneratedImage(img); aplicarMedidas();
      if (user) await supabase.from('gallery_images').insert({ user_id: user.id, image_url: img, prompt });
      if (user && projectId) await enviarApresentacao(user.id, projectId, img).catch(() => undefined);
      persistir({ etapa: 5, respostas }); setEtapa(5);
    } catch (e: any) { setErro(e?.message || 'Não deu para gerar a apresentação. Tente de novo.'); }
    finally { setLoading(null); }
  });

  const irParaAprovacao = () => { persistir({ etapa: 6 }); setEtapa(6); };

  const registrarAprovacao = () => comAuth(async () => {
    if (!projectId) return;
    setLoading('salvando'); setErro(null);
    try { await salvarJornada(projectId, { etapa: 7 }, { status: 'aprovado', aprovado: true }); setStatus('aprovado'); setEtapa(7); }
    catch (e: any) { setErro(e?.message || 'Não deu para registrar a aprovação. Tente de novo.'); }
    finally { setLoading(null); }
  });

  const irParaProducao = () => { persistir({ etapa: 8 }); setEtapa(8); };
  const voltar = () => setEtapa((e) => (e > 1 ? ((e - 1) as EtapaId) : e));

  return {
    projectId, etapa, setEtapa, voltar, nome, setNome, clienteNome, setClienteNome, salvarNome,
    foto, escolherFoto, limparFoto: () => setFoto(null), confirmarFoto, pedido, setPedido, analisar,
    analise, respostas, setRespostas, gerarApresentacao, imagem, ajuste, setAjuste, ajustarApresentacao: async () => {},
    irParaAprovacao, registrarAprovacao, irParaProducao, loading, erro, limparErro: () => setErro(null), retomando, status, logado: !!user,
    showAuth, setShowAuth, onAuthSuccess,
  };
};
