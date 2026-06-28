"use client";

import { useEffect, useState } from "react";
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
            // Inicializar com o primeiro paciente
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

  // Função utilitária para calcular a próxima data correspondente ao dia da semana do paciente
  const preencherProximaData = (diaSemanaDesejado: number) => {
    const hoje = new Date();
    const diaAtual = hoje.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
    let diff = diaSemanaDesejado - diaAtual;
    
    // Se for o mesmo dia mas o horário já passou, ou se for anterior, move para a próxima semana
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
      // Combinar data e hora para salvar no formato "YYYY-MM-DD HH:MM"
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
        className="w-full flex items-center justify-center gap-sm bg-primary text-on-primary px-md py-sm rounded-lg font-label-md hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Novo Agendamento
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={handleClose} className="absolute inset-0 bg-black/45 backdrop-blur-sm"></div>

          <div className="absolute w-full max-w-[500px] bg-surface-bright border border-outline-variant rounded-xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10">
            {/* Cabeçalho */}
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-outline-variant">
              <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Novo Agendamento
              </h3>
              <button onClick={handleClose} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 bg-error-container/20 border border-error-container text-error rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
              {/* Seleção do Paciente */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Paciente
                </label>
                {pacientes.length === 0 ? (
                  <div className="text-xs text-on-surface-variant py-2">
                    Nenhum paciente cadastrado ativo encontrado. Crie um paciente primeiro.
                  </div>
                ) : (
                  <select
                    value={pacienteId}
                    onChange={(e) => handlePacienteChange(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                    Data da Consulta
                  </label>
                  <input
                    type="date"
                    value={dataGasto}
                    onChange={(e) => setDataGasto(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                    Horário da Consulta
                  </label>
                  <input
                    type="time"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                  />
                </div>
              </div>

              {/* Valor da Consulta */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Valor cobrado (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono-sm text-xs">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-9 pr-4 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs font-mono-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                </div>
              </div>

              {/* Consulta é Exceção? */}
              <div className="flex items-center gap-2 pt-2">
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
              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-1.5 text-xs text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || pacientes.length === 0}
                  className="bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs px-5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  Agendar Sessão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
