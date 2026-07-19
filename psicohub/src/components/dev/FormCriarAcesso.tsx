"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Consultorio {
  id: string;
  nome: string;
}

interface FormCriarAcessoProps {
  consultorios: Consultorio[];
}

export function FormCriarAcesso({ consultorios }: FormCriarAcessoProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [consultorioId, setConsultorioId] = useState("");
  const [role, setRole] = useState("principal");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !consultorioId) return;

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/dev/criar-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          consultorioId,
          role
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao conceder acesso.");
      }

      setEmail("");
      setConsultorioId("");
      setRole("principal");
      setMessage({ text: `Acesso liberado para "${data.email}"!`, type: "success" });
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

      {/* Campo E-mail do Google */}
      <div className="flex flex-col gap-1.5">
        <label className="font-label-md text-label-md text-on-surface" htmlFor="email-acesso">
          E-mail do Google (Gmail/Workspace)
        </label>
        <input
          id="email-acesso"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ex: psicologo.atendimento@gmail.com"
          required
          disabled={loading}
          className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline transition-all focus:outline-none focus:border-primary disabled:opacity-50"
        />
      </div>

      {/* Campo Consultório */}
      <div className="flex flex-col gap-1.5">
        <label className="font-label-md text-label-md text-on-surface" htmlFor="consultorio-acesso">
          Vincular ao Consultório
        </label>
        <select
          id="consultorio-acesso"
          value={consultorioId}
          onChange={(e) => setConsultorioId(e.target.value)}
          required
          disabled={loading}
          className="w-full h-10 px-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary disabled:opacity-50"
        >
          <option value="">Selecione um consultório...</option>
          {consultorios.map(c => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Campo Papel */}
      <div className="flex flex-col gap-1.5">
        <label className="font-label-md text-label-md text-on-surface" htmlFor="role-acesso">
          Papel de Acesso
        </label>
        <select
          id="role-acesso"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          disabled={loading}
          className="w-full h-10 px-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary disabled:opacity-50"
        >
          <option value="principal">Principal (Psicólogo Proprietário)</option>
          <option value="suporte">Suporte (Secretária / Equipe Técnica)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading || !email.trim() || !consultorioId}
        className="w-full h-10 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Liberando..." : "Conceder Acesso"}
        {!loading && <span className="material-symbols-outlined text-[18px]">key</span>}
      </button>
    </form>
  );
}
