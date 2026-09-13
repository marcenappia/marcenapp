import { callAIText } from '@/services/ai';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export type ExtractedMaterial = {
  nome: string;
  categoria?: string | null;
  unidade?: string | null;
  espessura?: number | null;
  preco?: number | null;
  fornecedor?: string | null;
};

const MAX_TEXT = 80_000;

const normalize = (value: unknown): ExtractedMaterial[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    nome: String(item?.nome ?? '').trim(),
    categoria: item?.categoria ? String(item.categoria).trim() : null,
    unidade: item?.unidade ? String(item.unidade).trim() : null,
    espessura: Number.isFinite(Number(item?.espessura)) ? Number(item.espessura) : null,
    preco: Number.isFinite(Number(item?.preco)) ? Number(item.preco) : null,
    fornecedor: item?.fornecedor ? String(item.fornecedor).trim() : null,
  })).filter((item) => item.nome.length > 1);
};

async function extractPdfText(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages && pages.join('\n').length < MAX_TEXT; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return pages.join('\n').slice(0, MAX_TEXT);
}

async function fileToImage(file: File): Promise<{ mimeType: string; data: string }> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return { mimeType: file.type || 'image/jpeg', data: btoa(binary) };
}

async function extractSource(file: File): Promise<{ text?: string; image?: { mimeType: string; data: string } }> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return { text: await extractPdfText(file) };
  if (file.type.startsWith('image/')) return { image: await fileToImage(file) };
  const text = await file.text();
  return { text: text.slice(0, MAX_TEXT) };
}

export async function extractMaterialsFromFile(file: File): Promise<ExtractedMaterial[]> {
  const source = await extractSource(file);
  const prompt = `Você é a IARA do Marcenapp. Extraia APENAS materiais comercialmente identificáveis deste documento/tabela para a base privada de uma marcenaria. Não invente dados. Preserve preços, espessuras e unidades quando estiverem presentes. Responda SOMENTE JSON válido no formato {"materiais":[{"nome":"...","categoria":"...","unidade":"...","espessura":18,"preco":329.9,"fornecedor":"..."}]}. Se não conseguir identificar materiais, retorne {"materiais":[]}.\n\nCONTEÚDO:\n${source.text ?? '[imagem anexada]'}`;
  const result = await callAIText(prompt, source.image ? [source.image] : undefined, true);
  try {
    const parsed = JSON.parse(result.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));
    return normalize(parsed?.materiais);
  } catch {
    throw new Error('A leitura terminou, mas a resposta não veio em formato estruturado.');
  }
}
