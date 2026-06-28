"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Consulta {
  id: string;
  paciente_id: string;
  paciente_nome: string;
  valor_consulta: number;
  data_hora: string;
  status: "agendada" | "realizada" | "cancelada" | "falta";
  e_excecao: number;
}

interface DiaSemana {
  nome: string;
  dataISO: string;
  diaMes: string;
  consultas: Consulta[];
}

interface KanbanBoardProps {
  diasSemana: DiaSemana[];
}

export function KanbanBoard({ diasSemana }: KanbanBoardProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Lista de horários fixos exibidos como "régua Excel" na esquerda (de 30 em 30 minutos)
  const horarios = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00", "21:30"
  ];

  const handleUpdateStatus = async (consultaId: string, status: string) => {
    setLoadingId(consultaId);
    try {
      const response = await fetch("/api/consultas/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultaId,
          status,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao atualizar status da consulta.");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Erro ao alterar o status do agendamento.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleMoveConsulta = async (consultaId: string, novaDataISO: string, novoHorario: string) => {
    setLoadingId(consultaId);
    try {
      // Formato esperado pelo SQLite: "YYYY-MM-DD HH:MM"
      const novaDataHora = `${novaDataISO} ${novoHorario}`;

      const response = await fetch("/api/consultas", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultaId,
          novaDataHora,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao reagendar a consulta.");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Erro ao remarcar a consulta.");
    } finally {
      setLoadingId(null);
    }
  };

  // Determinar em qual slot de linha (horário) a consulta deve cair
  const getSlotHora = (dataHoraStr: string): string => {
    const horaMin = dataHoraStr.split(" ")[1]; // Extrai "HH:MM"
    const [horaStr, minStr] = horaMin.split(":");
    const hora = parseInt(horaStr, 10);
    const min = parseInt(minStr, 10);

    // Limite inferior (antes das 08:00 cai no slot das 08:00)
    if (hora < 8) {
      return "08:00";
    }

    // Limite superior (depois das 21:30 cai no slot das 21:30)
    if (hora > 21 || (hora === 21 && min >= 30)) {
      return "21:30";
    }

    // Agrupar em blocos de 30 minutos
    if (min >= 30) {
      return `${String(hora).padStart(2, "0")}:30`;
    } else {
      return `${String(hora).padStart(2, "0")}:00`;
    }
  };

  // Agrupar consultas por Dia e Hora de Slot para renderização O(1) na tabela
  const consultasPorSlot: { [key: string]: Consulta[] } = {};
  
  diasSemana.forEach((dia) => {
    dia.consultas.forEach((c) => {
      const slotHora = getSlotHora(c.data_hora);
      const key = `${dia.dataISO}_${slotHora}`;
      if (!consultasPorSlot[key]) {
        consultasPorSlot[key] = [];
      }
      consultasPorSlot[key].push(c);
    });
  });

  const renderCard = (consulta: Consulta) => {
    const horaMin = consulta.data_hora.split(" ")[1]; // Extrai "HH:MM"
    
    let borderClass = "border-l-primary";
    if (consulta.status === "realizada") {
      borderClass = "border-l-secondary";
    } else if (consulta.status === "cancelada") {
      borderClass = "border-l-amber-500";
    } else if (consulta.status === "falta") {
      borderClass = "border-l-error";
    }

    const isUpdating = loadingId === consulta.id;

    return (
      <div
        key={consulta.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", consulta.id);
        }}
        className={`bg-surface-container-lowest border-l-4 ${borderClass} border border-outline-variant rounded-lg p-2.5 shadow-sm hover:shadow transition-all relative group cursor-grab active:cursor-grabbing flex flex-col justify-between select-none ${
          isUpdating ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        {/* Linha 1: Nome do Paciente e Valor */}
        <div className="flex justify-between items-center gap-1.5">
          <span 
            className="font-label-md text-[12px] text-on-background font-bold hover:text-primary transition-colors truncate flex-1" 
            title={consulta.paciente_nome}
          >
            {consulta.paciente_nome}
          </span>
          <span className="text-[10px] font-mono-sm font-semibold text-on-surface-variant shrink-0">
            R$ {consulta.valor_consulta}
          </span>
        </div>

        {/* Linha 2: Horário, Tags e Dropdown de Status */}
        <div className="flex justify-between items-center mt-2 gap-1.5">
          <div className="flex items-center gap-1 text-on-surface-variant text-[10px] shrink-0">
            <span className="material-symbols-outlined text-[12px] shrink-0">schedule</span>
            <span className="font-mono-sm">{horaMin}</span>
            {consulta.e_excecao === 1 && (
              <span className="px-1 py-0.2 rounded text-[8px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 tracking-wide uppercase shrink-0">
                Exc
              </span>
            )}
          </div>

          {/* Seletor dropdown para status */}
          <select
            value={consulta.status}
            onChange={(e) => handleUpdateStatus(consulta.id, e.target.value)}
            disabled={isUpdating}
            className={`text-[9px] font-bold border rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shrink-0 transition-colors ${
              consulta.status === "realizada"
                ? "bg-secondary-container/20 text-on-secondary-container border-secondary/35"
                : consulta.status === "cancelada"
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : consulta.status === "falta"
                ? "bg-error-container/20 text-error border-error-container/35"
                : "bg-primary-container/10 text-primary border-primary-container/20"
            }`}
          >
            <option value="agendada">Agendada</option>
            <option value="realizada">Realizada</option>
            <option value="falta">Falta</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dataISO: string, slotHora: string) => {
    e.preventDefault();
    const consultaId = e.dataTransfer.getData("text/plain");
    if (!consultaId) return;

    handleMoveConsulta(consultaId, dataISO, slotHora);
  };

  return (
    <div className="h-full w-full p-4 bg-surface-container-low/20 overflow-y-auto">
      <div className="min-w-[800px] border border-outline-variant rounded-xl overflow-hidden bg-surface shadow-sm">
        <table className="w-full text-left border-collapse table-fixed">
          {/* Cabeçalho da Grade */}
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 border-r border-outline-variant w-[90px] text-center bg-surface-container-low">Hora</th>
              {diasSemana.map((dia) => (
                <th key={dia.dataISO} className="py-3 px-4 border-r border-outline-variant text-center last:border-r-0">
                  <div className="font-bold text-[13px] text-on-surface">{dia.nome.split("-")[0]}</div>
                  <div className="text-[10px] text-on-surface-variant/80 font-normal mt-0.5">{dia.diaMes}</div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Linhas de Horário (Grade Excel) */}
          <tbody className="divide-y divide-outline-variant/60">
            {horarios.map((horario) => (
              <tr key={horario} className="group hover:bg-surface-container-low/5 transition-colors min-h-[60px]">
                {/* Coluna da esquerda: Horário */}
                <td className="py-3 px-4 border-r border-outline-variant text-center font-mono-sm text-[11px] text-on-surface-variant/70 font-bold select-none bg-surface-container-low/20">
                  {horario}
                </td>

                {/* Colunas dos Dias da Semana */}
                {diasSemana.map((dia) => {
                  const slotKey = `${dia.dataISO}_${horario}`;
                  const consultas = consultasPorSlot[slotKey] || [];

                  return (
                    <td
                      key={slotKey}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dia.dataISO, horario)}
                      className="py-1.5 px-2 border-r border-outline-variant/60 align-top last:border-r-0 transition-colors bg-surface hover:bg-surface-container-lowest/50"
                    >
                      <div className="flex flex-col gap-1.5 min-h-[45px] w-full justify-center">
                        {consultas.map((consulta) => renderCard(consulta))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
