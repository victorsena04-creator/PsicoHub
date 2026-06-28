"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { SettingsModal } from "./SettingsModal";

interface UpdateInfo {
  novaVersaoDisponivel: boolean;
  versaoRemota: string;
  versaoLocal: string;
  releaseNotes: string;
  downloadUrl: string;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    // Consulta a nossa API local de versão (ela compara a versão local com a remota do GitHub).
    // Nota: Em testes locais, você pode adicionar "?mock=true" na URL da chamada de API abaixo
    // para simular visualmente que há uma nova versão disponível na interface.
    const checkVersion = async () => {
      try {
        const query = typeof window !== "undefined" ? window.location.search : "";
        const response = await fetch(`/api/versao${query}`);
        const data = await response.json();
        if (data.success && data.novaVersaoDisponivel) {
          setUpdateInfo(data);
        }
      } catch (err) {
        console.error("Erro ao checar atualizações:", err);
      }
    };

    checkVersion();
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-background flex">
      {/* Barra de Navegação Lateral Fixa */}
      <Sidebar />

      {/* Área de Conteúdo Principal */}
      <main className="ml-sidebar-width w-full min-h-screen bg-surface-bright flex flex-col">
        
        {/* Banner Premium de Atualização do GitHub */}
        {updateInfo && (
          <div className="bg-primary/10 border-b border-primary/20 text-primary px-8 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <span className="material-symbols-outlined text-[20px] text-primary">update</span>
              <div>
                <span>Uma nova versão <strong>({updateInfo.versaoRemota})</strong> do PsicoHub está disponível! Você está usando a versão local {updateInfo.versaoLocal}.</span>
                {updateInfo.releaseNotes && (
                  <span className="block text-[11px] opacity-75 font-normal mt-0.5">Notas de lançamento: {updateInfo.releaseNotes}</span>
                )}
              </div>
            </div>
            <a
              href={updateInfo.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-on-primary text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-primary-container transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              Baixar Atualização
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>
        )}

        {/* Barra de Navegação Superior (TopNavBar) */}
        <header className="h-16 bg-surface border-b border-outline-variant flex justify-end items-center px-8 w-full z-40 sticky top-0">
          {/* Ações de Usuário (Ajustes de Configurações) */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high scale-95 active:scale-90 transition-transform cursor-pointer"
              title="Configurações do Sistema"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
        </header>

        {/* Conteúdo Dinâmico das Páginas */}
        <div className="flex-1 p-8 overflow-y-auto max-w-[1440px] mx-auto w-full">
          {children}
        </div>
        
        {/* Modal de Configurações Administrativas */}
        <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      </main>
    </div>
  );
}