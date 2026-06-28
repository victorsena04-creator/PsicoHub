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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<{ username: string; role: string } | null>(null);

  // Ler o cookie de informações do usuário no client-side após a montagem (evita erros de hidratação)
  useEffect(() => {
    const match = document.cookie.match(new RegExp('(^| )psicohub_user_info=([^;]+)'));
    if (match) {
      try {
        const decoded = decodeURIComponent(match[2]);
        // Limpar possíveis aspas externas que o cookie armazena
        const cleaned = decoded.startsWith('"') && decoded.endsWith('"') 
          ? decoded.slice(1, -1) 
          : decoded;
        setSession(JSON.parse(cleaned));
      } catch (err) {
        console.error("Falha ao decodificar sessão:", err);
      }
    }
  }, []);

  // Construir menu dinâmico: se for suporte, adiciona o Painel de Suporte
  const menuItems = [...baseMenuItems];
  if (session?.role === "suporte") {
    menuItems.push({ name: "Painel Suporte", path: "/suporte", icon: "admin_panel_settings" });
  }

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
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
    <nav className="hidden md:flex flex-col h-full py-lg fixed left-0 top-0 h-full w-sidebar-width border-r border-outline-variant bg-surface z-50">
      {/* Cabeçalho da Sidebar (Logo do Aplicativo) */}
      <div className="px-md mb-xl flex items-center gap-md">
        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-headline-sm">
          P
        </div>
        <div>
          <div className="font-headline-md text-headline-md font-bold text-primary">
            PsicoHub
          </div>
          <div className="font-label-sm text-label-sm text-on-surface-variant">
            Gestão Clínica & Financeira
          </div>
        </div>
      </div>

      {/* Botão de Atalho para Novo Agendamento (Ocultado para suporte técnico) */}
      {!isSuporte && (
        <div className="mx-md mb-lg">
          <NovoAgendamentoModal />
        </div>
      )}

      {/* Links de Navegação Principal */}
      <div className="flex-1 px-sm flex flex-col gap-xs font-label-md text-label-md overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-md px-md py-sm rounded-lg transition-all duration-150 ${
                isActive
                  ? "bg-secondary-container text-on-secondary-container border-l-2 border-primary font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high opacity-85 hover:opacity-100"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Rodapé da Sidebar (Informações do Usuário & Logout) */}
      <div className="px-md pt-md border-t border-outline-variant mt-auto">
        {isSuporte && (
          <div className="flex items-center gap-md mb-3 px-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">build</span>
            <div className="text-xs font-semibold text-primary">Suporte Técnico</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-md text-on-surface-variant hover:text-error px-md py-sm rounded-lg hover:bg-error-container/10 transition-colors font-label-md text-left cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sair do Sistema
        </button>
      </div>
    </nav>
  );
}