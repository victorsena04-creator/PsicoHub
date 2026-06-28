"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import React from "react";

interface MesFiltroHeaderProps {
  titulo: string;
  subtitulo: string;
  actionButton?: React.ReactNode;
}

export function MesFiltroHeader({ titulo, subtitulo, actionButton }: MesFiltroHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Valores padrão se não estiverem na URL
  const mesAtual = searchParams.get("mes") || "";
  const anoAtual = searchParams.get("ano") || "";

  const meses = [
    { value: "", label: "Todos os Meses" },
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const anos = [
    { value: "", label: "Todos os Anos" },
    { value: "2025", label: "2025" },
    { value: "2026", label: "2026" },
    { value: "2027", label: "2027" },
  ];

  const handleFilterChange = (key: "mes" | "ano", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-outline-variant/60">
      {/* Título e Subtítulo */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">{titulo}</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">{subtitulo}</p>
      </div>

      {/* Seletores de Data e Ações */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-xl p-1.5 shadow-sm">
          {/* Mês */}
          <select
            value={mesAtual}
            onChange={(e) => handleFilterChange("mes", e.target.value)}
            className="bg-transparent border-none text-xs font-semibold text-on-surface outline-none cursor-pointer px-2.5 py-1 focus:ring-0"
          >
            {meses.map((m) => (
              <option key={m.value} value={m.value} className="bg-surface text-on-surface font-medium">
                {m.label}
              </option>
            ))}
          </select>

          <span className="h-4 w-px bg-outline-variant"></span>

          {/* Ano */}
          <select
            value={anoAtual}
            onChange={(e) => handleFilterChange("ano", e.target.value)}
            className="bg-transparent border-none text-xs font-semibold text-on-surface outline-none cursor-pointer px-2.5 py-1 focus:ring-0"
          >
            {anos.map((a) => (
              <option key={a.value} value={a.value} className="bg-surface text-on-surface font-medium">
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botão de Ação Slot se fornecido */}
        {actionButton && <div className="flex items-center shrink-0">{actionButton}</div>}
      </div>
    </div>
  );
}
