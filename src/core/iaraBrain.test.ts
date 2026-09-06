import { describe, expect, it } from 'vitest';
import { assessIaraRequest } from './iaraBrain';

describe('iaraBrain', () => {
  it('permite conversa técnica que não é irreversível', () => {
    const result = assessIaraRequest('Qual material é mais indicado para um armário de cozinha?');
    expect(result.allow).toBe(true);
    expect(result.critical).toBe(true);
  });

  it('bloqueia produção quando falta profundidade', () => {
    const result = assessIaraRequest('Pode liberar a produção?', {
      width: 2.4,
      height: 2.6,
    });
    expect(result.allow).toBe(false);
    expect(result.status).toBe('PRECISA_CONFERIR');
    expect(result.question).toContain('profundidade');
  });

  it('não considera foto como medição suficiente para corte', () => {
    const result = assessIaraRequest('Pode mandar cortar?', {
      width: 2.4,
      height: 2.6,
      depth: 0.6,
      hasImage: true,
    });
    expect(result.allow).toBe(false);
    expect(result.reason).toContain('foto');
  });

  it('permite ação irreversível quando medidas estão presentes e não há dependência exclusiva da foto', () => {
    const result = assessIaraRequest('Pode liberar a produção?', {
      width: 2.4,
      height: 2.6,
      depth: 0.6,
    });
    expect(result.allow).toBe(true);
    expect(result.status).toBe('CONFIRMADO');
  });
});
