"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [session, setSession] = useState<{ email: string; role: string } | null>(null);

  // Estados de reset de banco de dados
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetEmailConfirm, setResetEmailConfirm] = useState("");

  // Estados de integração do Google Agenda
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [configurado, setConfigurado] = useState(false);

  // Garante que o Portal só seja renderizado no navegador após a montagem do componente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Carregar as configurações e sessão quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      // Carregar sessão dos cookies
      const match = document.cookie.match(new RegExp('(^| )psicohub_user_info=([^;]+)'));
      if (match) {
        try {
          const decoded = decodeURIComponent(match[2]);
          const cleaned = decoded.startsWith('"') && decoded.endsWith('"') 
            ? decoded.slice(1, -1) 
            : decoded;
          setSession(JSON.parse(cleaned));
        } catch (err) {
          console.error("Falha ao decodificar sessão:", err);
        }
      }

      // Carregar configurações do Google Agenda
      const fetchGoogleConfig = async () => {
        try {
          const res = await fetch("/api/integracoes/google-calendar/config");
          const data = await res.json();
          if (data.success) {
            setClientId(data.data.clientId);
            setClientSecret(data.data.clientSecret);
            setRefreshToken(data.data.refreshToken);
            setCalendarId(data.data.calendarId);
            setConfigurado(data.data.configurado);
          }
        } catch (err) {
          console.error("Erro ao carregar dados do Google Agenda:", err);
        }
      };
      fetchGoogleConfig();
    }
  }, [isOpen]);

  const handleConnectGoogle = () => {
    window.open("/api/integracoes/google-calendar/login", "_blank");
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Você tem certeza que deseja desconectar o Google Agenda? Seus atendimentos locais não serão mais integrados com a agenda do celular.")) {
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/integracoes/google-calendar/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "desconectar" }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao desconectar Google Agenda.");
      }

      setSuccess("Google Agenda desconectado com sucesso!");
      setConfigurado(false);
      setTimeout(() => setSuccess(""), 3000);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Falha ao desconectar.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!resetEmailConfirm) {
      setError("Por favor, digite seu e-mail para confirmar o reset.");
      return;
    }

    if (resetEmailConfirm.trim().toLowerCase() !== session?.email.toLowerCase()) {
      setError("O e-mail digitado não corresponde ao seu e-mail ativo.");
      return;
    }

    if (!confirm("Você tem certeza ABSOLUTA que deseja resetar todo o banco de dados do seu consultório? Essa ação é IRREVERSÍVEL!")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/usuario/reset-banco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailConfirmacao: resetEmailConfirm.trim().toLowerCase(),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao resetar banco.");
      }

      alert(data.message || "Banco de dados limpo com sucesso! A página será recarregada.");
      setShowResetConfirm(false);
      setResetEmailConfirm("");
      onClose();
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Erro ao resetar banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  // Injeta o modal diretamente na raiz da página (document.body) usando React Portal
  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fadeIn p-4 overflow-x-hidden">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg sm:max-w-xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col gap-6">
        
        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center pb-4 border-b border-outline-variant/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">settings</span>
            </div>
            <div>
              <h3 className="font-title-lg text-title-lg font-bold text-on-surface">
                Ajustes do Aplicativo
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Gerencie sua conta e integrações com o PsicoHub.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
            title="Fechar Modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Feedback de erro/sucesso */}
        {error && (
          <div className="p-3.5 bg-error-container/20 border border-error/30 text-error rounded-xl text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3.5 bg-secondary-container/20 border border-secondary/30 text-secondary rounded-xl text-xs font-semibold leading-relaxed">
            {success}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Seção 1: Credenciais (Google Auth Info) */}
          <div className="bg-surface-container-low/60 border border-outline-variant/60 rounded-xl p-4 sm:p-5">
            <h4 className="font-title-sm text-title-sm font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">verified_user</span>
              Sua Conta Conectada
            </h4>
            <div className="flex items-center gap-3.5 bg-surface-container-lowest p-3.5 rounded-lg border border-outline-variant/40">
              <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[22px]">account_circle</span>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-label-md text-label-md font-bold text-on-surface">
                  Login via Google OAuth 2.0
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate font-mono text-xs mt-0.5">
                  {session?.email || "Carregando..."}
                </span>
              </div>
            </div>
          </div>

          {/* Seção 2: Conexão com Google Agenda */}
          <div className="bg-surface-container-low/60 border border-outline-variant/60 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-title-sm text-title-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
                Conexão Google Agenda
              </h4>
              {configurado && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-secondary-container/30 text-secondary border border-secondary/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  Conectado
                </span>
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-4">
              Sincronize sua agenda do celular com o PsicoHub de forma bidirecional. Seus atendimentos aparecerão na agenda do Google e modificações feitas lá atualizarão o aplicativo na nuvem.
            </p>
            
            {!configurado ? (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={loading}
                className="w-full h-10 bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-md text-label-md rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 font-semibold"
              >
                <span className="material-symbols-outlined text-[18px]">link</span>
                Conectar Google Agenda
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-secondary-container/10 border border-secondary/20 rounded-lg text-xs text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                  <span><strong>Sua agenda está conectada!</strong> Atendimentos criados são sincronizados com seu celular.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  disabled={loading}
                  className="w-full h-9 text-center text-xs font-semibold text-error hover:bg-error-container/10 border border-error/30 hover:border-error rounded-lg transition-all cursor-pointer"
                >
                  Desconectar Conta do Google
                </button>
              </div>
            )}
          </div>

          {/* Seção 3: Resetar Banco */}
          <div className="bg-error-container/5 border border-error-container/20 rounded-xl p-4 sm:p-5">
            <h4 className="font-title-sm text-title-sm font-bold text-error mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
              Limpeza de Dados do Consultório
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-3">
              Limpe todas as informações financeiras, consultas e pacientes deste consultório na nuvem para iniciar do zero. O seu usuário de login permanecerá ativo.
            </p>

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full h-9 text-center text-xs font-semibold text-error hover:bg-error-container/15 border border-error/30 hover:border-error rounded-lg transition-all cursor-pointer"
              >
                Zerar Dados do Consultório
              </button>
            ) : (
              <form onSubmit={handleResetDatabase} className="bg-surface-container-lowest border border-error/30 rounded-xl p-4 flex flex-col gap-3.5 mt-2">
                <div className="text-xs text-error font-bold flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-[18px] shrink-0">warning</span>
                  <span>ATENÇÃO: Ação irreversível! Digite seu e-mail de acesso para confirmar.</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Confirme seu E-mail</label>
                  <input
                    type="email"
                    placeholder={session?.email || "seu-email@gmail.com"}
                    value={resetEmailConfirm}
                    onChange={(e) => setResetEmailConfirm(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-lg text-xs focus:outline-none focus:border-error text-on-surface font-mono"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetConfirm(false);
                      setResetEmailConfirm("");
                    }}
                    className="h-9 px-3 text-xs text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !resetEmailConfirm}
                    className="h-9 bg-error hover:bg-error/95 text-white font-semibold text-xs px-4 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Confirmar Reset Total
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
