const DB_NAME = 'marcenapp-iara';
const STORE_NAME = 'pending-upload';
const KEY = 'current';

export type IaraPendingUploadKind = 'environment' | 'reference' | 'sketch' | 'plan';

export type PersistedIaraUpload = {
  blob: Blob;
  kind: IaraPendingUploadKind;
  createdAt: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponível.'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o armazenamento da IARA.'));
    request.onblocked = () => reject(new Error('O armazenamento da IARA está bloqueado por outra aba.'));
  });
}

export async function persistIaraPendingUpload(blob: Blob, kind: IaraPendingUploadKind): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ blob, kind, createdAt: Date.now() } satisfies PersistedIaraUpload, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Não foi possível guardar a foto da IARA.'));
    tx.onabort = () => reject(tx.error ?? new Error('Não foi possível guardar a foto da IARA.'));
  }).finally(() => db.close());
}

export async function loadIaraPendingUpload(): Promise<PersistedIaraUpload | null> {
  const db = await openDatabase();
  return await new Promise<PersistedIaraUpload | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(KEY);
    request.onsuccess = () => {
      const value = request.result;
      if (value?.blob instanceof Blob && typeof value.kind === 'string') {
        resolve(value as PersistedIaraUpload);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error ?? new Error('Não foi possível recuperar a foto da IARA.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export async function clearIaraPendingUpload(): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Não foi possível limpar a foto pendente.'));
    tx.onabort = () => reject(tx.error ?? new Error('Não foi possível limpar a foto pendente.'));
  }).finally(() => db.close());
}

export function createIaraPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Não foi possível preparar a imagem.'));
    reader.onerror = () => reject(reader.error ?? new Error('Não foi possível preparar a imagem.'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(',');
  if (!body) throw new Error('Imagem inválida.');
  const mime = header.match(/data:([^;]+);/)?.[1] ?? 'image/jpeg';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}
