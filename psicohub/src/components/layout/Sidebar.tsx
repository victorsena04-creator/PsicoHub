"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NovoAgendamentoModal } from "@/components/agenda/NovoAgendamentoModal";

// Lista de itens do menu lateral básico
const baseMenuItems = [
  { name: "Dashboard", path: "/dashboard", icon: "dashboard" },
  { name: "Agenda", path: "/agenda", icon: "calendar_month" },
  { name: "Financeiro", path: "/financeiro", icon: "payments" },
  { name: "Recebimentos", path: "/recebimentos", icon: "call_received" },
  { name: "Despesas", path: "/despesas", icon: "receipt_long" },
  { name: "Pacientes", path: "/pacientes", icon: "groups" },
  { name: "Metas Financeiras", path: "/metas", icon: "track_changes" },
  { name: "Planejamento", path: "/planejamento", icon: "savings" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  onOpenSettings?: () => void;
}

export function Sidebar({ mobileOpen, onClose, onOpenSettings }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<{ username: string; role: string } | null>(null);

  // Adiciona o link do desenvolvedor no menu se for o e-mail administrador
  const [isDev, setIsDev] = useState(false);

  // Ler o cookie de informações do usuário no client-side após a montagem (evita erros de hidratação)
  useEffect(() => {
    const match = document.cookie.match(new RegExp('(^| )psicohub_user_info=([^;]+)'));
    if (match) {
      try {
        const decoded = decodeURIComponent(match[2]);
        const cleaned = decoded.startsWith('"') && decoded.endsWith('"') 
          ? decoded.slice(1, -1) 
          : decoded;
        const parsed = JSON.parse(cleaned);
        setSession(parsed);
        setIsDev(!!parsed.isDev);
      } catch (err) {
        console.error("Falha ao decodificar sessão:", err);
      }
    }
  }, []);

  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  // Limpa o estado de carregamento de navegação quando a rota muda
  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  // Construir menu dinâmico
  const menuItems = [...baseMenuItems];
  if (session?.role === "suporte") {
    menuItems.push({ name: "Painel Suporte", path: "/suporte", icon: "admin_panel_settings" });
  }
  // Se for Dev Admin, adiciona o painel de Dev no menu lateral
  if (isDev) {
    menuItems.push({ name: "Painel Dev (Admin)", path: "/dev", icon: "terminal" });
  }

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    onClose?.();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Erro ao efetuar logout:", err);
      window.location.href = "/login";
    }
  };

  const isSuporte = session?.role === "suporte";

  return (
    <nav className={`fixed left-0 top-0 h-full w-sidebar-width border-r border-outline-variant bg-surface z-50 flex flex-col py-3.5 transition-transform duration-300 md:translate-x-0 ${
      mobileOpen ? "translate-x-0" : "-translate-x-full"
    }`}>
      {/* Cabeçalho da Sidebar (Logo do Aplicativo) */}
      <div className="px-4 mb-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-headline-sm shrink-0">
            P
          </div>
          <div className="flex flex-col">
            <div className="font-headline-md text-headline-md font-bold text-primary leading-none">
              PsicoHub
            </div>
            <div className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">
              Gestão Clínica &amp; Financeira
            </div>
          </div>
        </div>
        {/* Botão de Fechar Menu no Mobile */}
        <button
          onClick={onClose}
          className="md:hidden text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-container-high rounded-full cursor-pointer flex items-center justify-center shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Botão de Atalho para Novo Agendamento (Ocultado para suporte técnico) */}
      {!isSuporte && (
        <div className="mx-3 mb-3 shrink-0" onClick={onClose}>
          <NovoAgendamentoModal />
        </div>
      )}

      {/* Links de Navegação Principal (Espaçamento interno compacto para não gerar scrollbar) */}
      <div className="flex-1 px-2.5 flex flex-col gap-0.5 font-label-md text-label-md overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || navigatingTo === item.path;
          const isPending = navigatingTo === item.path && pathname !== item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => {
                if (pathname !== item.path) {
                  setNavigatingTo(item.path);
                }
                onClose?.();
              }}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-150 text-xs ${
                isActive
                  ? "bg-secondary-container text-on-secondary-container border-l-2 border-primary font-bold shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high opacity-85 hover:opacity-100"
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] shrink-0 ${isPending ? "animate-spin text-primary" : ""}`}>
                {isPending ? "progress_activity" : item.icon}
              </span>
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Rodapé da Sidebar (Informações do Usuário, Ajustes & Logout) */}
      <div className="px-3 pt-2.5 border-t border-outline-variant mt-auto flex flex-col gap-0.5 shrink-0">
        {isSuporte && (
          <div className="flex items-center gap-2 mb-1 px-2">
            <span className="material-symbols-outlined text-primary text-[18px]">build</span>
            <div className="text-[11px] font-semibold text-primary">Suporte Técnico</div>
          </div>
        )}
        
        <button
          onClick={() => {
            onClose?.();
            onOpenSettings?.();
          }}
          className="w-full flex items-center gap-3 text-on-surface-variant hover:text-primary px-3 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors font-label-md text-left cursor-pointer text-xs"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">settings</span>
          <span className="truncate">Ajustes do Aplicativo</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 text-on-surface-variant hover:text-error px-3 py-1.5 rounded-lg hover:bg-error-container/10 transition-colors font-label-md text-left cursor-pointer text-xs"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">logout</span>
          <span className="truncate">Sair do Sistema</span>
        </button>
      </div>
    </nav>
  );
}