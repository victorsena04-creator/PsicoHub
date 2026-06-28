"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MetasFormProps {
  metaProlaboreInicial: number;
  metaDespesasInicial: number;
  recebidoPJ: number;
  despesasPF: number;
  mesTexto: string;
  mes: number;
  ano: number;
}

export function MetasForm({
  metaProlaboreInicial,
  metaDespesasInicial,
  recebidoPJ,
  despesasPF,
  mesTexto,
  mes,
  ano,
}: MetasFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [metaPJ, setMetaPJ] = useState(metaProlaboreInicial.toString());
  const [metaPF, setMetaPF] = useState(metaDespesasInicial.toString());

  // Valores para comparar
  const valMetaPJ = parseFloat(metaPJ) || 0;
  const valMetaPF = parseFloat(metaPF) || 0;

  // Progresso das metas
  const progressoPJ = valMetaPJ > 0 ? Math.min(Math.round((recebidoPJ / valMetaPJ) * 100), 100) : 0;
  const progressoPF = valMetaPF > 0 ? Math.min(Math.round((despesasPF / valMetaPF) * 100), 100) : 0;

  const faltaPJ = Math.max(valMetaPJ - recebidoPJ, 0);
  const disponivelPF = Math.max(valMetaPF - despesasPF, 0);

  const handleSave = async (tipo: "PJ" | "PF") => {
    setLoading(true);
    try {
      const response = await fetch("/api/metas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meta_prolabore: tipo === "PJ" ? parseFloat(metaPJ) : valMetaPJ,
          meta_despesas: tipo === "PF" ? parseFloat(metaPF) : valMetaPF,
          mes,
          ano,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar metas.");
      }

      alert("Meta salva com sucesso!");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar a meta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Mês de Referência */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-background">Metas Financeiras</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            Acompanhe e configure seus objetivos de faturamento e limites de gastos mensais.
          </p>
        </div>
        <div className="flex gap-3">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary font-label-md text-label-md border border-primary/20 font-bold uppercase">
            {mesTexto}
          </span>
        </div>
      </div>

      {/* Bento Grid para as duas Metas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* CARD META PJ (BUSINESS) */}
        <div className="xl:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-[12px] p-6 flex flex-col relative overflow-hidden group hover:shadow-[0_10px_15px_-3px_rgb(0,0,0,0.05)] transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold font-label-sm text-label-sm mb-3">
                <span className="material-symbols-outlined text-[14px] mr-1">business_center</span>
                PJ Business
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Meta de Faturamento PJ</h3>
              <p className="text-on-surface-variant font-body-md text-body-md mt-1">
                Objetivo de receita bruta recebida no caixa do consultório.
              </p>
            </div>
            
            <div></div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mt-4 flex-1">
            {/* Gráfico Circular de Progresso */}
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="fill-none stroke-slate-200 stroke-[3px]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                ></path>
                <path
                  className="fill-none stroke-primary stroke-[2.8px] stroke-linecap-round transition-all duration-500 ease-out"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  strokeDasharray={`${progressoPJ}, 100`}
                ></path>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-headline-md text-headline-md text-primary font-bold">
                  {progressoPJ}%
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Atingido</span>
              </div>
            </div>

            {/* Valores e Input */}
            <div className="flex-1 w-full space-y-6">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                  Meta Estabelecida
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono-sm">
                      R$
                    </span>
                    <input
                      className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-body-md font-mono-sm focus:outline-none transition-all text-on-surface bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-transparent"
                      type="number"
                      value={metaPJ}
                      onChange={(e) => setMetaPJ(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={() => handleSave("PJ")}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Salvar Meta
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-outline-variant/40 pb-2">
                  <span className="font-body-md text-body-md text-on-surface-variant">Faturado no mês</span>
                  <span className="font-mono-sm text-mono-sm font-semibold text-on-surface">
                    R$ {recebidoPJ.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="font-body-md text-body-md text-on-surface-variant">Falta para a meta</span>
                  <span className="font-mono-sm text-mono-sm font-semibold text-primary">
                    R$ {faltaPJ.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD TETO PF (PERSONAL) */}
        <div className="xl:col-span-6 bg-surface-container-lowest border border-outline-variant rounded-[12px] p-6 flex flex-col relative overflow-hidden group hover:shadow-[0_10px_15px_-3px_rgb(0,0,0,0.05)] transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-secondary/10 text-secondary font-bold font-label-sm text-label-sm mb-3">
                <span className="material-symbols-outlined text-[14px] mr-1">person</span>
                PF Personal
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Teto de Gastos Pessoais PF</h3>
              <p className="text-on-surface-variant font-body-md text-body-md mt-1">
                Limite máximo planejado de saídas para contas pessoais.
              </p>
            </div>
            
            <div></div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mt-4 flex-1">
            {/* Gráfico Circular de Progresso */}
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="fill-none stroke-slate-200 stroke-[3px]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                ></path>
                <path
                  className="fill-none stroke-secondary stroke-[2.8px] stroke-linecap-round transition-all duration-500 ease-out"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  strokeDasharray={`${progressoPF}, 100`}
                ></path>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-headline-md text-headline-md text-secondary font-bold">
                  {progressoPF}%
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Consumido</span>
              </div>
            </div>

            {/* Valores e Input */}
            <div className="flex-1 w-full space-y-6">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                  Teto Limite
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono-sm">
                      R$
                    </span>
                    <input
                      className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-body-md font-mono-sm focus:outline-none transition-all text-on-surface bg-surface-container-lowest focus:ring-2 focus:ring-secondary focus:border-transparent"
                      type="number"
                      value={metaPF}
                      onChange={(e) => setMetaPF(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={() => handleSave("PF")}
                    disabled={loading}
                    className="bg-secondary hover:bg-secondary/95 text-on-secondary font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Salvar Meta
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-outline-variant/40 pb-2">
                  <span className="font-body-md text-body-md text-on-surface-variant">Gastos efetuados</span>
                  <span className="font-mono-sm text-mono-sm font-semibold text-on-surface">
                    R$ {despesasPF.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="font-body-md text-body-md text-on-surface-variant">Disponível no limite</span>
                  <span className="font-mono-sm text-mono-sm font-semibold text-secondary">
                    R$ {disponivelPF.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
