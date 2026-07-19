"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth as clientAuth, googleProvider } from "@/lib/firebaseClient";
import { signInWithPopup } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Abre o login do Google na popup
      const result = await signInWithPopup(clientAuth, googleProvider);
      const user = result.user;

      // 2. Obtém o ID Token seguro do Firebase
      const idToken = await user.getIdToken();

      // 3. Envia o ID Token para a nossa API criar os cookies de sessão seguros
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        // Se falhar (ex: e-mail não autorizado), desloga do Firebase client para limpar estado
        await clientAuth.signOut();
        throw new Error(data.error || "E-mail do Google não autorizado no sistema.");
      }

      console.log(`✅ Login efetuado com sucesso (Papel: ${data.role})`);
      
      // Redireciona de acordo com o tipo de usuário
      if (data.isDev) {
        router.push("/dev");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("🚨 Erro de Login:", err);
      // Trata mensagens amigáveis de erro
      if (err.code === "auth/popup-closed-by-user") {
        setError("A janela de login foi fechada antes de concluir.");
      } else {
        setError(err.message || "Falha na conexão com o Firebase Auth.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 md:p-8 antialiased selection:bg-primary-container/20 selection:text-primary">
      <main className="w-full max-w-[420px] bg-surface-container-lowest rounded-xl border border-outline-variant p-8 md:p-10 shadow-[0_10px_15px_-3px_rgb(0,0,0,0.05)] flex flex-col relative z-10 overflow-hidden">
        {/* Orbe de gradiente sutil no fundo para design premium */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Logo & Cabeçalho */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              psychology
            </span>
            <h1 className="font-headline-md text-headline-md text-primary tracking-tight">
              PsicoHub
            </h1>
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">
            Bem-vindo ao Consultório
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant text-center">
            Faça login com sua conta Google autorizada para acessar seu painel online.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-error-container/20 border border-error-container text-error rounded-lg text-xs font-semibold text-center leading-relaxed">
            {error}
          </div>
        )}

        {/* Botão Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-11 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center gap-3 transition-colors active:scale-[0.98] shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <span className="text-on-surface-variant animate-pulse font-semibold">Autenticando...</span>
          ) : (
            <>
              {/* Ícone vetorizado do Google */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-semibold text-on-surface">Entrar com o Google</span>
            </>
          )}
        </button>

        {/* Rodapé informativo */}
        <div className="mt-8 pt-6 border-t border-outline-variant flex flex-col items-center justify-center gap-3">
          <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider text-[10px]">
            Hospedagem em Nuvem Conectada
          </span>
          <div className="flex items-center gap-3 text-xs text-on-surface-variant font-medium">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              Pessoa Física (PF)
            </span>
            <span className="text-outline-variant">|</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Pessoa Jurídica (PJ)
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
