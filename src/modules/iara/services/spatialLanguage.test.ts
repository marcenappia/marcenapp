import { describe, expect, it } from 'vitest';
import { detectHumanWallReferences, humanizeWallLabel } from './spatialLanguage';

describe('linguagem espacial humana da IARA', () => {
  it('reconhece as referências usadas pelo marceneiro', () => {
    expect(detectHumanWallReferences('Armário na parede do lado direito e janela na parede da frente.')).toEqual(['direita', 'frente']);
    expect(detectHumanWallReferences('Quero o painel na parede de trás, oposta à porta.')).toEqual(['tras', 'oposta']);
  });

  it('converte coordenadas cardeais apenas na apresentação humana', () => {
    expect(humanizeWallLabel('north')).toBe('parede da frente');
    expect(humanizeWallLabel('south')).toBe('parede de trás');
    expect(humanizeWallLabel('east')).toBe('parede da direita');
    expect(humanizeWallLabel('west')).toBe('parede da esquerda');
  });
});
