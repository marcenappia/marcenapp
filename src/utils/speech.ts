/** Tipos mínimos para reconhecimento de voz do navegador, sem recorrer a `any`. */
export interface SpeechRecognitionAlternativeLike { transcript: string; confidence?: number }
export interface SpeechRecognitionResultLike { readonly length: number; [index: number]: SpeechRecognitionAlternativeLike }
export interface SpeechRecognitionResultListLike { readonly length: number; [index: number]: SpeechRecognitionResultLike }
export interface SpeechRecognitionEventLike { results: SpeechRecognitionResultListLike }

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionWindow {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

/** Retorna o construtor de reconhecimento de voz disponível no navegador, se houver. */
export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const scope = window as unknown as SpeechRecognitionWindow;
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

/** Extrai o primeiro texto reconhecido do evento de voz. */
export function firstTranscript(event: SpeechRecognitionEventLike): string {
  return event.results?.[0]?.[0]?.transcript?.trim() ?? '';
}
