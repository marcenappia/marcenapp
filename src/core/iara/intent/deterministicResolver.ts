import type { IntentResolver, IntentResolverInput, ResolvedIntent, SlotRequirement } from "./types";

const WORDS: Array<[RegExp, string]> = [
  [/\bduas?\b/g, "2"],
  [/\btrês\b/g, "3"],
  [/\btres\b/g, "3"],
  [/\bquatro\b/g, "4"],
  [/\bcinco\b/g, "5"],
  [/\bseis\b/g, "6"],
  [/\bsete\b/g, "7"],
  [/\boito\b/g, "8"],
  [/\bnove\b/g, "9"],
  [/\bdez\b/g, "10"],
];

const norm = (s: string) => s.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
const words = (s: string) => WORDS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), s);

function mm(value: string, unit?: string) {
  const number = Number(value.replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) return undefined;
  const normalizedUnit = (unit ?? "mm").toLowerCase();
  return normalizedUnit.startsWith("m") && !normalizedUnit.startsWith("mm")
    ? number * 1000
    : normalizedUnit.startsWith("cm")
      ? number * 10
      : number;
}

const triple = /(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metros?|centímetros?)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metros?|centímetros?)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m|metros?|centímetros?)?/i;

function dims(value: string) {
  const match = value.match(triple);
  if (!match) return;
  const width = mm(match[1], match[2]);
  const height = mm(match[3], match[4]);
  const depth = mm(match[5], match[6]);
  return width && height && depth ? { width, height, depth } : undefined;
}

function axis(value: string, axisName: "width" | "height" | "depth") {
  const axisWords = axisName === "width"
    ? "(?:largura|largo|comprimento)"
    : axisName === "height"
      ? "(?:altura|alto)"
      : "(?:profundidade|profundo)";
  const match = value.match(new RegExp(`${axisWords}\\s*(?:é|e|de|:|=)?\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|m|metros?|centímetros?)?`, "i"));
  return match ? mm(match[1], match[2]) : undefined;
}

function extract(value: string) {
  const dimensions = dims(value);
  if (dimensions) return dimensions;
  const width = axis(value, "width");
  const height = axis(value, "height");
  const depth = axis(value, "depth");
  return width && height && depth ? { width, height, depth } : undefined;
}

const create = /\b(crie|criar|cria|quero|preciso|gostaria|novo projeto|novo móvel|novo movel|monte um projeto|faça um projeto|faca um projeto)\b/i;
const noun = /\b(projeto|móvel|movel|armário|armario|cozinha|bancada)\b/i;
const render = /\b(render|renderize|renderizar)\b|\b(gera|gerar|crie|criar|quero ver|visualiza|visualizar|mostra|mostrar)\b.*\b(render|imagem|visualização|visualizacao)\b/i;
const actions: Record<string, string[]> = {
  cut: ["corte", "chapa"],
  materials: ["material", "materiais", "mdf"],
  hardware: ["ferragem", "ferragens"],
  inventory: ["estoque"],
  production: ["produção", "producao", "fabricar"],
  budget: ["orçamento", "orcamento", "preço", "preco", "custo"],
  documents: ["documento", "documentos", "contrato"],
  order: ["pedido"],
  assembly: ["montagem", "montar"],
  installation: ["instalação", "instalacao", "instalar"],
  checklist: ["checklist"],
  delivery: ["entrega"],
  review_project: ["revisar projeto", "conferir projeto"],
  check_measurements: ["conferir medida", "conferir medidas"],
};

function createProject(value: string): ResolvedIntent | null {
  if (!create.test(value) || !noun.test(value)) return null;
  const dimensions = extract(value);
  const missing: SlotRequirement[] = dimensions
    ? []
    : [
        { tool: "createProjeto", field: "width", label: "Qual a largura do móvel?" },
        { tool: "createProjeto", field: "height", label: "Qual a altura do móvel?" },
        { tool: "createProjeto", field: "depth", label: "Qual a profundidade do móvel?" },
      ];
  return {
    intent: "create_projeto",
    entities: { nome: "Novo projeto", ...(dimensions ?? {}) },
    confidence: dimensions ? 0.95 : 0.6,
    missingSlots: missing,
    source: "deterministic",
  } as ResolvedIntent;
}

export const deterministicResolver: IntentResolver = {
  name: "deterministic",
  async resolve(input: IntentResolverInput) {
    if (input.images?.length) return null;
    const value = words(norm(input.text));
    const project = createProject(value);
    if (project) return project;
    if (render.test(value)) {
      return {
        intent: "gerar_render",
        entities: { prompt: input.text },
        confidence: 0.9,
        missingSlots: [],
        source: "deterministic",
      };
    }
    for (const [action, keywords] of Object.entries(actions)) {
      if (keywords.some((keyword) => value.includes(keyword))) {
        return { intent: "smart_action", entities: { action }, confidence: 0.85, missingSlots: [], source: "deterministic" };
      }
    }
    return null;
  },
};
