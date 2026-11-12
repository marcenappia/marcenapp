#!/usr/bin/env node

const state = {
  integrations: [{ id: 'integration-local-1', user_id: 'user-local-1', phone_number_id: 'phone-local-1', status: 'active' }],
  conversations: [],
  messages: [],
  projects: [],
  sent: [],
};

const numberWords = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 };
function measure(raw) {
  const value = raw.toLocaleLowerCase('pt-BR').replace(',', '.').trim();
  const compound = value.match(/^(\d+(?:\.\d+)?)\s*(?:m|metros?)\s+e\s+(vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)$/i);
  if (compound) return (Number(compound[1]) + numberWords[compound[2]] / 100) * 1000;
  const match = value.match(/^(\d+(?:\.\d+)?)\s*(mm|milímetros?|cm|centímetros?|m|metros?)?$/i);
  if (!match) return undefined;
  const number = Number(match[1]); const unit = match[2] ?? '';
  if (/^(m|metros?)$/i.test(unit)) return number * 1000;
  if (/^(cm|centímetros?)$/i.test(unit)) return number * 10;
  if (/^(mm|milímetros?)$/i.test(unit)) return number;
  return number < 10 ? number * 1000 : number;
}
function dimension(text, labels) {
  const value = '(\\d+(?:[.,]\\d+)?\\s*(?:mm|milímetros?|cm|centímetros?|m|metros?)(?:\\s+e\\s+(?:vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa))?)';
  const regex = new RegExp(`${value}\\s+(?:de\\s+)?(?:${labels})\\b|(?:${labels})\\s*(?:é|e|de|:|=)?\\s*${value}`, 'i');
  const match = text.match(regex); return measure(match?.[1] ?? match?.[2] ?? '');
}
function parseYara(text) {
  const normalized = text.toLocaleLowerCase('pt-BR');
  if (!/\b(crie|criar|cria|quero|preciso|novo projeto|monte|faça|faca)\b/.test(normalized) || !/\b(projeto|móvel|movel|armário|armario|cozinha|bancada)\b/.test(normalized)) return null;
  const dimensions = { width: dimension(normalized, 'largura|largo|comprimento'), height: dimension(normalized, 'altura|alto'), depth: dimension(normalized, 'profundidade|profundo') };
  const missing = Object.entries(dimensions).filter(([, value]) => !value).map(([axis]) => axis);
  const type = normalized.match(/(?:crie|criar|cria|novo|monte|faça|faca)\s+(?:um|uma)?\s*([a-záàâãéêíóôõúç\s-]+?)(?=\s+(?:com|de|medindo|\d)|$)/i)?.[1]?.trim() || 'Novo projeto';
  return missing.length ? { type, missing } : { type, ...dimensions };
}
function fakeWebhook(payload) {
  const change = payload.entry[0].changes[0].value;
  const integration = state.integrations.find(item => item.phone_number_id === change.metadata.phone_number_id && item.status === 'active');
  if (!integration) throw new Error('integration_not_found');
  for (const inbound of change.messages ?? []) {
    if (state.messages.some(item => item.external_message_id === inbound.id)) continue;
    let conversation = state.conversations.find(item => item.integration_id === integration.id && item.wa_id === inbound.from);
    if (!conversation) { conversation = { id: `conversation-${state.conversations.length + 1}`, integration_id: integration.id, wa_id: inbound.from }; state.conversations.push(conversation); }
    const body = inbound.text?.body ?? '';
    const stored = { id: `message-${state.messages.length + 1}`, external_message_id: inbound.id, conversation_id: conversation.id, agent_status: 'processing', body };
    state.messages.push(stored);
    const parsed = parseYara(body);
    let reply;
    if (parsed?.missing) reply = `Para criar ${parsed.type}, informe: ${parsed.missing.join(', ')}.`;
    else if (parsed) {
      const project = { id: `project-${state.projects.length + 1}`, user_id: integration.user_id, nome: parsed.type, width: parsed.width / 1000, height: parsed.height / 1000, depth: parsed.depth / 1000 };
      state.projects.push(project); reply = `Projeto ${project.nome} criado. Medidas: ${parsed.width} × ${parsed.height} × ${parsed.depth} mm.`;
    } else reply = 'Mensagem recebida; preciso de um pedido de projeto com medidas.';
    state.sent.push({ to: inbound.from, text: reply });
    stored.agent_status = 'completed';
  }
  return { received: true };
}
function assert(condition, message) { if (!condition) throw new Error(message); }
const payload = (id, text) => ({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { metadata: { phone_number_id: 'phone-local-1' }, messages: [{ id, from: '5511999999999', type: 'text', text: { body: text } }] } }] }] });

fakeWebhook(payload('wamid-create-1', 'Crie um armário com 2 metros e cinquenta de largura, 2 metros de altura e 60 centímetros de profundidade'));
assert(state.projects.length === 1, 'projeto não foi criado');
assert(state.projects[0].width === 2.5 && state.projects[0].height === 2 && state.projects[0].depth === 0.6, 'dimensões incorretas');
assert(state.sent[0].text.includes('2500 × 2000 × 600 mm'), 'resposta de criação incorreta');
const sentBeforeDuplicate = state.sent.length;
fakeWebhook(payload('wamid-create-1', 'Crie um armário com 2 metros e cinquenta de largura, 2 metros de altura e 60 centímetros de profundidade'));
assert(state.projects.length === 1 && state.sent.length === sentBeforeDuplicate, 'idempotência falhou');
fakeWebhook(payload('wamid-missing-1', 'Crie uma cozinha de 2 metros de largura'));
assert(state.projects.length === 1 && state.sent.at(-1).text.includes('height') && state.sent.at(-1).text.includes('depth'), 'pedido de dados faltantes incorreto');

console.log(JSON.stringify({ ok: true, assertions: ['criação determinística', 'conversão para metros no banco', 'resposta automática', 'idempotência por external_message_id', 'solicitação de dimensões faltantes'], projects: state.projects, sent: state.sent }, null, 2));
