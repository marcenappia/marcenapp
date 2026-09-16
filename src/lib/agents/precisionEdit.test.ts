import { describe, expect, it } from 'vitest';
import { isSafePrecisionEdit, parsePrecisionEdit } from './precisionEdit';

describe('precision edit contract', () => {
  it('resolves a localized handle change on the third door on the right', () => {
    const contract = parsePrecisionEdit('muda só o puxador da terceira porta à direita para preto');
    expect(contract).toMatchObject({
      operation: 'set',
      property: 'handle',
      scope: 'single',
      preserve: 'everything_else',
      target: { type: 'door', ordinal: 3, side: 'right' },
      value: 'preto',
      requiresClarification: false,
    });
    expect(isSafePrecisionEdit(contract!)).toBe(true);
  });

  it('resolves the third door from the left as a replacement', () => {
    const contract = parsePrecisionEdit('troca a terceira porta da esquerda por vidro');
    expect(contract).toMatchObject({
      operation: 'replace',
      property: 'material',
      scope: 'single',
      target: { type: 'door', ordinal: 3, side: 'left' },
      value: 'vidro',
      requiresClarification: false,
    });
  });

  it('uses the selected object for contextual edits', () => {
    const contract = parsePrecisionEdit('aumenta esta porta 30 cm', {
      selectedObjectId: 'door-17',
      selectedObjectType: 'door',
    });
    expect(contract).toMatchObject({
      operation: 'increase',
      property: 'value',
      scope: 'single',
      target: { selectedObjectId: 'door-17', type: 'door' },
      value: 300,
      requiresClarification: false,
    });
    expect(isSafePrecisionEdit(contract!)).toBe(true);
  });

  it('does not invent a target for an ambiguous edit', () => {
    const contract = parsePrecisionEdit('muda isso para preto');
    expect(contract).toBeUndefined();
  });

  it('never treats an explicit all-target request as safe local editing', () => {
    const contract = parsePrecisionEdit('mude todas as portas para preto');
    expect(contract?.scope).toBe('all');
    expect(isSafePrecisionEdit(contract!)).toBe(false);
  });
});
