"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Usuário ou senha incorretos.");
      }

      console.log(`✅ Login efetuado com sucesso como ${data.role}`);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Erro de conexão com o servidor local.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 md:p-8 antialiased selection:bg-primary-container/20 selection:text-primary">
      <main className="w-full max-w-[420px] bg-surface-container-lowest rounded-xl border border-outline-variant p-8 md:p-10 shadow-[0_10px_15px_-3px_rgb(0,0,0,0.05)] flex flex-col relative z-10 overflow-hidden">
        {/* Orbe de gradiente sutil no fundo para dar acabamento premium */}
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
            Bem-vindo de volta
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant text-center">
            Insira suas credenciais para acessar seu consultório local.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-error-container/20 border border-error-container text-error rounded-lg text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
          {/* Campo Nome de Usuário */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface" htmlFor="username">
              Nome de Usuário
            </label>
            <input
              className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline transition-all duration-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário (ex: admin ou support)"
              required
              disabled={loading}
            />
          </div>

          {/* Campo Senha */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="password">
                Senha
              </label>
              <a
                href="#"
                className="font-label-sm text-label-sm text-primary hover:text-on-primary-fixed-variant transition-colors hover:underline underline-offset-2"
              >
                Esqueci minha senha
              </a>
            </div>
            <input
              className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline transition-all duration-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {/* Botão de Envio */}
          <button
            className="mt-2 w-full h-10 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors active:scale-[0.98] shadow-sm disabled:opacity-75 cursor-pointer"
            type="submit"
            disabled={loading}
          >
            {loading ? "Acessando..." : "Acessar"}
            {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
          </button>
        </form>

        {/* Link de Cadastro */}
        <div className="mt-6 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Ainda não tem conta?{" "}
            <a
              className="font-label-md text-primary hover:text-on-primary-fixed-variant hover:underline underline-offset-2 transition-colors"
              href="#"
            >
              Cadastre-se
            </a>
          </p>
        </div>

        {/* Rodapé - Distinção de Identidades */}
        <div className="mt-8 pt-6 border-t border-outline-variant flex flex-col items-center justify-center gap-3">
          <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
            Gestão Unificada
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2 py-1 rounded">
              <span className="material-symbols-outlined text-primary text-[14px]">domain</span>
              <span className="font-label-sm text-label-sm text-primary font-semibold">PJ Business</span>
            </div>
            <span className="text-outline-variant text-xs">&amp;</span>
            <div className="flex items-center gap-1.5 bg-secondary/10 border border-secondary/20 px-2 py-1 rounded">
              <span className="material-symbols-outlined text-secondary text-[14px]">person</span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">PF Personal</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
