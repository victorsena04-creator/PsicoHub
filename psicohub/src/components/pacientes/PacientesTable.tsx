"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Dicionário para traduzir o dia da semana número em texto curto
const diasSemanaMap: { [key: number]: string } = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

interface Paciente {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  valor_consulta: number;
  frequencia: "semanal" | "quinzenal" | "mensal" | "avulso";
  dia_semana: number;
  horario: string;
  ativo: number;
  sessoes_periodo?: number;
}

interface PacientesTableProps {
  pacientes: Paciente[];
}

export function PacientesTable({ pacientes }: PacientesTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Estados para filtros de coluna (Excel Style)
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroContato, setFiltroContato] = useState("");
  const [filtroEmail, setFiltroEmail] = useState("");
  const [filtroFrequencia, setFiltroFrequencia] = useState("");

  // Estado para controlar qual menu de ações está aberto
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Estados para edição do paciente
  const [pacienteEditando, setPacienteEditando] = useState<Paciente | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editFrequencia, setEditFrequencia] = useState<"semanal" | "quinzenal" | "mensal" | "avulso">("semanal");
  const [editDiaSemana, setEditDiaSemana] = useState(1);
  const [editHorario, setEditHorario] = useState("14:00");

  // Preencher os estados do formulário de edição quando um paciente for selecionado
  useEffect(() => {
    if (pacienteEditando) {
      setEditNome(pacienteEditando.nome);
      setEditWhatsapp(pacienteEditando.whatsapp || "");
      setEditEmail(pacienteEditando.email || "");
      setEditValor(String(pacienteEditando.valor_consulta));
      setEditFrequencia(pacienteEditando.frequencia);
      setEditDiaSemana(pacienteEditando.dia_semana);
      setEditHorario(pacienteEditando.horario);
    }
  }, [pacienteEditando]);

  // Função simples para extrair as duas primeiras letras das iniciais do nome
  const getIniciais = (nome: string) => {
    const partes = nome.split(" ");
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nome.slice(0, 2).toUpperCase();
  };

  // Filtrar os pacientes com base nos estados de filtro
  const pacientesFiltrados = pacientes.filter((p) => {
    const matchNome = p.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const matchContato = (p.whatsapp || "").toLowerCase().includes(filtroContato.toLowerCase());
    const matchEmail = (p.email || "").toLowerCase().includes(filtroEmail.toLowerCase());
    const matchFreq = filtroFrequencia ? p.frequencia === filtroFrequencia : true;
    return matchNome && matchContato && matchEmail && matchFreq;
  });

  // Função para salvar as alterações do paciente
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteEditando) return;
    setLoading(true);

    try {
      const response = await fetch("/api/pacientes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: pacienteEditando.id,
          nome: editNome,
          whatsapp: editWhatsapp,
          email: editEmail,
          valor_consulta: parseFloat(editValor || "0"),
          frequencia: editFrequencia,
          dia_semana: editDiaSemana,
          horario: editHorario,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar alterações.");
      }

      setPacienteEditando(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar edição.");
    } finally {
      setLoading(false);
    }
  };

  // Função para inativar (excluir) o paciente
  const handleInativar = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente inativar o cadastro do paciente "${nome}"? Ele sairá da lista ativa mas o histórico clínico dele será mantido.`)) {
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`/api/pacientes?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao inativar paciente.");
      }

      setActiveMenuId(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Erro ao inativar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[280px]">
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Linha 1: Títulos das Colunas */}
              <tr className="border-b border-outline-variant bg-surface-container-low/50 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">Nome</th>
                <th className="py-4 px-6 font-medium">Contato</th>
                <th className="py-4 px-6 font-medium">E-mail</th>
                <th className="py-4 px-6 font-medium">Valor/Consulta</th>
                <th className="py-4 px-6 font-medium">Frequência</th>
                <th className="py-4 px-6 font-medium">Sessões no Período</th>
                <th className="py-4 px-6 font-medium">Agenda Fixa</th>
                <th className="py-4 px-6 font-medium text-right">Ações</th>
              </tr>

              {/* Linha 2: Inputs de Filtros Reativos por Coluna (Estilo Excel) */}
              <tr className="border-b border-outline-variant/60 bg-surface-container-low/20">
                {/* Nome */}
                <td className="py-2 px-6">
                  <input
                    type="text"
                    value={filtroNome}
                    onChange={(e) => setFiltroNome(e.target.value)}
                    placeholder="Filtrar nome..."
                    className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold"
                  />
                </td>
                {/* Contato */}
                <td className="py-2 px-6">
                  <input
                    type="text"
                    value={filtroContato}
                    onChange={(e) => setFiltroContato(e.target.value)}
                    placeholder="Filtrar contato..."
                    className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold"
                  />
                </td>
                {/* Email */}
                <td className="py-2 px-6">
                  <input
                    type="text"
                    value={filtroEmail}
                    onChange={(e) => setFiltroEmail(e.target.value)}
                    placeholder="Filtrar e-mail..."
                    className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold"
                  />
                </td>
                {/* Valor / Consulta */}
                <td className="py-2 px-6"></td>
                {/* Frequência */}
                <td className="py-2 px-6">
                  <select
                    value={filtroFrequencia}
                    onChange={(e) => setFiltroFrequencia(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold cursor-pointer"
                  >
                    <option value="">Todas</option>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="avulso">Avulsa</option>
                  </select>
                </td>
                {/* Sessões */}
                <td className="py-2 px-6"></td>
                {/* Agenda Fixa */}
                <td className="py-2 px-6"></td>
                {/* Ações */}
                <td className="py-2 px-6"></td>
              </tr>
            </thead>

            <tbody className="font-body-md text-body-md divide-y divide-outline-variant/50">
              {pacientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-on-surface-variant font-body-md">
                    Nenhum paciente localizado com os filtros ativos.
                  </td>
                </tr>
              ) : (
                pacientesFiltrados.map((paciente) => {
                  const iniciais = getIniciais(paciente.nome);
                  const bgAvatarClass =
                    paciente.valor_consulta > 160
                      ? "bg-tertiary/10 text-tertiary border border-tertiary/20"
                      : "bg-primary/10 text-primary border border-primary/20";

                  return (
                    <tr key={paciente.id} className="hover:bg-surface-container-low/30 transition-colors group">
                      {/* Nome do Paciente */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md font-bold ${bgAvatarClass}`}
                          >
                            {iniciais}
                          </div>
                          <span className="font-medium text-on-surface hover:text-primary transition-colors cursor-pointer">
                            {paciente.nome}
                          </span>
                        </div>
                      </td>

                      {/* Contato (WhatsApp) */}
                      <td className="py-4 px-6 text-on-surface-variant">{paciente.whatsapp || "Não informado"}</td>

                      {/* E-mail */}
                      <td className="py-4 px-6 text-on-surface-variant">{paciente.email || "Não informado"}</td>

                      {/* Valor por Consulta */}
                      <td className="py-4 px-6">
                        <span className="font-mono-sm text-mono-sm text-on-surface">
                          R$ {paciente.valor_consulta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Frequência (Badge colorida) */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                            paciente.frequencia === "semanal"
                              ? "bg-secondary/10 text-secondary"
                              : paciente.frequencia === "quinzenal"
                              ? "bg-primary-container/10 text-primary"
                              : "bg-surface-variant text-on-surface-variant"
                          }`}
                        >
                          {paciente.frequencia.charAt(0).toUpperCase() + paciente.frequencia.slice(1)}
                        </span>
                      </td>

                      {/* Contagem de Sessões no Período Selecionado */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-surface-container border border-outline-variant/60 rounded-md text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px]">done</span>
                          {paciente.sessoes_periodo || 0} sessões
                        </span>
                      </td>

                      {/* Próxima Sessão Base */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          <span>
                            {diasSemanaMap[paciente.dia_semana]}, {paciente.horario}
                          </span>
                        </div>
                      </td>

                      {/* Botão de Ações Dinâmico com Dropdown */}
                      <td className="py-4 px-6 text-right relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === paciente.id ? null : paciente.id)}
                          className="text-outline hover:text-primary transition-colors p-1.5 rounded-md hover:bg-surface-container-high focus:bg-surface-container-high cursor-pointer inline-flex items-center"
                          title="Ações do Paciente"
                        >
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>

                        {/* Menu Dropdown de Ações */}
                        {activeMenuId === paciente.id && (
                          <>
                            {/* Backdrop invisível para fechar ao clicar fora */}
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                            <div className="absolute right-6 top-12 z-20 w-44 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-1.5 text-left font-label-md text-label-md text-on-surface">
                              {/* Ação: Editar */}
                              <button
                                onClick={() => {
                                  setPacienteEditando(paciente);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer text-left font-medium"
                              >
                                <span className="material-symbols-outlined text-[18px] text-primary">edit</span>
                                Editar Cadastro
                              </button>
                              {/* Divisor */}
                              <span className="block h-px w-full bg-outline-variant/60 my-1"></span>
                              {/* Ação: Inativar */}
                              <button
                                onClick={() => handleInativar(paciente.id, paciente.nome)}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-error/10 text-error hover:text-error transition-colors cursor-pointer text-left font-medium"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                Inativar Paciente
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Paginação */}
        <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <span className="text-label-sm font-label-sm text-on-surface-variant">
            Mostrando {pacientesFiltrados.length} de {pacientes.length} pacientes
          </span>
          <div className="flex items-center gap-2">
            <button
              className="p-1 text-outline hover:text-on-surface disabled:opacity-50 transition-colors cursor-pointer"
              disabled
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              className="p-1 text-outline hover:text-on-surface disabled:opacity-50 transition-colors cursor-pointer"
              disabled
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- MODAL DE EDIÇÃO DE PACIENTE (OVERLAY) --- */}
      {pacienteEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-2xl max-w-md w-full mx-4 relative">
            <button
              onClick={() => setPacienteEditando(null)}
              className="absolute right-4 top-4 p-1 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors cursor-pointer"
              title="Fechar"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1 flex items-center gap-2 font-bold pb-2 border-b border-outline-variant/60">
              <span className="material-symbols-outlined text-primary">edit</span>
              Editar Paciente
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Altere as informações cadastrais e as preferências de sessão do paciente.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  placeholder="Nome do paciente"
                />
              </div>

              {/* Whatsapp e E-mail */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary text-on-surface"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary text-on-surface"
                    placeholder="exemplo@email.com"
                  />
                </div>
              </div>

              {/* Valor Consulta e Frequência */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Valor/Consulta (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editValor}
                    onChange={(e) => setEditValor(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary text-on-surface font-semibold text-secondary"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Frequência
                  </label>
                  <select
                    value={editFrequencia}
                    onChange={(e) => setEditFrequencia(e.target.value as any)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary text-on-surface cursor-pointer"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="avulso">Avulso</option>
                  </select>
                </div>
              </div>

              {/* Dia da Semana e Horário de Preferência */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Dia de Agenda
                  </label>
                  <select
                    value={editDiaSemana}
                    onChange={(e) => setEditDiaSemana(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary text-on-surface cursor-pointer"
                  >
                    <option value={1}>Segunda-feira</option>
                    <option value={2}>Terça-feira</option>
                    <option value={3}>Quarta-feira</option>
                    <option value={4}>Quinta-feira</option>
                    <option value={5}>Sexta-feira</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Horário Fixo
                  </label>
                  <input
                    type="time"
                    required
                    value={editHorario}
                    onChange={(e) => setEditHorario(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary text-on-surface cursor-pointer"
                  />
                </div>
              </div>

              {/* Ações do Formulário */}
              <div className="pt-4 border-t border-outline-variant/60 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPacienteEditando(null)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-label-md text-label-md transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/95 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
