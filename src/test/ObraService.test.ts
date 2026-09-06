import { describe, it, expect, vi, beforeEach } from 'vitest';

const state: { updates: Record<string, unknown>[]; uploads: { path: string; type?: string }[]; row: Record<string, unknown> } = {
  updates: [], uploads: [], row: {},
};

vi.mock('@/integrations/supabase/client', () => {
  const from = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: state.row, error: null }),
      }),
    }),
    update: (u: Record<string, unknown>) => ({
      eq: async () => { state.updates.push(u); return { error: null }; },
    }),
  });
  const storage = {
    from: () => ({
      upload: async (path: string, blob: Blob, opts: { contentType?: string }) => {
        state.uploads.push({ path, type: opts.contentType }); return { error: null };
      },
      createSignedUrl: async (p: string) => ({ data: { signedUrl: `https://signed/${p}` }, error: null }),
    }),
  };
  return { supabase: { from, storage } };
});

import { caminhoArquivo, dataUrlParaBlob, enviarFotoAmbiente, salvarJornada, carregarObra, urlAssinada } from '@/modules/jornada/services/obraService';

beforeEach(() => { state.updates = []; state.uploads = []; state.row = {}; localStorage.clear(); });

describe('obraService', () => {
  it('guarda arquivos na pasta do usuário (exigido pelas regras de acesso)', () => {
    expect(caminhoArquivo('u1', 'p1', 'ambiente.jpg')).toBe('u1/p1/ambiente.jpg');
  });

  it('converte dataURL em blob mantendo o tipo', () => {
    const { blob, mime } = dataUrlParaBlob('data:image/png;base64,iVBORw0KGgo=');
    expect(mime).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('envia a foto do ambiente e grava o caminho no projeto', async () => {
    const path = await enviarFotoAmbiente('u1', 'p1', new Blob(['x']), 'image/jpeg');
    expect(path).toBe('u1/p1/ambiente.jpg');
    expect(state.uploads[0]).toEqual({ path, type: 'image/jpeg' });
    expect(state.updates[0]).toEqual({ foto_ambiente_path: path });
  });

  it('mescla a jornada anterior e registra aprovação com status/data', async () => {
    state.row = { jornada: { etapa: 5, pedido: 'armário' } };
    await salvarJornada('p1', { etapa: 7 }, { status: 'aprovado', aprovado: true });
    const u = state.updates[0] as { jornada: Record<string, unknown>; status: string; aprovado_em: string };
    expect(u.jornada.pedido).toBe('armário');
    expect(u.jornada.etapa).toBe(7);
    expect(u.status).toBe('aprovado');
    expect(typeof u.aprovado_em).toBe('string');
    // cache local também atualizado
    expect(JSON.parse(localStorage.getItem('marcenapp_obra_p1')!).aprovado).toBe(true);
  });

  it('carrega a obra do banco com etapa, foto e aprovação', async () => {
    state.row = {
      id: 'p1', nome: 'Cozinha', name: null, status: 'aprovado', jornada: { etapa: 7, pedido: 'x' },
      foto_ambiente_path: 'u1/p1/ambiente.jpg', imagem_apresentacao_path: null, aprovado_em: '2026-01-01', updated_at: '2026-01-01',
      clientes: { nome: 'Maria' },
    };
    const o = await carregarObra('p1');
    expect(o).toMatchObject({ etapa: 7, nome: 'Cozinha', clienteNome: 'Maria', aprovado: true, fotoPath: 'u1/p1/ambiente.jpg' });
  });

  it('gera link assinado para arquivo privado', async () => {
    expect(await urlAssinada('u1/p1/ambiente.jpg')).toContain('signed/u1/p1/ambiente.jpg');
  });
});
