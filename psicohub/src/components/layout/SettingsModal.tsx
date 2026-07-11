"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estados de alteração de credenciais
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Estados de reset de banco de dados
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPass1, setResetPass1] = useState("");
  const [resetPass2, setResetPass2] = useState("");

  // Estados de integração do Google Agenda
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [configurado, setConfigurado] = useState(false);

  // Carregar as configurações quando o modal abrir
  useEffect(() => {
    if (isOpen) {
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

  if (!isOpen) return null;

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/usuario/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername ? newUsername.trim() : undefined,
          password: newPassword ? newPassword : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao atualizar credenciais.");
      }

      setSuccess("Credenciais atualizadas com sucesso!");
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Atualiza o estado da página
      router.refresh();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Falha ao atualizar configurações.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!resetPass1 || !resetPass2) {
      setError("Por favor, preencha os dois campos de confirmação da senha.");
      return;
    }

    if (resetPass1 !== resetPass2) {
      setError("As senhas digitadas são diferentes.");
      return;
    }

    if (!confirm("Você tem certeza ABSOLUTA que deseja resetar todo o banco de dados? Essa ação não pode ser desfeita!")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/usuario/reset-banco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordConfirm1: resetPass1,
          passwordConfirm2: resetPass2,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Falha ao resetar banco.");
      }

      alert("Banco de dados local limpo com sucesso! A página será reiniciada.");
      onClose();
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Erro ao resetar banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[100] animate-fadeIn p-4">
      <div className="bg-surface-bright border border-outline-variant rounded-xl max-w-md w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-outline-variant">
          <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">settings</span>
            Ajustes do Aplicativo
          </h3>
          <button 
            onClick={onClose} 
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Feedback de erro/sucesso */}
        {error && (
          <div className="p-3 mb-4 bg-error-container/20 border border-error-container text-error rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 mb-4 bg-secondary-container/20 border border-secondary text-secondary rounded-lg text-xs font-semibold">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Seção 1: Credenciais */}
          <div>
            <h4 className="font-label-md text-label-md font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">lock</span>
              Alterar Login e Senha
            </h4>
            <form onSubmit={handleUpdateCredentials} className="space-y-3.5">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1">Novo nome de usuário</label>
                <input
                  type="text"
                  placeholder="Ex: nova_ana"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-on-surface-variant mb-1">Nova Senha</label>
                  <input
                    type="password"
                    placeholder="Sua nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-on-surface-variant mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary hover:bg-primary/95 text-on-primary font-label-sm text-label-sm px-4 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>

          <hr className="border-outline-variant/60" />

          {/* Seção 3: Conexão com Google Agenda */}
          <div>
            <h4 className="font-label-md text-label-md font-bold text-on-surface mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
              Conexão Google Agenda {configurado && <span className="text-[10px] bg-secondary-container/20 text-secondary border border-secondary/20 px-1.5 py-0.2 rounded font-semibold ml-1">Ativo</span>}
            </h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed mb-4">
              Sincronize sua agenda do celular com o PsicoHub de forma bidirecional. Seus atendimentos aparecerão na agenda do Google e modificações feitas lá atualizarão o aplicativo local.
            </p>
            
            {!configurado ? (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">link</span>
                Conectar Google Agenda
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-secondary-container/10 border border-secondary/20 rounded-lg text-[11px] text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">check_circle</span>
                  <span><strong>Sua agenda está conectada!</strong> Modificações locais e no celular já estão integradas.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  disabled={loading}
                  className="w-full py-1.5 text-center text-xs font-semibold text-error hover:bg-error-container/10 border border-error/35 hover:border-error rounded-lg transition-all cursor-pointer"
                >
                  Desconectar Conta do Google
                </button>
              </div>
            )}
          </div>

          <hr className="border-outline-variant/60" />

          {/* Seção 2: Resetar Banco */}
          <div>
            <h4 className="font-label-md text-label-md font-bold text-error mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">delete_forever</span>
              Limpeza de Dados Locais
            </h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed mb-3">
              Limpe todas as informações financeiras, consultas e pacientes do sistema para iniciar do zero. O seu usuário atual de login NÃO será excluído.
            </p>

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-1.5 text-center text-xs font-semibold text-error hover:bg-error-container/10 border border-error/35 hover:border-error rounded-lg transition-all cursor-pointer"
              >
                Zerar Banco de Dados Local
              </button>
            ) : (
              <form onSubmit={handleResetDatabase} className="bg-error-container/5 border border-error-container/30 rounded-lg p-3 space-y-3.5">
                <div className="text-[10px] text-error font-bold flex items-start gap-1">
                  <span className="material-symbols-outlined text-sm shrink-0">warning</span>
                  <span>ATENÇÃO: Ação irreversível! Digite a sua senha de acesso duas vezes para confirmar.</span>
                </div>
                
                <div>
                  <label className="block text-[10px] text-on-surface-variant mb-1">Senha de Acesso</label>
                  <input
                    type="password"
                    placeholder="Sua senha atual"
                    value={resetPass1}
                    onChange={(e) => setResetPass1(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full px-3 py-1.5 bg-surface border border-error-container/40 rounded-lg text-xs focus:ring-1 focus:ring-error focus:border-error outline-none text-on-surface font-mono-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-on-surface-variant mb-1">Confirme a Senha de Acesso</label>
                  <input
                    type="password"
                    placeholder="Confirme a senha"
                    value={resetPass2}
                    onChange={(e) => setResetPass2(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full px-3 py-1.5 bg-surface border border-error-container/40 rounded-lg text-xs focus:ring-1 focus:ring-error focus:border-error outline-none text-on-surface font-mono-sm"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetConfirm(false);
                      setResetPass1("");
                      setResetPass2("");
                    }}
                    className="px-3 py-1.5 text-xs text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-error hover:bg-error/95 text-white font-semibold text-xs px-4 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Confirmar Reset Total
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
