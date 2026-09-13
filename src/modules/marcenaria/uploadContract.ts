export const DNA_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const DNA_UPLOAD_TYPES = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

const allowedMimeTypes = new Set<string>(Object.values(DNA_UPLOAD_TYPES));
const extensionMimeTypes: Record<string, string> = {
  pdf: DNA_UPLOAD_TYPES.pdf,
  csv: DNA_UPLOAD_TYPES.csv,
  txt: DNA_UPLOAD_TYPES.txt,
  jpeg: DNA_UPLOAD_TYPES.jpeg,
  jpg: DNA_UPLOAD_TYPES.jpeg,
  png: DNA_UPLOAD_TYPES.png,
  webp: DNA_UPLOAD_TYPES.webp,
};

export function validateDnaUpload(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (file.size <= 0) return 'O arquivo está vazio.';
  if (file.size > DNA_UPLOAD_MAX_BYTES) return 'O arquivo excede o limite de 10 MB.';

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const expectedMime = extensionMimeTypes[extension];
  if (!expectedMime || !allowedMimeTypes.has(file.type) || file.type !== expectedMime) {
    return 'Formato não suportado. Use PDF, CSV, TXT, JPG, PNG ou WebP.';
  }
  return null;
}

export const DNA_UPLOAD_ACCEPT = '.pdf,.csv,.txt,.jpg,.jpeg,.png,.webp';
