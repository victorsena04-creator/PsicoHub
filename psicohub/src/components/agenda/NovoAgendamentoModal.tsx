"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface Paciente {
  id: string;
  nome: string;
  valor_consulta: number;
  dia_semana: number;
  horario: string;
}

export function NovoAgendamentoModal() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [error, setError] = useState("");

  // Estados do formulário
  const [pacienteId, setPacienteId] = useState("");
  const [dataGasto, setDataGasto] = useState(new Date().toISOString().split("T")[0]);
  const [horario, setHorario] = useState("14:00");
  const [valor, setValor] = useState("");
  const [eExcecao, setEExcecao] = useState(false);

  // Garante a montagem no lado do cliente para permitir o React Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Carregar os pacientes ativos ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;

    const fetchPacientes = async () => {
      try {
        const response = await fetch("/api/pacientes");
        const resJson = await response.json();
        if (response.ok && resJson.success) {
          setPacientes(resJson.data);
          if (resJson.data.length > 0) {
            const firstPac = resJson.data[0];
            setPacienteId(firstPac.id);
            setValor(firstPac.valor_consulta.toString());
            setHorario(firstPac.horario || "14:00");
            preencherProximaData(firstPac.dia_semana);
          }
        }
      } catch (err) {
        console.error("Erro ao obter pacientes para agendamento:", err);
      }
    };

    fetchPacientes();
  }, [isOpen]);

  const preencherProximaData = (diaSemanaDesejado: number) => {
    const hoje = new Date();
    const diaAtual = hoje.getDay();
    let diff = diaSemanaDesejado - diaAtual;
    
    if (diff <= 0) {
      diff += 7;
    }

    const proximaData = new Date(hoje);
    proximaData.setDate(hoje.getDate() + diff);
    setDataGasto(proximaData.toISOString().split("T")[0]);
  };

  const handlePacienteChange = (id: string) => {
    setPacienteId(id);
    const pac = pacientes.find((p) => p.id === id);
    if (pac) {
      setValor(pac.valor_consulta.toString());
      setHorario(pac.horario || "14:00");
      preencherProximaData(pac.dia_semana);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setError("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setPacienteId("");
    setValor("");
    setHorario("14:00");
    setEExcecao(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteId || !dataGasto || !horario || !valor) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const dataHoraCompleta = `${dataGasto} ${horario}`;

      const response = await fetch("/api/consultas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paciente_id: pacienteId,
          data_hora: dataHoraCompleta,
          valor: parseFloat(valor),
          e_excecao: eExcecao,
        }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || "Erro ao salvar agendamento.");
      }

      handleClose();
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Falha ao registrar novo agendamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-3 py-2 rounded-lg font-label-md hover:bg-on-primary-fixed-variant transition-colors shadow-sm cursor-pointer text-xs font-semibold"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Novo Agendamento
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-x-hidden animate-fadeIn">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col gap-6">
            
            {/* Cabeçalho */}
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                </div>
                <div>
                  <h3 className="font-title-lg text-title-lg font-bold text-on-surface">
                    Novo Agendamento
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Agende uma nova sessão de atendimento clínico.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleClose} 
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                title="Fechar"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-error-container/20 border border-error/30 text-error rounded-xl text-xs font-semibold leading-relaxed">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Seleção do Paciente */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface font-semibold">
                  Paciente
                </label>
                {pacientes.length === 0 ? (
                  <div className="p-3 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface-variant">
                    Nenhum paciente cadastrado ativo encontrado. Crie um paciente primeiro na aba "Pacientes".
                  </div>
                ) : (
                  <select
                    value={pacienteId}
                    onChange={(e) => handlePacienteChange(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs focus:outline-none focus:border-primary text-on-surface cursor-pointer"
                  >
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">
                    Data da Consulta
                  </label>
                  <input
                    type="date"
                    value={dataGasto}
                    onChange={(e) => setDataGasto(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs focus:outline-none focus:border-primary text-on-surface cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">
                    Horário da Consulta
                  </label>
                  <input
                    type="time"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs focus:outline-none focus:border-primary text-on-surface cursor-pointer"
                  />
                </div>
              </div>

              {/* Valor da Consulta */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface font-semibold">
                  Valor cobrado (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono text-xs">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-10 pl-9 pr-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs font-mono focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>
              </div>

              {/* Consulta é Exceção? */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="eExcecao"
                  checked={eExcecao}
                  onChange={(e) => setEExcecao(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant cursor-pointer"
                />
                <label htmlFor="eExcecao" className="text-xs text-on-surface-variant cursor-pointer select-none">
                  Sessão Avulsa fora da Agenda Recorrente (Exceção)
                </label>
              </div>

              {/* Botões */}
              <div className="pt-4 border-t border-outline-variant/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="h-10 px-4 text-xs text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || pacientes.length === 0}
                  className="h-10 bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-bold text-xs px-5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Agendando..." : "Agendar Sessão"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
