"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Recebimento {
  id: string;
  consulta_id: string | null;
  paciente_id: string;
  paciente_nome: string;
  paciente_frequencia: string;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: "pendente" | "pago" | "atrasado";
  forma_pagamento: string | null;
  tipo_conta: "PF" | "PJ";
  data_consulta: string | null;
}

interface RecebimentosTableProps {
  recebimentos: Recebimento[];
}

export function RecebimentosTable({ recebimentos }: RecebimentosTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Estados de filtro por coluna (Excel Style)
  const [filtroPaciente, setFiltroPaciente] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [filtroCaixa, setFiltroCaixa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const getFrequenciaLabel = (freq: string) => {
    const mapa: { [key: string]: string } = {
      semanal: "Terapia Semanal",
      quinzenal: "Terapia Quinzenal",
      mensal: "Terapia Mensal",
      avulso: "Sessão Avulsa",
    };
    return mapa[freq] || "Atendimento Recorrente";
  };

  // Filtrar os recebimentos reativamente no client-side
  const recebimentosFiltrados = recebimentos.filter((item) => {
    const dataFormatada = item.data_vencimento
      ? new Date(item.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Sem data";

    const matchPaciente = item.paciente_nome.toLowerCase().includes(filtroPaciente.toLowerCase()) || 
                          getFrequenciaLabel(item.paciente_frequencia).toLowerCase().includes(filtroPaciente.toLowerCase());
    const matchData = dataFormatada.toLowerCase().includes(filtroData.toLowerCase());
    const matchCaixa = filtroCaixa ? item.tipo_conta === filtroCaixa : true;
    const matchStatus = filtroStatus ? item.status === filtroStatus : true;

    return matchPaciente && matchData && matchCaixa && matchStatus;
  });

  const handlePagar = async (id: string) => {
    setLoadingId(id);
    try {
      const response = await fetch("/api/recebimentos/pagar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao liquidar recebimento.");
      }

      // Recarrega o Server Component da página para trazer a listagem atualizada do SQLite
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Erro ao marcar o recebimento como pago.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {/* Linha 1: Títulos das Colunas */}
            <tr className="bg-surface-container-low border-b border-outline-variant font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">Paciente</th>
              <th className="px-6 py-4">Data de Vencimento/Sessão</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Caixa de Destino</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>

            {/* Linha 2: Inputs de Filtros Reativos por Coluna (Estilo Excel) */}
            <tr className="border-b border-outline-variant/60 bg-surface-container-low/20">
              {/* Paciente */}
              <td className="py-2 px-6">
                <input
                  type="text"
                  value={filtroPaciente}
                  onChange={(e) => setFiltroPaciente(e.target.value)}
                  placeholder="Filtrar paciente..."
                  className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold"
                />
              </td>
              {/* Data Vencimento */}
              <td className="py-2 px-6">
                <input
                  type="text"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  placeholder="Filtrar data..."
                  className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold"
                />
              </td>
              {/* Valor */}
              <td className="py-2 px-6"></td>
              {/* Caixa Destino */}
              <td className="py-2 px-6">
                <select
                  value={filtroCaixa}
                  onChange={(e) => setFiltroCaixa(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold cursor-pointer"
                >
                  <option value="">Todos</option>
                  <option value="PF">PF - Personal</option>
                  <option value="PJ">PJ - Business</option>
                </select>
              </td>
              {/* Status */}
              <td className="py-2 px-6">
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold cursor-pointer"
                >
                  <option value="">Todos</option>
                  <option value="pago">Liquidado</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasado">Atrasado</option>
                </select>
              </td>
              <td className="py-2 px-6"></td>
            </tr>
          </thead>
          <tbody className="font-body-md text-body-md divide-y divide-outline-variant/50">
            {recebimentosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                  Nenhum recebimento cadastrado ou localizado com os filtros ativos.
                </td>
              </tr>
            ) : (
              recebimentosFiltrados.map((item) => {
                // Formatar data de vencimento
                const dataFormatada = item.data_vencimento
                  ? new Date(item.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Sem data";

                // Badges de Status
                let statusBadgeClass = "";
                let statusDotColor = "";
                let statusLabel = "";

                if (item.status === "pago") {
                  statusBadgeClass = "bg-secondary/10 text-secondary border-secondary/25";
                  statusDotColor = "bg-secondary";
                  statusLabel = "Liquidado";
                } else if (item.status === "atrasado") {
                  statusBadgeClass = "bg-error-container/20 text-error border-error-container/35";
                  statusDotColor = "bg-error";
                  statusLabel = "Atrasado";
                } else {
                  statusBadgeClass = "bg-surface-variant text-on-surface-variant border-outline-variant/55";
                  statusDotColor = "bg-outline";
                  statusLabel = "Pendente";
                }

                const isPaying = loadingId === item.id;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-surface-container-low/30 transition-colors group"
                  >
                    {/* Paciente */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-on-surface hover:text-primary transition-colors cursor-pointer">
                        {item.paciente_nome}
                      </div>
                      <div className="text-on-surface-variant text-xs mt-0.5">
                        {getFrequenciaLabel(item.paciente_frequencia)}
                      </div>
                    </td>

                    {/* Data */}
                    <td className="px-6 py-4 text-on-surface-variant">
                      {dataFormatada} {item.data_consulta ? `, ${item.data_consulta.split(" ")[1]}` : ""}
                    </td>

                    {/* Valor */}
                    <td className="px-6 py-4 font-mono-sm text-mono-sm text-on-surface">
                      R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Tipo de Conta (Destino do Pix/Dinheiro) */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md font-label-sm text-label-sm font-semibold border ${
                          item.tipo_conta === "PJ"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-secondary/10 text-secondary border-secondary/20"
                        }`}
                      >
                        {item.tipo_conta === "PJ" ? "PJ - Business" : "PF - Personal"}
                      </span>
                    </td>

                    {/* Status do Recebimento */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border font-label-sm text-label-sm ${statusBadgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor} mr-1.5`}></span>
                        {statusLabel}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      {item.status === "pago" ? (
                        <span
                          className="material-symbols-outlined text-secondary/50 text-[20px] select-none"
                          title={`Pago via ${item.forma_pagamento || "Pix"}`}
                        >
                          done_all
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePagar(item.id)}
                          disabled={isPaying}
                          className="text-on-surface-variant hover:text-secondary bg-surface hover:bg-secondary/10 border border-transparent hover:border-secondary/25 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer disabled:opacity-50"
                          title="Marcar como Pago"
                        >
                          <span className="material-symbols-outlined text-[20px] leading-none">
                            {isPaying ? "sync" : "check_circle"}
                          </span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between">
        <span className="font-body-md text-body-md text-on-surface-variant">
          Mostrando {recebimentos.length} lançamentos
        </span>
        <div className="flex items-center gap-2">
          <button className="p-1 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 cursor-pointer" disabled>
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button className="p-1 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low cursor-pointer" disabled>
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
