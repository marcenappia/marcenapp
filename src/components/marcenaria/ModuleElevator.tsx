import React, { useState } from 'react';
import { 
  Upload, ArrowUpFromLine, Loader2, Sparkles, Sofa,
  Download, DollarSign, Maximize2, X
} from 'lucide-react';
import { Button, Card, Modal, DecorationPanel, API_KEY, type DecorOption } from './shared';

interface Props {
  setBudgetProject: React.Dispatch<React.SetStateAction<any>>;
  navigateTo: (id: string) => void;
}

const ModuleElevator = ({ setBudgetProject, navigateTo }: Props) => {
  const [planImage, setPlanImage] = useState<string | null>(null);
  const [planBase64, setPlanBase64] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingLayout, setAnalyzingLayout] = useState(false);
  const [strictMode, setStrictMode] = useState(true);
  const [room, setRoom] = useState("auto");
  const [view, setView] = useState("perspective");
  const [showModal, setShowModal] = useState(false);
  const [furniturePlacement, setFurniturePlacement] = useState("");
  const [selectedDecor, setSelectedDecor] = useState<DecorOption>({ id: 'minimal', label: 'Minimalista', icon: undefined as any, prompt: 'Minimalist decoration, few objects, clean.' });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPlanImage(result);
        setPlanBase64(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const autoPlanLayout = async () => {
    if (!planBase64) return;
    setAnalyzingLayout(true);
    try {
      const promptText = "Atue como um Arquiteto Especialista. Analise esta planta baixa. Sugira, em apenas 1 ou 2 frases diretas, o melhor local para construir a marcenaria (armários, painéis, etc). Seja objetivo.";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: promptText }, { inlineData: { mimeType: "image/png", data: planBase64 } }] }] })
      });
      const data = await response.json();
      const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (suggestion) setFurniturePlacement(suggestion);
    } catch { alert("Erro ao analisar layout da planta."); } finally { setAnalyzingLayout(false); }
  };

  const generate = async () => {
    if (!planBase64) return;
    setLoading(true);
    try {
      const roomPrompt = room === 'auto' ? "Show the whole layout" : `Focus strictly on the ${room}`;
      const viewPrompt = view === 'perspective' ? "Realistic Eye-level Perspective" : view === 'isometric' ? "3D Isometric Floor Plan (Dollhouse view)" : "Architectural Elevation";
      const strictInstruction = strictMode
        ? "CRITICAL: EXTRUDE WALLS EXACTLY AS DRAWN. Keep empty spaces empty."
        : `Creative Mode: Furnish and decorate the space. Apply ${selectedDecor.label} style (${selectedDecor.prompt}).`;
      const placementPrompt = furniturePlacement ? `\n\nFURNITURE PLACEMENT: "${furniturePlacement}". Integrate it naturally.` : "";
      const finalPrompt = `ACT AS A 3D RENDERING ENGINE. INPUT: 2D Floor Plan. TASK: Create a ${viewPrompt} based STRICTLY on the plan lines. RULES: 1. ${strictInstruction} 2. Rise the walls from the black lines. 3. Apply realistic textures. 4. ${roomPrompt}. 5. Neutral daylight.${placementPrompt}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }, { inlineData: { mimeType: 'image/png', data: planBase64 } }] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } })
      });
      const data = await response.json();
      const img = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
      if (img) { setGeneratedImage(`data:image/png;base64,${img}`); setShowModal(true); }
      else throw new Error("Sem imagem gerada.");
    } catch (e: any) { alert(e.message || "Erro API"); } finally { setLoading(false); }
  };

  const analyzeForBudget = async () => {
    if (!generatedImage) return;
    setAnalyzing(true);
    try {
      const imageBase64 = generatedImage.split(',')[1];
      const analysisPrompt = `Analyze furniture strictly. Estimate dims (meters). Return JSON: {"width": 2.0, "height": 2.5, "depth": 0.6, "drawers": 4, "doors": 4}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: analysisPrompt }, { inlineData: { mimeType: 'image/png', data: imageBase64 } }] }], generationConfig: { responseMimeType: "application/json" } })
      });
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const est = JSON.parse(text);
        setBudgetProject((prev: any) => ({ ...prev, width: est.width || 2, height: est.height || 2.5, depth: est.depth || 0.6, drawers: est.drawers || 2, doors: est.doors || 2 }));
        setShowModal(false); navigateTo('orcamento');
      }
    } catch { alert("Erro análise visual."); navigateTo('orcamento'); } finally { setAnalyzing(false); }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in pb-20 md:pb-0">
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 h-[250px] flex items-center justify-center relative bg-slate-50 border-dashed border-2 border-slate-300">
            {!planImage ? (
              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full hover:bg-emerald-50 transition-colors">
                <Upload className="text-emerald-500 mb-2" size={28} />
                <span className="text-sm font-bold text-slate-500">Enviar Planta 2D</span>
                <span className="text-xs text-slate-400 mt-1">PNG, JPG, PDF</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
              </label>
            ) : (
              <>
                <img src={planImage} className="h-full object-contain" />
                <button onClick={() => { setPlanImage(null); setPlanBase64(null); }} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </>
            )}
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Respeitar Geometria</span>
              <button
                onClick={() => setStrictMode(!strictMode)}
                className={`w-10 h-5 rounded-full relative transition-colors ${strictMode ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow transition-all ${strictMode ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Ambiente</label>
              <select value={room} onChange={e => setRoom(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm mt-1 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option value="auto">Automático</option>
                <option value="kitchen">Cozinha</option>
                <option value="bedroom">Quarto</option>
                <option value="living">Sala</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Vista</label>
              <div className="flex gap-2 mt-1">
                {['perspective', 'isometric', 'elevation'].map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`flex-1 py-2 text-[10px] uppercase font-bold rounded border transition-colors ${view === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    {v.substring(0, 4)}
                  </button>
                ))}
              </div>
            </div>
            {!strictMode && <DecorationPanel selectedDecor={selectedDecor} onSelect={setSelectedDecor} />}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1">
                  <Sofa size={14} /> Posicionar Móvel
                </label>
                <button
                  onClick={autoPlanLayout}
                  disabled={analyzingLayout || !planImage}
                  className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {analyzingLayout ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} IA
                </button>
              </div>
              <textarea
                value={furniturePlacement}
                onChange={(e) => setFurniturePlacement(e.target.value)}
                placeholder="Ex: Guarda-roupa na parede da direita..."
                className="w-full bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 text-sm h-20 outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <Button
              onClick={generate}
              disabled={loading || !planImage}
              className="w-full bg-emerald-600 hover:bg-emerald-700 border-none"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowUpFromLine size={18} />}
              {loading ? "Processando..." : "Elevar Paredes"}
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-8 bg-slate-900 rounded-xl h-[400px] lg:h-[600px] flex items-center justify-center border border-slate-700 overflow-hidden relative">
          {generatedImage ? (
            <>
              <img src={generatedImage} className="w-full h-full object-contain cursor-zoom-in" onClick={() => setShowModal(true)} />
              <button onClick={() => setShowModal(true)} className="absolute bottom-4 right-4 bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center gap-2">
                <Maximize2 size={14} /> Ampliar
              </button>
            </>
          ) : (
            <div className="text-center">
              <ArrowUpFromLine className="text-slate-600 mx-auto mb-3" size={40} />
              <span className="text-slate-500 text-xs">Resultado 3D aparecerá aqui</span>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Visualização 3D"
        footer={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (!generatedImage) return;
                const a = document.createElement('a');
                a.href = generatedImage;
                a.download = 'planta-3d.png';
                a.click();
              }}
              variant="secondary"
              icon={Download}
            >
              Baixar
            </Button>
            <Button onClick={analyzeForBudget} variant="primary" className="bg-emerald-600 hover:bg-emerald-700" icon={DollarSign}>
              {analyzing ? <Loader2 className="animate-spin" size={18} /> : "Gerar Orçamento"}
            </Button>
          </div>
        }
      >
        <img src={generatedImage || ''} className="w-full rounded shadow-lg" />
      </Modal>
    </>
  );
};

export default ModuleElevator;
