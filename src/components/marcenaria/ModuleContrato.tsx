import React, { useState } from 'react';
import { Sparkles, Plus, Printer, Loader2, X, Scale } from 'lucide-react';
import { Button, Card, Modal, InputGroup, API_KEY } from './shared';

const ModuleContrato = () => {
  const [data, setData] = useState({ client: "Cliente", value: 8500, days: 45, crooked: true, pipes: true });
  const [showModal, setShowModal] = useState(false);
  const [customClauses, setCustomClauses] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  const generateClause = async () => {
    if (!aiPrompt) return;
    setLoadingAi(true);
    try {
      const prompt = `Atue como Advogado especialista em contratos de marcenaria. Escreva uma cláusula contratual curta e objetiva sobre: "${aiPrompt}". Responda em Português, de forma formal e juridicamente sólida.`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const res = await response.json();
      const text = res.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) { setCustomClauses([...customClauses, text]); setAiPrompt(""); }
    } catch { alert("Erro na IA. Tente novamente."); } finally { setLoadingAi(false); }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in pb-20 md:pb-0">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-6 space-y-4">
            <InputGroup label="Nome do Cliente" value={data.client} onChange={v => setData({ ...data, client: String(v) })} type="text" />
            <InputGroup label="Valor Total (R$)" value={data.value} onChange={v => setData({ ...data, value: Number(v) })} prefix="R$" />
            <InputGroup label="Prazo (Dias Úteis)" value={data.days} onChange={v => setData({ ...data, days: Number(v) })} suffix="dias" />

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="flex items-center gap-3 text-sm text-slate-700 font-medium cursor-pointer hover:text-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={data.crooked}
                  onChange={e => setData({ ...data, crooked: e.target.checked })}
                  className="accent-indigo-600 w-4 h-4"
                />
                Cláusula Parede Torta
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-700 font-medium cursor-pointer hover:text-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={data.pipes}
                  onChange={e => setData({ ...data, pipes: e.target.checked })}
                  className="accent-indigo-600 w-4 h-4"
                />
                Cláusula Risco Hidráulico
              </label>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-indigo-600 uppercase mb-2 flex items-center gap-1">
                <Sparkles size={12} /> Gerar Cláusula com IA
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && generateClause()}
                  placeholder="Ex: Cliente tem cachorro..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  onClick={generateClause}
                  disabled={loadingAi}
                  className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shrink-0"
                >
                  {loadingAi ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                </button>
              </div>
            </div>

            <Button onClick={() => setShowModal(true)} icon={Printer} className="w-full mt-2 bg-amber-600 hover:bg-amber-700 border-none">
              Visualizar Impressão
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="p-8 h-[600px] overflow-y-auto font-serif text-slate-800 border-l-4 border-amber-600 shadow-xl scrollbar-thin">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Scale size={24} className="text-amber-600" />
              <h2 className="text-center font-bold text-xl uppercase">Contrato de Prestação de Serviços</h2>
            </div>
            <div className="w-16 h-0.5 bg-amber-600 mx-auto mb-6"></div>

            <p className="mb-4 text-justify leading-relaxed">
              Pelo presente instrumento particular, a <strong>MARCENARIA</strong> (doravante denominada CONTRATADA)
              e <strong>{data.client}</strong> (doravante denominado CONTRATANTE), ajustam a confecção e instalação
              de móveis planejados, conforme condições abaixo estabelecidas.
            </p>
            <p className="mb-4 text-justify leading-relaxed">
              <strong>DO PREÇO:</strong> O valor total dos serviços é de{' '}
              <strong>R$ {Number(data.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>,
              a ser pago conforme cronograma acordado entre as partes.
            </p>
            <p className="mb-4 text-justify leading-relaxed">
              <strong>DO PRAZO:</strong> A entrega e instalação ocorrerão em{' '}
              <strong>{data.days} dias úteis</strong> após a medição final e confirmação do pagamento inicial.
            </p>

            {data.crooked && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded text-sm text-justify leading-relaxed">
                <strong>CLÁUSULA TÉCNICA — CONDIÇÕES CIVIS:</strong> A Contratada não se responsabiliza por imperfeições
                na construção civil, tais como paredes fora de esquadro, pisos irregulares ou desníveis. Eventuais
                ajustes necessários decorrentes dessas condições serão realizados mediante orçamento adicional.
              </div>
            )}
            {data.pipes && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded text-sm text-justify leading-relaxed">
                <strong>CLÁUSULA HIDRÁULICA E ELÉTRICA:</strong> O Contratante é responsável por fornecer a planta
                hidráulica e elétrica atualizada do imóvel. Perfurações acidentais em tubulações ou fiações não sinalizadas
                são de responsabilidade exclusiva do Contratante.
              </div>
            )}

            {customClauses.map((clause, idx) => (
              <div key={idx} className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded text-sm text-justify leading-relaxed relative group">
                <button
                  onClick={() => setCustomClauses(customClauses.filter((_, i) => i !== idx))}
                  className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                >
                  <X size={14} />
                </button>
                <strong>CLÁUSULA ADICIONAL {idx + 1}:</strong> {clause}
              </div>
            ))}

            <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between text-sm">
              <div className="text-center w-48">
                <div className="border-b border-slate-800 mb-2 h-8"></div>
                <p className="font-medium">Marcenaria (Contratada)</p>
              </div>
              <div className="text-center w-48">
                <div className="border-b border-slate-800 mb-2 h-8"></div>
                <p className="font-medium">{data.client} (Contratante)</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Pré-visualização de Impressão"
        footer={
          <Button onClick={() => window.print()} icon={Printer}>
            Imprimir Agora
          </Button>
        }
      >
        <div className="bg-white p-8 text-slate-800 font-serif rounded">
          <h1 className="text-2xl font-bold text-center mb-8 uppercase">Contrato de Serviços</h1>
          <p className="mb-2"><strong>Contratante:</strong> {data.client}</p>
          <p className="mb-2"><strong>Valor:</strong> R$ {Number(data.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="mb-6"><strong>Prazo:</strong> {data.days} dias úteis</p>
          {customClauses.length > 0 && (
            <div className="mb-6 space-y-2">
              {customClauses.map((c, i) => <p key={i} className="text-sm"><strong>Cláusula {i + 1}:</strong> {c}</p>)}
            </div>
          )}
          <p className="text-sm text-slate-600">Declaro estar de acordo com todas as cláusulas apresentadas neste instrumento.</p>
          <div className="mt-16 border-t border-slate-800 w-1/2 pt-2 text-sm">Assinatura do Contratante</div>
        </div>
      </Modal>
    </>
  );
};

export default ModuleContrato;
