"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Lancamento {
  direcao: "entrada" | "saida";
  id: string;
  data: string;
  descricao: string;
  categoria: string;
  tipo_conta: "PF" | "PJ";
  valor: number;
}

interface LancamentosTableProps {
  lancamentos: Lancamento[];
}

export function LancamentosTable({ lancamentos }: LancamentosTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Estados para alteração em lote de despesas
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [pendingBatchUpdate, setPendingBatchUpdate] = useState<{
    despesaId: string;
    campo: "categoria" | "tipo_conta";
    valor: string;
    descricao: string;
    count: number;
  } | null>(null);

  // Estado para múltiplos lançamentos selecionados (edição rápida em massa)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Estados de filtro por coluna (Excel Style)
  const [filtroData, setFiltroData] = useState("");
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState("");
  const [filtroDirecao, setFiltroDirecao] = useState("");

  // Filtrar os lançamentos reativamente no client-side
  const lancamentosFiltrados = lancamentos.filter((l) => {
    const formattedDate = new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const matchData = formattedDate.toLowerCase().includes(filtroData.toLowerCase());
    const matchDesc = l.descricao.toLowerCase().includes(filtroDescricao.toLowerCase());
    
    // Simplificar termos para comparação de categorias
    const matchCat = filtroCategoria ? l.categoria === filtroCategoria : true;
    const matchOrigem = filtroOrigem ? l.tipo_conta === filtroOrigem : true;
    const matchDirecao = filtroDirecao ? l.direcao === filtroDirecao : true;
    return matchData && matchDesc && matchCat && matchOrigem && matchDirecao;
  });

  // Mapeamento de categorias de despesas (saídas)
  const categoriasDespesasMap: { [key: string]: string } = {
    aluguel: "Aluguel / Sala",
    internet: "Internet / Telefone",
    marketing: "Marketing / Ads",
    impostos: "Impostos / DAS",
    ferramentas: "Ferramentas / Apps",
    alimentacao: "Alimentação",
    outros: "Outros Gastos",
  };

  // Mapeamento de categorias de receitas (entradas)
  const categoriasReceitaMap: { [key: string]: string } = {
    atendimento: "Atendimento Clínico",
    supervisao: "Supervisão",
    palestra: "Palestras / Cursos",
    outros: "Outros Recebimentos",
  };

  // Executa o update de despesas (individual ou lote)
  const executeDespesaUpdate = async (despesaId: string, campo: "categoria" | "tipo_conta", valor: string, emLote: boolean) => {
    setLoading(true);
    try {
      const response = await fetch("/api/despesas", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          despesaId,
          campo,
          valor,
          atualizarTodasPorNome: emLote,
        }),
      });

      const dataRes = await response.json();
      if (!response.ok || !dataRes.success) {
        throw new Error(dataRes.error || "Erro ao atualizar despesa.");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar despesa.");
    } finally {
      setLoading(false);
      setShowBatchModal(false);
      setPendingBatchUpdate(null);
    }
  };

  // Atualiza despesa e checa se há duplicatas
  const handleUpdateDespesa = async (despesaId: string, campo: "categoria" | "tipo_conta", valor: string) => {
    const itemAtual = lancamentos.find((l) => l.id === despesaId && l.direcao === "saida");
    if (!itemAtual) return;

    // Buscar despesas com o mesmo nome/descrição na tabela
    const despesasMesmoNome = lancamentos.filter((l) => l.direcao === "saida" && l.descricao === itemAtual.descricao);

    if (despesasMesmoNome.length > 1) {
      setPendingBatchUpdate({
        despesaId,
        campo,
        valor,
        descricao: itemAtual.descricao,
        count: despesasMesmoNome.length,
      });
      setShowBatchModal(true);
    } else {
      await executeDespesaUpdate(despesaId, campo, valor, false);
    }
  };

  // Atualiza receitas (recebimentos) inline
  const handleUpdateRecebimento = async (recebimentoId: string, campo: "categoria" | "tipo_conta", valor: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/recebimentos", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recebimentoId,
          campo,
          valor,
        }),
      });

      const dataRes = await response.json();
      if (!response.ok || !dataRes.success) {
        throw new Error(dataRes.error || "Erro ao atualizar recebimento.");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar recebimento.");
    } finally {
      setLoading(false);
    }
  };

  // Função para aplicar alterações em massa nos itens marcados
  const handleApplyBatchUpdate = async (campo: "categoria" | "tipo_conta", valor: string) => {
    setLoading(true);
    try {
      const despesasParaAtualizar = lancamentos.filter((l) => selectedIds.includes(l.id) && l.direcao === "saida");
      const recebimentosParaAtualizar = lancamentos.filter((l) => selectedIds.includes(l.id) && l.direcao === "entrada");

      const promises = [];

      if (campo === "tipo_conta") {
        for (const d of despesasParaAtualizar) {
          promises.push(
            fetch("/api/despesas", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ despesaId: d.id, campo: "tipo_conta", valor, atualizarTodasPorNome: false })
            })
          );
        }
        for (const r of recebimentosParaAtualizar) {
          promises.push(
            fetch("/api/recebimentos", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recebimentoId: r.id, campo: "tipo_conta", valor })
            })
          );
        }
      } else if (campo === "categoria") {
        const categoriasDespesa = ['aluguel', 'internet', 'marketing', 'impostos', 'ferramentas', 'alimentacao', 'outros'];
        const categoriasReceita = ['atendimento', 'supervisao', 'palestra', 'outros'];

        if (categoriasDespesa.includes(valor)) {
          for (const d of despesasParaAtualizar) {
            promises.push(
              fetch("/api/despesas", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ despesaId: d.id, campo: "categoria", valor, atualizarTodasPorNome: false })
              })
            );
          }
        }
        
        if (categoriasReceita.includes(valor)) {
          for (const r of recebimentosParaAtualizar) {
            promises.push(
              fetch("/api/recebimentos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recebimentoId: r.id, campo: "categoria", valor })
              })
            );
          }
        }
      }

      await Promise.all(promises);
      setSelectedIds([]);
      router.refresh();
    } catch (e) {
      console.error("Erro ao aplicar alterações em lote:", e);
      alert("Erro ao aplicar alterações em lote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      {/* Cabeçalho da Listagem (Grid Desktop) */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-outline-variant bg-surface-container-low/50 font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider items-center">
        <div className="col-span-1 flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedIds.length === lancamentosFiltrados.length && lancamentosFiltrados.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds(lancamentosFiltrados.map((l) => l.id));
              } else {
                setSelectedIds([]);
              }
            }}
            className="w-4 h-4 accent-primary rounded cursor-pointer"
          />
        </div>
        <div className="col-span-2">Data</div>
        <div className="col-span-3">Descrição</div>
        <div className="col-span-2">Categoria</div>
        <div className="col-span-2 text-center">Origem Caixa</div>
        <div className="col-span-2 text-right">Valor</div>
      </div>

      {/* Linha secundária de Filtros por Coluna (Estilo Excel) */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 border-b border-outline-variant bg-surface-container-low/20 items-center">
        <div className="col-span-1"></div>
        {/* Data */}
        <div className="col-span-2">
          <input
            type="text"
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            placeholder="Filtrar data..."
            className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold"
          />
        </div>
        {/* Descrição */}
        <div className="col-span-3">
          <input
            type="text"
            value={filtroDescricao}
            onChange={(e) => setFiltroDescricao(e.target.value)}
            placeholder="Filtrar descrição..."
            className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold"
          />
        </div>
        {/* Categoria */}
        <div className="col-span-2">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold cursor-pointer"
          >
            <option value="">Todas</option>
            <option value="atendimento">Atendimento Clínico</option>
            <option value="supervisao">Supervisão</option>
            <option value="palestra">Palestras / Cursos</option>
            <option value="aluguel">Aluguel / Sala</option>
            <option value="internet">Internet / Telefone</option>
            <option value="marketing">Marketing / Ads</option>
            <option value="impostos">Impostos / DAS</option>
            <option value="ferramentas">Ferramentas / Apps</option>
            <option value="alimentacao">Alimentação</option>
            <option value="outros">Outros</option>
          </select>
        </div>
        {/* Origem Caixa */}
        <div className="col-span-2">
          <select
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="PF">PF (Pessoal)</option>
            <option value="PJ">PJ (Consultório)</option>
          </select>
        </div>
        {/* Filtro de Tipo/Direção no lugar do valor */}
        <div className="col-span-2">
          <select
            value={filtroDirecao}
            onChange={(e) => setFiltroDirecao(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="entrada">Entradas (+)</option>
            <option value="saida">Saídas (-)</option>
          </select>
        </div>
      </div>

      {/* Lançamentos */}
      <div className="divide-y divide-outline-variant">
        {lancamentosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant font-body-md">
            Nenhum lançamento financeiro encontrado para os filtros selecionados.
          </div>
        ) : (
          lancamentosFiltrados.map((item) => {
            const formattedDate = new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            const isEntrada = item.direcao === "entrada";
            const iconName = isEntrada ? "account_balance_wallet" : "receipt_long";
            const bgIconClass = isEntrada ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error";
            const valueSign = isEntrada ? "+" : "-";
            const valueClass = isEntrada
              ? "text-secondary font-semibold"
              : "text-error font-semibold";

            // Determinar o mapa de categorias correspondente
            const currentCatMap = isEntrada ? categoriasReceitaMap : categoriasDespesasMap;
            
            // Valor atual seguro de categoria para o select
            const valCat = isEntrada 
              ? (categoriasReceitaMap[item.categoria] ? item.categoria : "atendimento")
              : (categoriasDespesasMap[item.categoria] ? item.categoria : "outros");

            return (
              <div
                key={item.id}
                className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 items-center hover:bg-surface-container-low/30 transition-colors group ${
                  selectedIds.includes(item.id) ? "bg-primary/5" : ""
                }`}
              >
                {/* Checkbox de Seleção */}
                <div className="col-span-12 md:col-span-1 flex items-center justify-start md:justify-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((prev) => [...prev, item.id]);
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                      }
                    }}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>

                {/* Data */}
                <div className="col-span-12 md:col-span-2 font-mono-sm text-mono-sm text-on-surface-variant">
                  {formattedDate}
                </div>

                {/* Descrição e Ícone */}
                <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bgIconClass}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      {iconName}
                    </span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors">
                      {item.descricao}
                    </p>
                  </div>
                </div>

                {/* Categoria Interativa */}
                <div className="col-span-12 md:col-span-2">
                  <select
                    value={valCat}
                    onChange={(e) => {
                      if (isEntrada) {
                        handleUpdateRecebimento(item.id, "categoria", e.target.value);
                      } else {
                        handleUpdateDespesa(item.id, "categoria", e.target.value);
                      }
                    }}
                    disabled={loading}
                    className="bg-surface-container-low border border-outline-variant/60 rounded px-2 py-1 text-xs text-on-surface focus:bg-surface-container-lowest cursor-pointer font-medium outline-none"
                  >
                    {Object.entries(currentCatMap).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Origem Caixa (PF / PJ Interativo) */}
                <div className="col-span-12 md:col-span-2 flex md:justify-center">
                  <select
                    value={item.tipo_conta}
                    onChange={(e) => {
                      if (isEntrada) {
                        handleUpdateRecebimento(item.id, "tipo_conta", e.target.value as "PF" | "PJ");
                      } else {
                        handleUpdateDespesa(item.id, "tipo_conta", e.target.value as "PF" | "PJ");
                      }
                    }}
                    disabled={loading}
                    className={`bg-surface-container-low border border-outline-variant/60 rounded px-2 py-1 text-xs font-semibold cursor-pointer outline-none ${
                      item.tipo_conta === "PJ"
                        ? "text-primary focus:bg-surface-container-lowest"
                        : "text-secondary focus:bg-surface-container-lowest"
                    }`}
                  >
                    <option value="PJ" className="text-primary font-semibold">PJ</option>
                    <option value="PF" className="text-secondary font-semibold">PF</option>
                  </select>
                </div>

                {/* Valor Monetário */}
                <div className={`col-span-12 md:col-span-2 font-mono-sm text-mono-sm text-right ${valueClass}`}>
                  {valueSign} R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé de Paginação */}
      <div className="px-6 py-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-low/30">
        <span className="font-body-md text-body-md text-on-surface-variant">
          Mostrando {lancamentos.length} lançamentos
        </span>
        <div className="flex gap-1">
          <button className="w-8 h-8 rounded flex items-center justify-center border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 cursor-pointer" disabled>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              chevron_left
            </span>
          </button>
          <button className="w-8 h-8 rounded flex items-center justify-center border border-outline-variant text-on-surface-variant hover:bg-surface-container-high cursor-pointer" disabled>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* Modal de Confirmação de Alteração em Lote */}
      {showBatchModal && pendingBatchUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h4 className="font-headline-sm text-headline-sm text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary font-bold">warning</span>
              Alterar em Lote?
            </h4>
            <p className="text-body-md text-on-surface-variant mb-6 leading-relaxed">
              Encontramos <strong>{pendingBatchUpdate.count} despesas</strong> com a mesma descrição "<strong>{pendingBatchUpdate.descricao}</strong>".
              Deseja atualizar a categoria de todas elas para "<strong>{categoriasDespesasMap[pendingBatchUpdate.valor] || pendingBatchUpdate.valor}</strong>" ou alterar apenas esta?
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowBatchModal(false);
                  setPendingBatchUpdate(null);
                  router.refresh();
                }}
                className="px-4 py-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-md text-label-md cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeDespesaUpdate(pendingBatchUpdate.despesaId, pendingBatchUpdate.campo, pendingBatchUpdate.valor, false)}
                className="px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md cursor-pointer"
              >
                Apenas Esta
              </button>
              <button
                type="button"
                onClick={() => executeDespesaUpdate(pendingBatchUpdate.despesaId, pendingBatchUpdate.campo, pendingBatchUpdate.valor, true)}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors font-label-md text-label-md cursor-pointer shadow-sm"
              >
                Todas ({pendingBatchUpdate.count})
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Painel Flutuante de Ações em Massa (Premium Glassmorphism) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-container-lowest/90 border border-outline-variant rounded-2xl py-3 px-6 shadow-2xl flex flex-wrap items-center justify-between gap-4 z-50 backdrop-blur-md max-w-3xl w-[90%] border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
            <span className="font-semibold text-label-md text-on-surface">
              {selectedIds.length} item(ns) selecionado(s)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Categorias Despesas */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-on-surface-variant font-medium">Cat. Despesa:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleApplyBatchUpdate("categoria", e.target.value);
                }}
                disabled={loading}
                defaultValue=""
                className="bg-surface-container-low border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface cursor-pointer font-medium outline-none h-8"
              >
                <option value="" disabled>Selecionar...</option>
                {Object.entries(categoriasDespesasMap).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>

            {/* Categorias Receitas */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-on-surface-variant font-medium">Cat. Receita:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleApplyBatchUpdate("categoria", e.target.value);
                }}
                disabled={loading}
                defaultValue=""
                className="bg-surface-container-low border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface cursor-pointer font-medium outline-none h-8"
              >
                <option value="" disabled>Selecionar...</option>
                {Object.entries(categoriasReceitaMap).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>

            {/* Seletor Caixa */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-on-surface-variant font-medium">Caixa:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleApplyBatchUpdate("tipo_conta", e.target.value);
                }}
                disabled={loading}
                defaultValue=""
                className="bg-surface-container-low border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface cursor-pointer font-medium outline-none h-8"
              >
                <option value="" disabled>Selecionar...</option>
                <option value="PJ">PJ Business</option>
                <option value="PF">PF Personal</option>
              </select>
            </div>

            {/* Desmarcar Todos */}
            <button
              onClick={() => setSelectedIds([])}
              disabled={loading}
              className="ml-2 p-1.5 text-on-surface-variant hover:text-primary rounded-lg transition-colors cursor-pointer flex items-center justify-center bg-transparent border-none"
              title="Desmarcar todos"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
