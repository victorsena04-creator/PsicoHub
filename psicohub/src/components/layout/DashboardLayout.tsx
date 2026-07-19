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
  
  // Controle do estado do menu lateral deslizante (Drawer) no Mobile
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Consulta a nossa API local de versão (compara local com remota do GitHub)
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
    <div className="min-h-screen bg-background text-on-background flex overflow-x-hidden relative">
      
      {/* Sombra/Overlay escurecido de fundo que fecha o menu mobile ao clicar fora dele */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fadeIn"
        />
      )}

      {/* Barra de Navegação Lateral */}
      <Sidebar 
        mobileOpen={mobileOpen} 
        onClose={() => setMobileOpen(false)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Área de Conteúdo Principal (Ajusta margem esquerda no desktop) */}
      <main className="ml-0 md:ml-sidebar-width w-full min-h-screen bg-surface-bright flex flex-col transition-all duration-300">
        
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
        <header className="h-16 bg-surface border-b border-outline-variant flex justify-between md:justify-end items-center px-6 md:px-8 w-full z-30 sticky top-0">
          
          {/* Botão Hambúrguer + Logo - Visível apenas no Mobile */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex items-center justify-center p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
              title="Abrir Menu Lateral"
            >
              <span className="material-symbols-outlined text-[24px] leading-none">menu</span>
            </button>
            <span className="font-bold text-primary tracking-tight font-headline-sm text-lg select-none">
              PsicoHub
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {/* Espaço reservado para atalhos de topo futuros */}
          </div>
        </header>

        {/* Conteúdo Dinâmico das Páginas */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-[1440px] mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Modal de Configurações Administrativas (Posicionado no nível da página para sobrepor toda a tela) */}
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </div>
  );
}