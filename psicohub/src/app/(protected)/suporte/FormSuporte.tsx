"use client";

import { useState } from "react";

export function FormSuporte() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/suporte/senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword,
          targetUsername: "admin", // Altera a senha do principal 'admin'
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao atualizar senha.");
      }

      setMessage("✅ Senha do administrador principal (admin) atualizada com sucesso!");
      setNewPassword("");
    } catch (err: any) {
      setError(err.message || "Falha na comunicação com o banco local.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {message && (
        <div className="p-3 bg-secondary-container/20 border border-secondary-container/30 text-secondary rounded-lg text-xs font-semibold">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-error-container/20 border border-error-container text-error rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="new-password">
          Nova Senha do Administrador (`admin`)
        </label>
        <input
          className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline transition-all duration-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Digite a nova senha de acesso do psicólogo"
          required
          disabled={loading}
        />
      </div>

      <div className="flex justify-end pt-3">
        <button
          type="submit"
          disabled={loading || !newPassword}
          className="px-6 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent"></span>}
          Gravar Nova Senha
        </button>
      </div>
    </form>
  );
}
