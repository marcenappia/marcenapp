import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders, guardRequest, jsonResponse, readJsonBody } from "../_shared/guard.ts";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

const BodySchema = z.object({
  userPrompt: z.string().min(1).max(4000),
  context: z.object({
    currentProject: z.record(z.any()).optional(),
    lastImage: z.string().optional(),
    decorStyle: z.string().optional(),
    recentClients: z.array(z.object({ id: z.string(), nome: z.string() })).optional(),
  }).partial().optional(),
});

const TOOL_DECLARATIONS = [
  {
    name: "createCliente",
    description: "Cria um cliente quando o nome foi informado pelo usuário. Nunca invente dados pessoais.",
    parameters: { type: "object", properties: {
      nome: { type: "string", description: "Nome completo do cliente" },
      email: { type: "string", description: "Email opcional" },
      telefone: { type: "string", description: "Telefone opcional" },
    }, required: ["nome"] },
  },
  {
    name: "createProjeto",
    description: "Cria projeto de marcenaria somente quando nome e as três dimensões foram explicitamente confirmados pelo usuário. Nunca use medidas padrão silenciosas.",
    parameters: { type: "object", properties: {
      nome: { type: "string", description: "Nome do projeto" },
      clienteNome: { type: "string", description: "Cliente, se informado" },
      width: { type: "number", description: "Largura confirmada em metros" },
      height: { type: "number", description: "Altura confirmada em metros" },
      depth: { type: "number", description: "Profundidade confirmada em metros" },
      tipo: { type: "string", description: "Tipo do móvel" },
      confirmado: { type: "boolean", description: "Deve ser true somente quando o usuário tiver confirmado explicitamente as dimensões para criação do projeto" },
    }, required: ["nome", "width", "height", "depth", "confirmado"] },
  },
  {
    name: "gerarRender",
    description: "Solicita materialização visual do projeto. Não transforme estimativas visuais em medidas de fabricação.",
    parameters: { type: "object", properties: {
      prompt: { type: "string", description: "Descrição do que renderizar" },
      estilo: { type: "string", description: "Estilo visual" },
    }, required: ["prompt"] },
  },
  {
    name: "calcularOrcamento",
    description: "Calcula orçamento a partir dos dados reais do projeto. Se faltarem dados críticos, peça confirmação em vez de inventar.",
    parameters: { type: "object", properties: {
      observacoes: { type: "string", description: "Observações opcionais" },
    } },
  },
  {
    name: "gerarContrato",
    description: "Prepara documentação contratual. A IARA não é advogada e não deve apresentar texto como aconselhamento jurídico definitivo.",
    parameters: { type: "object", properties: {
      clienteNome: { type: "string", description: "Nome do contratante" },
      valor: { type: "number", description: "Valor em reais, somente se confirmado" },
      prazoDias: { type: "number", description: "Prazo em dias úteis, somente se confirmado" },
      clausulasExtras: { type: "array", items: { type: "string" }, description: "Cláusulas solicitadas" },
    }, required: ["clienteNome"] },
  },
];

const SYSTEM_INSTRUCTION = `Você é IARA, a especialista multidisciplinar do MARCENAPP.

IDENTIDADE PROFISSIONAL
Você raciocina com conhecimento aplicado de marcenaria e fabricação de móveis, design de interiores, arquitetura e organização espacial, ergonomia e circulação, materiais, ferragens e acabamentos, iluminação, compatibilização básica com elétrica/hidráulica, medição e geometria de ambientes, orçamento, produção, plano de corte, instalação, logística e documentação.
Você é uma assistente técnica de IA, não uma profissional legalmente habilitada. Nunca alegue ser arquiteta, engenheira, designer ou advogada licenciada e sinalize quando um responsável técnico ou profissional habilitado for necessário.

MISSÃO
Seu trabalho é ajudar o marceneiro a tomar decisões melhores e mais verificáveis. Você não deve criar dependência cega. Em qualquer etapa que possa causar desperdício, retrabalho, prejuízo ou risco, prefira parar, explicar a incerteza e pedir confirmação.

HIERARQUIA DA VERDADE
1) medida/documento informado ou conferido pelo marceneiro;
2) dado já confirmado no projeto/Estúdio;
3) evidência visual de foto, tratada como estimativa quando não houver escala/conferência;
4) conhecimento técnico e padrões de referência.
Nunca trate um nível inferior como se fosse superior.

REGRA ABSOLUTA: NÃO INVENTAR
- Nunca invente medidas, folgas, prumo, esquadro, espessura de parede, posição de tomadas/pontos, carga, fixação, material, espessura, ferragem, preço ou condição de instalação.
- Não use 3,0 x 2,6 x 0,6 m, ou qualquer outro padrão, como se fosse a medida real de um projeto.
- Se faltar uma informação crítica, não chame ferramenta que grave ou materialize essa informação; faça a pergunta mínima necessária.
- Estimativa deve aparecer explicitamente como ESTIMATIVA e nunca liberar produção, compra, corte ou orçamento final sozinha.

MODO DE CONFERÊNCIA
Para decisões críticas, verifique: dimensões, folgas, esquadro/prumo/nível, interferências, espessura/material, ferragens, cargas, acesso para montagem e pontos elétricos/hidráulicos/gás. Se um desses itens for relevante e não estiver confirmado, peça conferência.

DIÁRIO E ALTERAÇÕES
Uma nota do Diário, uma foto ou uma frase do cliente pode ser evidência de intenção, mas não altera silenciosamente o projeto. Transforme em PROPOSTA DE ALTERAÇÃO e peça confirmação antes de afetar Estúdio, orçamento, produção ou corte.

FERRAMENTAS
- Use ferramentas apenas quando os argumentos estiverem sustentados pelos dados disponíveis.
- Para createProjeto, o argumento confirmado DEVE ser true somente após confirmação explícita do usuário das três dimensões. Se não houver essa confirmação, não chame a ferramenta.
- Não encadeie ações destrutivas ou de alto impacto com base em suposição.
- Ordem típica quando tudo estiver confirmado: cliente → projeto → visual → orçamento → contrato.
- Se a solicitação for apenas uma dúvida, responda sem ferramentas.
- Se houver conflito entre dados, não escolha silenciosamente: mostre o conflito e peça qual dado é válido.

FORMATO DE RESPOSTA
Português brasileiro, direto e profissional. Quando houver incerteza, informe claramente: CONFIRMADO, ESTIMADO ou PRECISA CONFERIR. Quando houver duas soluções válidas, compare custo, fabricação, instalação e riscos. Nunca prometa infalibilidade; demonstre confiabilidade por meio de conferências e rastreabilidade.`;

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(corsHeaders, { error: "Method not allowed" }, 405);

  const guard = await guardRequest(req, corsHeaders, { fn: "ai-orchestrator", limit: 20, windowSeconds: 60 });
  if (!guard.ok) return guard.response;

  try {
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_KEY) return jsonResponse(corsHeaders, { error: "Serviço de IA não configurado.", code: "provider_not_configured" }, 500);

    const read = await readJsonBody(req, MAX_BODY_BYTES);
    if (!read.ok) return jsonResponse(corsHeaders, { error: read.reason === "too_large" ? "Corpo da requisição muito grande." : "JSON inválido." }, read.reason === "too_large" ? 413 : 400);

    const parsed = BodySchema.safeParse(read.body);
    if (!parsed.success) return jsonResponse(corsHeaders, { error: "Validation failed", fields: parsed.error.flatten().fieldErrors }, 400);

    const { userPrompt, context } = parsed.data;
    const contextBlock = context ? `\n\nCONTEXTO ATUAL:\n${JSON.stringify(context, null, 2)}` : "";
    // Gemini 2.0 Flash foi desativado em 01/06/2026; use uma versão 3.x estável.
    const model = "gemini-3.6-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: userPrompt + contextBlock }] }],
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      toolConfig: { functionCallingConfig: { mode: "AUTO" } },
    };

    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) {
      const limited = response.status === 429;
      return jsonResponse(corsHeaders, { error: limited ? "Limite do provedor de IA atingido. Tente novamente em alguns segundos." : "O serviço de IA está indisponível no momento.", code: limited ? "rate_limited" : "upstream_error" }, limited ? 429 : 502, limited ? { "Retry-After": "10" } : {});
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const plan: Array<{ tool: string; args: Record<string, unknown> }> = [];
    let summary = "";
    for (const part of parts) {
      if (part.functionCall) plan.push({ tool: part.functionCall.name, args: part.functionCall.args ?? {} });
      else if (part.text) summary += part.text;
    }

    return jsonResponse(corsHeaders, { plan, summary: summary.trim(), model });
  } catch (e) {
    console.error("ai-orchestrator error:", e);
    return jsonResponse(corsHeaders, { error: "Erro interno no orquestrador.", code: "internal_error" }, 500);
  }
});
