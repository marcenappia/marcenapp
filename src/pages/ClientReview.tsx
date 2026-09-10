import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Lock, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type ReviewData = {
  ok: boolean;
  error?: string;
  project_id?: string;
  version_id?: string;
  version_number?: number;
  snapshot?: Record<string, unknown>;
  render_path?: string | null;
  technical_drawing_path?: string | null;
  cut_plan_path?: string | null;
  client_budget_summary?: Record<string, unknown> | null;
};

type RpcResponse = { data: unknown; error: { message: string } | null };
const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (name: string, params: Record<string, unknown>) => Promise<RpcResponse>)(fn, args);

const ClientReview = () => {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [changeText, setChangeText] = useState("");
  const [status, setStatus] = useState("");

  const loadReview = async () => {
    if (!token) {
      setReview({ ok: false, error: "link_invalid_or_expired" });
      setLoading(false);
      return;
    }
    const { data, error } = await rpc("client_review_project", { p_token: token });
    setReview(error ? { ok: false, error: error.message } : (data as ReviewData));
    setLoading(false);
  };

  useEffect(() => { void loadReview(); }, []);

  const approve = async () => {
    setStatus("Registrando aprovação…");
    const { data, error } = await rpc("client_approve_project", {
      p_token: token,
      p_client_name: clientName.trim(),
      p_client_email: clientEmail.trim() || null,
      p_evidence: { user_agent: navigator.userAgent, screen: `${window.innerWidth}x${window.innerHeight}` },
    });
    const result = data as { ok?: boolean } | null;
    if (error || !result?.ok) setStatus(error?.message || "Não foi possível aprovar esta versão.");
    else setStatus("Projeto aprovado. A próxima etapa é preparar os dados do contrato.");
    await loadReview();
  };

  const requestChange = async () => {
    if (!changeText.trim()) return;
    setStatus("Enviando solicitação…");
    const { data, error } = await rpc("client_request_project_change", {
      p_token: token,
      p_client_name: clientName.trim() || "Cliente",
      p_client_email: clientEmail.trim() || null,
      p_summary: changeText.trim().slice(0, 240),
      p_message_type: "text",
      p_body: changeText.trim(),
    });
    const result = data as { ok?: boolean } | null;
    if (error || !result?.ok) setStatus(error?.message || "Não foi possível enviar a alteração.");
    else { setChangeText(""); setStatus("Solicitação enviada ao profissional."); }
  };

  if (loading) return <main className="min-h-screen grid place-items-center p-6">Carregando projeto…</main>;
  if (!review?.ok) return <main className="min-h-screen grid place-items-center p-6"><Card className="max-w-lg w-full"><CardContent className="p-8 text-center"><Lock className="mx-auto mb-4" /><h1 className="text-xl font-semibold">Link indisponível</h1><p className="text-muted-foreground mt-2">Este link pode ter expirado ou sido revogado. Solicite um novo link ao profissional.</p></CardContent></Card></main>;

  const snapshot = review.snapshot || {};
  const title = String(snapshot.name || snapshot.nome || "Projeto");
  const image = review.render_path || (typeof snapshot.render_path === "string" ? snapshot.render_path : null);

  return <main className="min-h-screen bg-muted/30 p-4 md:p-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <Card><CardHeader><div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Visualização segura · Versão {review.version_number}</div><CardTitle className="text-2xl">{title}</CardTitle></CardHeader><CardContent className="space-y-5">
        {image ? <img src={image} alt={`Render do projeto ${title}`} className="w-full max-h-[520px] object-contain rounded-lg border bg-background" /> : <div className="rounded-lg border bg-background p-10 text-center text-muted-foreground">A apresentação visual desta versão ainda não foi anexada.</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          {review.technical_drawing_path && <a className="flex items-center gap-2 rounded-lg border p-4 hover:bg-muted" href={review.technical_drawing_path} target="_blank" rel="noreferrer"><FileText className="h-5 w-5" /> Desenho técnico 2D</a>}
          {review.cut_plan_path && <a className="flex items-center gap-2 rounded-lg border p-4 hover:bg-muted" href={review.cut_plan_path} target="_blank" rel="noreferrer"><FileText className="h-5 w-5" /> Plano de corte</a>}
        </div>
        <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">Você está visualizando somente a versão compartilhada. Custos internos, margens, outros projetos e dados de produção permanecem privados.</div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Se precisar de alteração</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Seu nome" value={clientName} onChange={e => setClientName(e.target.value)} /><Input placeholder="Seu e-mail (opcional)" value={clientEmail} onChange={e => setClientEmail(e.target.value)} /></div><Textarea placeholder="Descreva o que você gostaria de alterar…" value={changeText} onChange={e => setChangeText(e.target.value)} /><Button onClick={requestChange} disabled={!changeText.trim()}><MessageSquare className="mr-2 h-4 w-4" />Solicitar alteração</Button></CardContent></Card>

      <Card><CardHeader><CardTitle>Está tudo certo?</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Ao aprovar, você confirma especificamente esta versão do projeto.</p><Button onClick={approve} disabled={!clientName.trim()}><CheckCircle2 className="mr-2 h-4 w-4" />Aprovar projeto</Button>{status && <p className="text-sm">{status}</p>}</CardContent></Card>

      <p className="text-center text-xs text-muted-foreground">Marcenapp · compartilhamento controlado por versão</p>
    </div>
  </main>;
};

export default ClientReview;
