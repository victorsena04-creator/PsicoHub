"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddPatientModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [valorConsulta, setValorConsulta] = useState("");
  const [frequencia, setFrequencia] = useState("semanal");
  const [diaSemana, setDiaSemana] = useState("1"); // Padrão Segunda-feira
  const [horario, setHorario] = useState("14:00");

  const handleOpen = () => {
    setIsOpen(true);
    setError("");
  };

  const handleClose = () => {
    setIsOpen(false);
    // Limpar formulário
    setNome("");
    setWhatsapp("");
    setEmail("");
    setValorConsulta("");
    setFrequencia("semanal");
    setDiaSemana("1");
    setHorario("14:00");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/pacientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          whatsapp,
          email,
          valor_consulta: parseFloat(valorConsulta) || 0,
          frequencia,
          dia_semana: parseInt(diaSemana),
          horario,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar paciente.");
      }

      handleClose();
      // Atualizar a página para exibir o novo paciente na listagem do servidor
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão para abrir o modal */}
      <button
        onClick={handleOpen}
        className="bg-primary hover:bg-primary-container/90 text-on-primary font-label-md text-label-md py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all shadow-sm cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">person_add</span>
        Adicionar Paciente
      </button>

      {/* Estrutura do Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop (Fundo escurecido com blur) */}
          <div
            onClick={handleClose}
            className="absolute inset-0 bg-on-background/25 backdrop-blur-sm transition-opacity"
          ></div>

          {/* Conteúdo do Modal */}
          <div className="absolute w-full max-w-[600px] bg-surface-container-lowest rounded-xl shadow-[0_20px_25px_-5px_rgb(0,0,0,0.1)] border border-outline-variant flex flex-col max-h-[90vh] overflow-hidden z-10">
            
            {/* Cabeçalho */}
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Novo Paciente
              </h3>
              <button
                onClick={handleClose}
                className="text-outline hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-container-low cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Corpo do Formulário */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="p-3 bg-error-container/20 border border-error-container text-error rounded-lg font-label-md text-label-md">
                  {error}
                </div>
              )}

              {/* Seção: Informações Pessoais */}
              <div className="space-y-4">
                <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2 font-bold">
                  Informações Pessoais
                </h4>
                
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1.5 font-medium">
                    Nome Completo
                  </label>
                  <input
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-on-surface"
                    placeholder="Ex: João da Silva"
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5 font-medium">
                      WhatsApp
                    </label>
                    <input
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-on-surface"
                      placeholder="(00) 00000-0000"
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5 font-medium">
                      E-mail
                    </label>
                    <input
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-on-surface"
                      placeholder="email@exemplo.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-outline-variant/50 w-full"></div>

              {/* Seção: Configurações Clínicas */}
              <div className="space-y-4">
                <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2 font-bold">
                  Configurações de Sessão
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5 font-medium">
                      Valor por Consulta
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono-sm">
                        R$
                      </span>
                      <input
                        className="w-full bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-body-md font-mono-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-on-surface"
                        placeholder="150,00"
                        type="number"
                        step="0.01"
                        required
                        value={valorConsulta}
                        onChange={(e) => setValorConsulta(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5 font-medium">
                      Frequência
                    </label>
                    <select
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer text-on-surface"
                      value={frequencia}
                      onChange={(e) => setFrequencia(e.target.value)}
                      disabled={loading}
                    >
                      <option value="semanal">Semanal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="mensal">Mensal</option>
                      <option value="avulso">Avulso</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5 font-medium">
                      Dia Preferencial
                    </label>
                    <select
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer text-on-surface"
                      value={diaSemana}
                      onChange={(e) => setDiaSemana(e.target.value)}
                      disabled={loading}
                    >
                      <option value="1">Segunda-feira</option>
                      <option value="2">Terça-feira</option>
                      <option value="3">Quarta-feira</option>
                      <option value="4">Quinta-feira</option>
                      <option value="5">Sexta-feira</option>
                      <option value="6">Sábado</option>
                      <option value="0">Domingo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5 font-medium">
                      Horário Preferencial
                    </label>
                    <input
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer text-on-surface"
                      type="time"
                      value={horario}
                      onChange={(e) => setHorario(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Rodapé (dentro da tag form para o botão submit funcionar) */}
              <div className="pt-4 border-t border-outline-variant bg-surface-container-low/30 flex justify-end gap-3 mt-6">
                <button
                  onClick={handleClose}
                  className="bg-surface hover:bg-surface-container-high border border-outline-variant text-on-surface font-label-md text-label-md py-2 px-4 rounded-lg transition-colors cursor-pointer"
                  type="button"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  className="bg-primary hover:bg-primary-container/90 text-on-primary font-label-md text-label-md py-2 px-5 rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-70"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Salvando..." : "Salvar Paciente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
