import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

const renderBootstrapError = (message = "Não foi possível carregar o Marcenapp.") => {
  const root = document.getElementById("root");
  if (!root) return;

  root.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#020617;color:#fff;font-family:Manrope,system-ui,sans-serif">
      <section style="width:100%;max-width:520px;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:28px;background:rgba(255,255,255,.05);box-shadow:0 24px 80px rgba(0,0,0,.35)">
        <div style="font-size:13px;font-weight:800;letter-spacing:.08em">MARCENAPP</div>
        <h1 style="margin:10px 0 8px;font-size:22px">O aplicativo não conseguiu abrir.</h1>
        <p style="margin:0;color:#94a3b8;line-height:1.6">${message}</p>
        <button id="marcenapp-reload" type="button" style="margin-top:22px;border:0;border-radius:12px;padding:12px 18px;background:#fff;color:#020617;font-weight:800;cursor:pointer">
          Recarregar Marcenapp
        </button>
      </section>
    </main>
  `;

  document.getElementById("marcenapp-reload")?.addEventListener("click", () => {
    window.location.reload();
  });
};

const reportBootstrapFailure = (reason: unknown) => {
  console.error("Marcenapp bootstrap failure:", reason);
  renderBootstrapError(
    "Houve uma falha ao carregar os arquivos da aplicação. Recarregue para buscar a versão atualizada."
  );
};

window.addEventListener("error", (event) => {
  if (event.error) console.error("Marcenapp window error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Marcenapp unhandled promise rejection:", event.reason);
});

if (!rootElement) {
  reportBootstrapFailure(new Error("Elemento #root não encontrado."));
} else {
  try {
    createRoot(rootElement).render(<App />);
  } catch (error) {
    reportBootstrapFailure(error);
  }
}
