"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FormCriarConsultorio() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/dev/criar-consultorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao criar consultório.");
      }

      setNome("");
      setMessage({ text: `Consultório "${data.nome}" criado com ID: ${data.id}`, type: "success" });
      router.refresh();
    } catch (err: any) {
      setMessage({ text: err.message || "Falha na conexão.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {message.text && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${
          message.type === "success" 
            ? "bg-secondary-container/20 border border-secondary text-secondary" 
            : "bg-error-container/20 border border-error text-error"
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-label-md text-label-md text-on-surface" htmlFor="nome-consultorio">
          Nome do Consultório / Cliente
        </label>
        <input
          id="nome-consultorio"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Consultório de Psicologia Dr. Silva"
          required
          disabled={loading}
          className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline transition-all focus:outline-none focus:border-primary disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !nome.trim()}
        className="w-full h-10 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Criando..." : "Criar Consultório"}
        {!loading && <span className="material-symbols-outlined text-[18px]">add_circle</span>}
      </button>
    </form>
  );
}
