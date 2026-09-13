import { describe, expect, it } from 'vitest';
import { validateDnaUpload } from './uploadContract';

const file = (name: string, type: string, size = 100) => ({ name, type, size }) as File;

describe('DNA upload contract', () => {
  it('accepts supported extension and MIME pairs', () => {
    expect(validateDnaUpload(file('base.pdf', 'application/pdf'))).toBeNull();
    expect(validateDnaUpload(file('base.csv', 'text/csv'))).toBeNull();
    expect(validateDnaUpload(file('base.txt', 'text/plain'))).toBeNull();
    expect(validateDnaUpload(file('base.jpg', 'image/jpeg'))).toBeNull();
    expect(validateDnaUpload(file('base.png', 'image/png'))).toBeNull();
    expect(validateDnaUpload(file('base.webp', 'image/webp'))).toBeNull();
  });

  it('rejects MIME spoofing and unsupported formats', () => {
    expect(validateDnaUpload(file('base.pdf', 'image/png'))).toContain('Formato não suportado');
    expect(validateDnaUpload(file('base.exe', 'application/octet-stream'))).toContain('Formato não suportado');
  });

  it('rejects empty and oversized files', () => {
    expect(validateDnaUpload(file('base.txt', 'text/plain', 0))).toContain('vazio');
    expect(validateDnaUpload(file('base.txt', 'text/plain', 10 * 1024 * 1024 + 1))).toContain('10 MB');
  });
});
