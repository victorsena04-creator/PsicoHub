"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Cartao {
  id: string;
  nome: string;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
  tipo_conta: "PF" | "PJ";
  valor_fatura?: number;
}

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  origem: string;
  tipo_conta: "PF" | "PJ";
  meio_pagamento: "conta_corrente" | "cartao_credito";
  cartao_id: string | null;
  cartao_nome: string | null;
  fatura_mes: number | null;
  fatura_ano: number | null;
}

interface DespesasDashboardProps {
  despesasIniciais: Despesa[];
  cartoes: Cartao[];
  filtroInicial: string;
  abaInicial?: "despesas" | "cartoes" | "extratos";
}

export function DespesasDashboard({
  despesasIniciais,
  cartoes,
  filtroInicial,
  abaInicial,
}: DespesasDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"despesas" | "cartoes" | "extratos">(
    abaInicial || "despesas"
  );

  useEffect(() => {
    if (abaInicial) {
      setActiveTab(abaInicial);
    }
  }, [abaInicial]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- ESTADOS DO FORMULÁRIO DE DESPESA ---
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [categoria, setCategoria] = useState("outros");
  const [tipoConta, setTipoConta] = useState<"PF" | "PJ">("PJ");
  const [meioPagamento, setMeioPagamento] = useState<"conta_corrente" | "cartao_credito">("conta_corrente");
  const [cartaoId, setCartaoId] = useState("");

  // --- ESTADOS DO FORMULÁRIO DE CARTÃO ---
  const [nomeCartao, setNomeCartao] = useState("");
  const [limiteCartao, setLimiteCartao] = useState("");
  const [diaFechamento, setDiaFechamento] = useState("5");
  const [diaVencimento, setDiaVencimento] = useState("12");
  const [tipoContaCartao, setTipoContaCartao] = useState<"PF" | "PJ">("PF");

  // --- ESTADOS DA IMPORTAÇÃO E CONCILIAÇÃO DE EXTRATOS ---
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState("");
  const [transacoesImportadas, setTransacoesImportadas] = useState<any[]>([]);
  const [showConciliacao, setShowConciliacao] = useState(false);
  const [statusConfrontoGeral, setStatusConfrontoGeral] = useState("");
  const [salvarRegrasFuturas, setSalvarRegrasFuturas] = useState<{ [key: string]: boolean }>({});
  const [selectedImportedIds, setSelectedImportedIds] = useState<string[]>([]);
  const [errosLeitura, setErrosLeitura] = useState<string[]>([]);
  const searchParams = useSearchParams();

  // Estados de filtro por coluna (Excel Style) no histórico de despesas
  const [filtroData, setFiltroData] = useState("");
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroMeio, setFiltroMeio] = useState("");
  const [filtroCaixa, setFiltroCaixa] = useState("");

  // Lógica de filtragem no client-side
  const despesasFiltradas = despesasIniciais.filter((item) => {
    const dataFormatada = new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const matchData = dataFormatada.toLowerCase().includes(filtroData.toLowerCase());
    const matchDesc = item.descricao.toLowerCase().includes(filtroDescricao.toLowerCase());
    const matchCat = filtroCategoria ? item.categoria === filtroCategoria : true;
    const matchCaixa = filtroCaixa ? item.tipo_conta === filtroCaixa : true;
    
    let matchMeio = true;
    if (filtroMeio === "cartao") {
      matchMeio = item.meio_pagamento === "cartao_credito";
    } else if (filtroMeio === "corrente") {
      matchMeio = item.meio_pagamento === "conta_corrente";
    }
    
    return matchData && matchDesc && matchCat && matchCaixa && matchMeio;
  });

  // --- ESTADOS DA ATUALIZAÇÃO EM LOTE ---
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [pendingBatchUpdate, setPendingBatchUpdate] = useState<{
    despesaId: string;
    campo: "categoria" | "tipo_conta";
    valor: string;
    descricao: string;
    count: number;
  } | null>(null);

  // Mapeamento de categorias de despesas em português
  const categoriasMap: { [key: string]: string } = {
    aluguel: "Aluguel / Sala",
    internet: "Internet / Telefone",
    marketing: "Marketing / Ads",
    impostos: "Impostos / DAS",
    ferramentas: "Ferramentas / Apps",
    alimentacao: "Alimentação",
    outros: "Outros Gastos",
  };

  // Mapeamento de categorias de receitas em português
  const categoriasReceitaMap: { [key: string]: string } = {
    atendimento: "Atendimento Clínico",
    supervisao: "Supervisão",
    palestra: "Palestras / Cursos",
    outros: "Outros Recebimentos",
  };

  // Executa a atualização da despesa via API
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

  // Trata a alteração de despesa verificando se há necessidade de atualização em lote
  const handleUpdateDespesaDb = async (despesaId: string, campo: "categoria" | "tipo_conta", valor: string) => {
    const despesaAtual = despesasIniciais.find((d) => d.id === despesaId);
    if (!despesaAtual) return;

    // Contar quantas despesas possuem a mesma descrição exata no histórico atual
    const despesasMesmoNome = despesasIniciais.filter((d) => d.descricao === despesaAtual.descricao);

    if (despesasMesmoNome.length > 1) {
      // Se houver mais de uma, abre o modal de confirmação de lote
      setPendingBatchUpdate({
        despesaId,
        campo,
        valor,
        descricao: despesaAtual.descricao,
        count: despesasMesmoNome.length,
      });
      setShowBatchModal(true);
    } else {
      // Caso contrário, atualiza apenas esta diretamente
      await executeDespesaUpdate(despesaId, campo, valor, false);
    }
  };

  // Enviar nova despesa
  const handleSaveDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/despesas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          descricao,
          valor: parseFloat(valor),
          data,
          categoria,
          tipo_conta: tipoConta,
          meio_pagamento: meioPagamento,
          cartao_id: meioPagamento === "cartao_credito" ? cartaoId : null,
        }),
      });

      const dataRes = await response.json();
      if (!response.ok || !dataRes.success) {
        throw new Error(dataRes.error || "Erro ao salvar despesa.");
      }

      // Limpar formulário
      setDescricao("");
      setValor("");
      setMeioPagamento("conta_corrente");
      setCartaoId("");
      setCategoria("outros");
      
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  // Enviar novo cartão
  const handleSaveCartao = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/cartoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: nomeCartao,
          limite: parseFloat(limiteCartao) || 0,
          dia_fechamento: parseInt(diaFechamento),
          dia_vencimento: parseInt(diaVencimento),
          tipo_conta: tipoContaCartao,
        }),
      });

      const dataRes = await response.json();
      if (!response.ok || !dataRes.success) {
        throw new Error(dataRes.error || "Erro ao salvar cartão.");
      }

      // Limpar formulário de cartão
      setNomeCartao("");
      setLimiteCartao("");
      setDiaFechamento("5");
      setDiaVencimento("12");

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao criar cartão.");
    } finally {
      setLoading(false);
    }
  };

  // Processar importação de extrato PDF real no backend
  const handleImportPDF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;

    setLoading(true);
    setError("");
    setImportStatus("Subindo arquivo de extrato bancário...");

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      setImportStatus("Lendo PDF (Passagem 1: Tabelas estruturadas)...");
      
      // Pequeno feedback visual para as etapas
      const t1 = setTimeout(() => {
        setImportStatus("Lendo PDF (Passagem 2: Varredura por Expressões Regulares)...");
      }, 1000);

      const t2 = setTimeout(() => {
        setImportStatus("Cruzando leituras (Mecanismo de Dupla Validação)...");
      }, 2200);

      const response = await fetch("/api/extratos/importar", {
        method: "POST",
        body: formData,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      const dataRes = await response.json();
      if (!response.ok || !dataRes.success) {
        throw new Error(dataRes.error || "Erro ao processar arquivo de extrato.");
      }

      setImportStatus("✅ Dupla Validação concluída!");
      setTransacoesImportadas(dataRes.transacoes);
      setStatusConfrontoGeral(dataRes.status_geral);
      setErrosLeitura(dataRes.erros || []);
      setShowConciliacao(true);

      // Preencher sugestão de regras futuras para lançamentos novos (não classificados) e que sejam saídas
      const regrasIniciais: { [key: string]: boolean } = {};
      dataRes.transacoes.forEach((t: any) => {
        if (t.categoria === "FALTA IDENTIFICAR" && t.valor < 0) {
          regrasIniciais[t.id] = true;
        }
      });
      setSalvarRegrasFuturas(regrasIniciais);

    } catch (err: any) {
      setError(err.message || "Erro ao importar PDF.");
      setImportStatus("");
    } finally {
      setLoading(false);
    }
  };

  // Atualizar dados de um lançamento na lista de conciliação
  const handleUpdateImportedRow = (id: string, field: string, value: any) => {
    setTransacoesImportadas((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, [field]: value };
        // Limpar cartao_id se meio_pagamento não for cartao_credito
        if (field === "meio_pagamento" && value !== "cartao_credito") {
          updated.cartao_id = null;
        }
        return updated;
      })
    );
  };

  // Confirmar e salvar a conciliação inteira
  const handleConfirmConciliacao = async () => {
    // Filtrar somente as transações ativas para validações
    const transacoesParaGravar = transacoesImportadas.filter(t => !t.ignorar);

    // Validar se todas as transações ativas têm o tipo_conta (PF ou PJ) definido
    const pendentes = transacoesParaGravar.filter(t => !t.tipo_conta);
    if (pendentes.length > 0) {
      alert(`Por favor, defina se o lançamento é Pessoal (PF) ou do Consultório (PJ) para todos os lançamentos ativos (faltam ${pendentes.length} lançamentos).`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Salvar as regras de classificação novas que o usuário aceitou registrar (apenas ativas)
      for (const t of transacoesParaGravar) {
        if (salvarRegrasFuturas[t.id] && t.categoria !== "FALTA IDENTIFICAR" && t.tipo_conta) {
          await fetch("/api/extratos/regras", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              termo_chave: t.descricao,
              categoria: t.categoria,
              tipo_conta: t.tipo_conta,
            }),
          });
        }
      }

      // 2. Gravar os lançamentos no banco de dados SQLite local (passando todas para aprendizado)
      const response = await fetch("/api/extratos/confirmar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transacoes: transacoesImportadas,
        }),
      });

      const dataRes = await response.json();
      if (!response.ok || !dataRes.success) {
        throw new Error(dataRes.error || "Erro ao gravar lançamentos no banco de dados.");
      }

      alert(`Sucesso! ${dataRes.count} lançamentos foram importados para o seu caixa local.`);
      
      // Resetar os estados
      setPdfFile(null);
      setImportStatus("");
      setTransacoesImportadas([]);
      setShowConciliacao(false);
      setErrosLeitura([]);
      setSelectedImportedIds([]);

      // Recarregar a página e voltar para aba de despesas
      router.refresh();
      setActiveTab("despesas");
    } catch (err: any) {
      setError(err.message || "Erro ao confirmar conciliação.");
    } finally {
      setLoading(false);
    }
  };

  // Preencher dados aleatórios de teste para acelerar validação
  const handlePreencherFalso = () => {
    const catsDespesas = ['aluguel', 'internet', 'marketing', 'impostos', 'ferramentas', 'alimentacao', 'outros'];
    const catsReceitas = ['atendimento', 'supervisao', 'palestra', 'outros'];
    
    setTransacoesImportadas((prev) =>
      prev.map((t) => {
        const isDespesa = t.valor < 0;
        const catFalsa = isDespesa
          ? catsDespesas[Math.floor(Math.random() * catsDespesas.length)]
          : catsReceitas[Math.floor(Math.random() * catsReceitas.length)];
        
        return {
          ...t,
          categoria: catFalsa,
          tipo_conta: t.tipo_conta || (Math.random() > 0.5 ? "PJ" : "PF"),
          ignorar: false,
        };
      })
    );
  };

  return (
    <div className="w-full">
      {/* As abas e conteúdos são renderizados diretamente abaixo, sem cabeçalhos duplicados */}

      {/* Abas Superiores de Navegação */}
      <div className="border-b border-outline-variant flex gap-6 font-label-md text-label-md mb-8">
        <button
          onClick={() => { setActiveTab("despesas"); setError(""); }}
          className={`py-3 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "despesas"
              ? "text-primary border-b-2 border-primary font-semibold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          Despesas Gerais
        </button>
        <button
          onClick={() => { setActiveTab("cartoes"); setError(""); }}
          className={`py-3 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "cartoes"
              ? "text-primary border-b-2 border-primary font-semibold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">credit_card</span>
          Cartões de Crédito
        </button>
        <button
          onClick={() => { setActiveTab("extratos"); setError(""); }}
          className={`py-3 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "extratos"
              ? "text-primary border-b-2 border-primary font-semibold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          Importar PDF (Extrato)
        </button>
      </div>

      {/* --- ABA 1: DESPESAS GERAIS --- */}
      {activeTab === "despesas" && (
        <div className="grid grid-cols-12 gap-6">
          {/* Formulário Bento Lateral (4 colunas) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm sticky top-6">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 border-b border-outline-variant pb-4">
                Registrar Saída
              </h3>
              
              {error && (
                <div className="p-3 mb-4 bg-error-container/20 border border-error-container text-error rounded-lg text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveDespesa} className="space-y-5">
                {/* Seletor de Conta (PF / PJ) */}
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">
                    Responsabilidade do Gasto
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTipoConta("PJ")}
                      className={`relative flex flex-col items-start cursor-pointer rounded-lg border p-3 shadow-sm transition-all ${
                        tipoConta === "PJ"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      <span className="block font-label-md text-label-md font-bold">PJ Business</span>
                      <span className="mt-0.5 text-[11px] opacity-75">Consultório</span>
                      {tipoConta === "PJ" && (
                        <span className="material-symbols-outlined absolute right-2 top-2 text-[18px]">check_circle</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoConta("PF")}
                      className={`relative flex flex-col items-start cursor-pointer rounded-lg border p-3 shadow-sm transition-all ${
                        tipoConta === "PF"
                          ? "border-secondary bg-secondary/5 text-secondary"
                          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      <span className="block font-label-md text-label-md font-bold">PF Personal</span>
                      <span className="mt-0.5 text-[11px] opacity-75">Pessoal</span>
                      {tipoConta === "PF" && (
                        <span className="material-symbols-outlined absolute right-2 top-2 text-[18px]">check_circle</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Meio de Pagamento */}
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
                    Meio de Pagamento
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                    value={meioPagamento}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setMeioPagamento(val);
                      if (val === "cartao_credito" && cartoes.length > 0) {
                        setCartaoId(cartoes[0].id);
                      } else {
                        setCartaoId("");
                      }
                    }}
                    disabled={loading}
                  >
                    <option value="conta_corrente">Conta Corrente / Pix</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                  </select>
                </div>

                {/* Seletor de Cartões (se aplicável) */}
                {meioPagamento === "cartao_credito" && (
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
                      Qual Cartão?
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none text-on-surface cursor-pointer"
                      value={cartaoId}
                      onChange={(e) => setCartaoId(e.target.value)}
                      required
                      disabled={loading}
                    >
                      {cartoes.length === 0 ? (
                        <option value="">Nenhum cartão cadastrado</option>
                      ) : (
                        cartoes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} ({c.tipo_conta})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {/* Valor e Data */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                      Valor (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono-sm">R$</span>
                      <input
                        className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-mono-sm text-error"
                        placeholder="0,00"
                        type="number"
                        step="0.01"
                        required
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                      Data
                    </label>
                    <input
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface cursor-pointer"
                      type="date"
                      required
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Descrição do Gasto
                  </label>
                  <input
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface"
                    placeholder="Ex: Conta de internet, Aluguel"
                    type="text"
                    required
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Categoria
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface appearance-none cursor-pointer"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    disabled={loading}
                  >
                    <option value="aluguel">Aluguel / Sala</option>
                    <option value="internet">Internet / Telefone</option>
                    <option value="marketing">Marketing / Ads</option>
                    <option value="impostos">Impostos / DAS</option>
                    <option value="ferramentas">Ferramentas / Apps</option>
                    <option value="alimentacao">Alimentação</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                {/* Botões do Formulário */}
                <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDescricao("");
                      setValor("");
                      setMeioPagamento("conta_corrente");
                    }}
                    className="px-4 py-2 text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                  >
                    Limpar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-colors shadow-sm cursor-pointer disabled:opacity-75"
                  >
                    {loading ? "Salvando..." : "Salvar Despesa"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Listagem de Despesas e Filtros (8 colunas) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            {/* Filtros superiores de abas retendo mes/ano */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex bg-surface-container p-1 rounded-lg border border-outline-variant">
                <Link
                  href={`?filtro=consolidated&mes=${searchParams.get("mes") || ""}&ano=${searchParams.get("ano") || ""}`}
                  className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-all ${
                    filtroInicial === "consolidado"
                      ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Consolidado
                </Link>
                <Link
                  href={`?filtro=pj&mes=${searchParams.get("mes") || ""}&ano=${searchParams.get("ano") || ""}`}
                  className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-all ${
                    filtroInicial === "pj"
                      ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Apenas PJ
                </Link>
                <Link
                  href={`?filtro=pf&mes=${searchParams.get("mes") || ""}&ano=${searchParams.get("ano") || ""}`}
                  className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-all ${
                    filtroInicial === "pf"
                      ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Apenas PF
                </Link>
              </div>
            </div>

            {/* Tabela de Histórico de Despesas */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  {/* Linha 1: Títulos */}
                  <tr className="bg-surface-container-low border-b border-outline-variant font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Forma / Cartão</th>
                    <th className="px-6 py-4">Caixa</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>

                  {/* Linha 2: Inputs de Filtros Reativos por Coluna (Estilo Excel) */}
                  <tr className="border-b border-outline-variant/60 bg-surface-container-low/20">
                    {/* Data */}
                    <td className="py-2 px-6">
                      <input
                        type="text"
                        value={filtroData}
                        onChange={(e) => setFiltroData(e.target.value)}
                        placeholder="Filtrar data..."
                        className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold"
                      />
                    </td>
                    {/* Descrição */}
                    <td className="py-2 px-6">
                      <input
                        type="text"
                        value={filtroDescricao}
                        onChange={(e) => setFiltroDescricao(e.target.value)}
                        placeholder="Filtrar descrição..."
                        className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold"
                      />
                    </td>
                    {/* Categoria */}
                    <td className="py-2 px-6">
                      <select
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                        className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold cursor-pointer"
                      >
                        <option value="">Todas</option>
                        {Object.entries(categoriasMap).map(([key, val]) => (
                          <option key={key} value={key}>
                            {val}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* Forma / Meio */}
                    <td className="py-2 px-6">
                      <select
                        value={filtroMeio}
                        onChange={(e) => setFiltroMeio(e.target.value)}
                        className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold cursor-pointer"
                      >
                        <option value="">Todas</option>
                        <option value="corrente">Corrente / Pix</option>
                        <option value="cartao">Cartão de Crédito</option>
                      </select>
                    </td>
                    {/* Caixa */}
                    <td className="py-2 px-6">
                      <select
                        value={filtroCaixa}
                        onChange={(e) => setFiltroCaixa(e.target.value)}
                        className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-xs outline-none focus:border-primary text-on-surface font-semibold cursor-pointer"
                      >
                        <option value="">Todos</option>
                        <option value="PJ">PJ (Consultório)</option>
                        <option value="PF">PF (Pessoal)</option>
                      </select>
                    </td>
                    <td className="py-2 px-6"></td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 text-body-md text-on-surface">
                  {despesasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                        Nenhuma despesa registrada para estes filtros.
                      </td>
                    </tr>
                  ) : (
                    despesasFiltradas.map((item) => {
                      const dataFormatada = new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });

                      return (
                        <tr key={item.id} className="hover:bg-surface-container-low/30 transition-colors">
                          <td className="px-6 py-4 text-on-surface-variant font-mono-sm">
                            {dataFormatada}
                          </td>
                          <td className="px-6 py-4 font-medium">
                            {item.descricao}
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={item.categoria}
                              onChange={(e) => handleUpdateDespesaDb(item.id, "categoria", e.target.value)}
                              disabled={loading}
                              className="bg-surface-container-low border border-outline-variant/60 rounded px-2 py-1 text-xs text-on-surface focus:bg-surface-container-lowest cursor-pointer font-medium outline-none"
                            >
                              {Object.entries(categoriasMap).map(([key, val]) => (
                                <option key={key} value={key}>
                                  {val}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant">
                            {item.meio_pagamento === "cartao_credito" ? (
                              <span className="flex items-center gap-1 text-xs">
                                <span className="material-symbols-outlined text-[14px]">credit_card</span>
                                {item.cartao_nome || "Cartão"} (Fat. {item.fatura_mes}/{item.fatura_ano})
                              </span>
                            ) : (
                              <span className="text-xs">Corrente / Pix</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={item.tipo_conta}
                              onChange={(e) => handleUpdateDespesaDb(item.id, "tipo_conta", e.target.value as "PF" | "PJ")}
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
                          </td>
                          <td className="px-6 py-4 text-right text-error font-mono-sm font-semibold">
                            - R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- ABA 2: CARTÕES DE CRÉDITO --- */}
      {activeTab === "cartoes" && (
        <div className="grid grid-cols-12 gap-6">
          {/* Cadastro de Cartão (4 colunas) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 border-b border-outline-variant pb-4">
                Cadastrar Cartão
              </h3>
              
              {error && (
                <div className="p-3 mb-4 bg-error-container/20 border border-error-container text-error rounded-lg text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveCartao} className="space-y-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Nome do Cartão (Apelido)
                  </label>
                  <input
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary outline-none text-on-surface"
                    placeholder="Ex: Nubank PF, Itaú PJ"
                    type="text"
                    required
                    value={nomeCartao}
                    onChange={(e) => setNomeCartao(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                      Dia Fechamento
                    </label>
                    <input
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary outline-none text-on-surface"
                      placeholder="Ex: 5"
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={diaFechamento}
                      onChange={(e) => setDiaFechamento(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                      Dia Vencimento
                    </label>
                    <input
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary outline-none text-on-surface"
                      placeholder="Ex: 12"
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={diaVencimento}
                      onChange={(e) => setDiaVencimento(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Limite Total (R$)
                  </label>
                  <input
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary outline-none text-on-surface font-mono-sm"
                    placeholder="0,00"
                    type="number"
                    value={limiteCartao}
                    onChange={(e) => setLimiteCartao(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
                    Responsável pelo Pagamento
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary outline-none text-on-surface cursor-pointer"
                    value={tipoContaCartao}
                    onChange={(e) => setTipoContaCartao(e.target.value as any)}
                    disabled={loading}
                  >
                    <option value="PF">Pessoa Física (PF)</option>
                    <option value="PJ">Pessoa Jurídica (PJ)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-colors shadow-sm cursor-pointer disabled:opacity-75 mt-2"
                >
                  {loading ? "Cadastrando..." : "Cadastrar Cartão"}
                </button>
              </form>
            </div>
          </div>

          {/* Listagem de Cartões e Faturas (8 colunas) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cartoes.length === 0 ? (
                <div className="col-span-2 p-8 border border-dashed border-outline-variant rounded-xl text-center text-on-surface-variant font-body-md bg-surface-container-lowest">
                  Nenhum cartão de crédito cadastrado por enquanto.
                </div>
              ) : (
                cartoes.map((c) => {
                  const valorFatura = c.valor_fatura || 0;
                  const limiteDisponivel = c.limite - valorFatura;
                  const porcentagemGasta = c.limite > 0 ? Math.min(Math.round((valorFatura / c.limite) * 100), 100) : 0;

                  return (
                    <div
                      key={c.id}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative overflow-hidden shadow-sm"
                    >
                      {/* Cor lateral de acordo com a conta (PJ=Roxo/Primary, PF=Petroleo/Secondary) */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.tipo_conta === "PJ" ? "bg-primary" : "bg-secondary"}`}></div>

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            {c.nome}
                          </h4>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Melhor compra: Dia {c.dia_fechamento + 1} | Vence Dia {c.dia_vencimento}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                          c.tipo_conta === "PJ" 
                            ? "bg-primary/10 text-primary border-primary/20" 
                            : "bg-secondary/10 text-secondary border-secondary/20"
                        }`}>
                          {c.tipo_conta === "PJ" ? "PJ Business" : "PF Personal"}
                        </span>
                      </div>

                      {/* Informações da Fatura Atual */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <span className="text-xs text-on-surface-variant uppercase tracking-wider block">Fatura Atual</span>
                            <span className="font-headline-md text-headline-md font-extrabold text-error">
                              R$ {valorFatura.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <span className="text-xs text-on-surface-variant font-mono-sm">
                            Disponível: R$ {limiteDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Barra de Progresso do Limite */}
                        <div className="w-full bg-surface-container-high rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              porcentagemGasta > 85 ? "bg-error" : "bg-primary"
                            }`}
                            style={{ width: `${porcentagemGasta}%` }}
                          ></div>
                        </div>

                        <div className="flex justify-between text-[11px] text-on-surface-variant">
                          <span>Limite: R$ {c.limite.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                          <span>{porcentagemGasta}% usado</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ABA 3: IMPORTAR EXTRATO PDF / CONCILIAÇÃO --- */}
      {activeTab === "extratos" && (
        !showConciliacao ? (
          <div className="max-w-2xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[32px]">picture_as_pdf</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Importação de Extrato Bancário</h3>
                <p className="text-on-surface-variant font-body-md text-body-md mt-1">
                  Suba o extrato do seu banco em PDF. O sistema faz a leitura, classifica as despesas e receitas automaticamente.
                </p>
              </div>
            </div>

            <form onSubmit={handleImportPDF} className="space-y-6">
              {/* Caixa de Drag & Drop */}
              <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 text-center bg-surface-container-low/20 hover:bg-surface-container-low/40 transition-colors relative cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPdfFile(e.target.files[0]);
                    }
                  }}
                />
                <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40 group-hover:text-primary transition-colors mb-2 block">
                  cloud_upload
                </span>
                <p className="font-label-md text-label-md text-on-surface font-semibold">
                  {pdfFile ? pdfFile.name : "Clique para selecionar o PDF ou arraste aqui"}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Formatos suportados: PDF de extratos (Ex: Nubank, Itaú, Bradesco, Inter)
                </p>
              </div>

              {/* Aviso de Dupla Leitura (Double-Pass) */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3 text-xs text-on-primary-fixed-variant leading-relaxed">
                <span className="material-symbols-outlined text-primary font-bold">verified_user</span>
                <div>
                  <span className="font-bold block mb-0.5">Mecanismo de Dupla Validação Ativado (Double-Pass)</span>
                  O sistema processará o PDF duas vezes em paralelo: analisando as tabelas estruturadas e fazendo varredura com expressões regulares. Os resultados serão confrontados para garantir 100% de consistência antes de qualquer gravação.
                </div>
              </div>

              {/* Status do Processamento */}
              {importStatus && (
                <div className="p-3 bg-surface-container-low border border-outline-variant text-on-surface font-mono-sm text-xs rounded-lg space-y-1">
                  {importStatus}
                </div>
              )}

              {/* Botão de Envio */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setPdfFile(null); setImportStatus(""); }}
                  className="px-4 py-2 text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                  disabled={loading}
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  disabled={!pdfFile || loading}
                  className="px-6 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent"></span>}
                  Iniciar Importação
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-outline-variant pb-4">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Conciliação do Extrato</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Identificamos {transacoesImportadas.length} transações no PDF. Defina a destinação de cada uma.
                </p>
              </div>

              {/* Selo de Validação Dupla */}
              <div className="flex items-center gap-2">
                {statusConfrontoGeral === "sucesso" ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-secondary/10 text-secondary border border-secondary/20">
                    <span className="material-symbols-outlined text-[16px] text-secondary font-bold">verified</span>
                    Dupla Checagem: 100% Consistente
                  </div>
                ) : statusConfrontoGeral === "divergente" ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-error/10 text-error border border-error/20">
                    <span className="material-symbols-outlined text-[16px] text-error font-bold">warning</span>
                    Dupla Checagem: Divergências Detectadas
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    <span className="material-symbols-outlined text-[16px] text-amber-500 font-bold">info</span>
                    Leitura Parcial (Verifique os dados)
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 mb-6 bg-error-container/20 border border-error-container text-error rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Erros e Alertas de Leitura Parcial ou Divergente */}
            {errosLeitura.length > 0 && (
              <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs leading-relaxed text-amber-800">
                <span className="font-bold flex items-center gap-1 mb-1.5 text-amber-700">
                  <span className="material-symbols-outlined text-[16px] text-amber-750 font-bold">info</span>
                  Divergências ou Inconsistências apontadas pelo Extrator:
                </span>
                <ul className="list-disc pl-4 space-y-1">
                  {errosLeitura.map((err: any, i) => (
                    <li key={i}>
                      <strong>Página {err.pagina || "Geral"}:</strong> {err.motivo}
                      {err.arquivo ? ` (arquivo: ${err.arquivo})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cabeçalho de Ações em Lote para Conciliação */}
            <div className="flex flex-wrap justify-between items-center bg-surface-container-low border border-outline-variant/60 rounded-xl p-3 mb-4 gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface">
                <input
                  type="checkbox"
                  checked={selectedImportedIds.length === transacoesImportadas.length && transacoesImportadas.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedImportedIds(transacoesImportadas.map(t => t.id));
                    } else {
                      setSelectedImportedIds([]);
                    }
                  }}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span>Selecionar Todas ({transacoesImportadas.length})</span>
              </label>
              
              {selectedImportedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-primary mr-1">{selectedImportedIds.length} marcadas</span>
                  <span className="text-on-surface-variant font-medium">| Lote:</span>
                  
                  <select
                    onChange={(e) => {
                      const cat = e.target.value;
                      if (cat) {
                        setTransacoesImportadas(prev => prev.map(t => selectedImportedIds.includes(t.id) ? { ...t, categoria: cat } : t));
                        e.target.value = ""; // reset seletor
                      }
                    }}
                    defaultValue=""
                    className="bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-xs text-on-surface font-medium outline-none cursor-pointer"
                  >
                    <option value="" disabled>Categoria...</option>
                    <option value="" disabled>--- Categorias Despesas ---</option>
                    {Object.entries(categoriasMap).map(([key, val]) => (
                      <option key={key} value={key}>{val}</option>
                    ))}
                    <option value="" disabled>--- Categorias Receitas ---</option>
                    {Object.entries(categoriasReceitaMap).map(([key, val]) => (
                      <option key={key} value={key}>{val}</option>
                    ))}
                  </select>

                  <select
                    onChange={(e) => {
                      const tc = e.target.value as "PF" | "PJ";
                      if (tc) {
                        setTransacoesImportadas(prev => prev.map(t => selectedImportedIds.includes(t.id) ? { ...t, tipo_conta: tc } : t));
                        e.target.value = ""; // reset
                      }
                    }}
                    defaultValue=""
                    className="bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-xs text-on-surface font-medium outline-none cursor-pointer"
                  >
                    <option value="" disabled>Caixa...</option>
                    <option value="PJ">PJ Business</option>
                    <option value="PF">PF Personal</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setTransacoesImportadas(prev => prev.map(t => selectedImportedIds.includes(t.id) ? { ...t, ignorar: !t.ignorar } : t));
                    }}
                    className="bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-high rounded px-2.5 py-1 text-xs font-semibold cursor-pointer text-on-surface h-8 transition-colors"
                  >
                    Alternar Descarte
                  </button>
                </div>
              )}
            </div>

            {/* Listagem de Transações */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 mb-6">
              {transacoesImportadas.map((t) => {
                const isDespesa = t.valor < 0;
                const matchesDivergente = t.status_confronto === "divergente";

                return (
                  <div
                    key={t.id}
                    className={`border rounded-xl p-4 transition-all relative ${
                      t.ignorar
                        ? "opacity-50 bg-surface-container-low border-outline-variant/30"
                        : matchesDivergente
                        ? "border-error bg-error/5 shadow-[0_0_8px_rgba(186,26,26,0.05)]"
                        : "border-outline-variant hover:shadow-sm bg-surface-container-lowest"
                    }`}
                  >
                    {/* Linha Principal */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      
                      {/* 1. Status / Info Lançamento (4 colunas) */}
                      <div className="lg:col-span-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedImportedIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedImportedIds(prev => [...prev, t.id]);
                              } else {
                                setSelectedImportedIds(prev => prev.filter(id => id !== t.id));
                              }
                            }}
                            className="w-3.5 h-3.5 accent-primary rounded cursor-pointer shrink-0"
                          />
                          <span className="font-mono-sm text-xs text-on-surface-variant font-bold bg-surface-container-high px-2 py-0.5 rounded">
                            {t.data}
                          </span>
                          {matchesDivergente && (
                            <span className="text-[10px] font-bold text-error px-1.5 py-0.5 rounded bg-error/10 uppercase tracking-wider">
                              Divergência
                            </span>
                          )}
                          {!t.ja_classificado && !t.ignorar && (
                            <span className="text-[10px] font-bold text-amber-600 px-1.5 py-0.5 rounded bg-amber-500/10 uppercase tracking-wider">
                              Novo
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-body-md text-on-surface line-clamp-2" title={t.descricao}>
                          {t.descricao}
                        </p>
                        <p className="text-[10px] text-on-surface-variant font-mono-sm">
                          Origem: {t.arquivo_origem}
                        </p>
                      </div>

                      {/* 2. Valor (2 colunas) */}
                      <div className="lg:col-span-2 text-left lg:text-right font-headline-sm text-headline-sm font-extrabold">
                        <span className={isDespesa ? "text-error" : "text-secondary"}>
                          {isDespesa ? "-" : "+"} R$ {Math.abs(t.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* 3. Classificação e Responsabilidade (6 colunas) */}
                      <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Seletor PF/PJ */}
                        <div>
                          <label className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">
                            Conta
                          </label>
                          <div className="grid grid-cols-2 gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/50">
                            <button
                              type="button"
                              onClick={() => handleUpdateImportedRow(t.id, "tipo_conta", "PJ")}
                              className={`py-1 rounded font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                                t.tipo_conta === "PJ"
                                  ? "bg-primary text-on-primary shadow-sm"
                                  : "text-on-surface-variant hover:text-on-surface"
                              }`}
                              disabled={t.ignorar}
                            >
                              PJ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateImportedRow(t.id, "tipo_conta", "PF")}
                              className={`py-1 rounded font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                                t.tipo_conta === "PF"
                                  ? "bg-secondary text-on-secondary shadow-sm"
                                  : "text-on-surface-variant hover:text-on-surface"
                              }`}
                              disabled={t.ignorar}
                            >
                              PF
                            </button>
                          </div>
                        </div>

                        {/* Categoria */}
                        <div>
                          <label className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">
                            Categoria
                          </label>
                          {isDespesa ? (
                            <select
                              className="w-full px-2 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs outline-none text-on-surface cursor-pointer disabled:opacity-50"
                              value={t.categoria}
                              onChange={(e) => handleUpdateImportedRow(t.id, "categoria", e.target.value)}
                              disabled={t.ignorar}
                            >
                              <option value="FALTA IDENTIFICAR">Selecione Categoria...</option>
                              {Object.entries(categoriasMap).map(([key, val]) => (
                                <option key={key} value={key}>{val}</option>
                              ))}
                            </select>
                          ) : (
                            <select
                              className="w-full px-2 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs outline-none text-on-surface cursor-pointer disabled:opacity-50"
                              value={t.categoria === "FALTA IDENTIFICAR" || !t.categoria ? "atendimento" : t.categoria}
                              onChange={(e) => handleUpdateImportedRow(t.id, "categoria", e.target.value)}
                              disabled={t.ignorar}
                            >
                              {Object.entries(categoriasReceitaMap).map(([key, val]) => (
                                <option key={key} value={key}>{val}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Se for despesa, exibe Meio de Pagamento */}
                        {isDespesa && (
                          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            {/* Meio de Pagamento */}
                            <div>
                              <label className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">
                                Meio Pagamento
                              </label>
                              <select
                                className="w-full px-2 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs outline-none text-on-surface cursor-pointer disabled:opacity-50"
                                value={t.meio_pagamento || "conta_corrente"}
                                onChange={(e) => handleUpdateImportedRow(t.id, "meio_pagamento", e.target.value)}
                                disabled={t.ignorar}
                              >
                                <option value="conta_corrente">Conta Corrente</option>
                                <option value="cartao_credito">Cartão de Crédito</option>
                              </select>
                            </div>

                            {/* Cartão de Crédito se meio for cartao_credito */}
                            {t.meio_pagamento === "cartao_credito" && (
                              <div>
                                <label className="block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">
                                  Cartão de Crédito
                                </label>
                                <select
                                  className="w-full px-2 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs outline-none text-on-surface cursor-pointer disabled:opacity-50"
                                  value={t.cartao_id || ""}
                                  onChange={(e) => handleUpdateImportedRow(t.id, "cartao_id", e.target.value)}
                                  disabled={t.ignorar}
                                >
                                  <option value="">Selecione o Cartão...</option>
                                  {cartoes
                                    .filter((c: any) => c.tipo_conta === t.tipo_conta)
                                    .map((c: any) => (
                                      <option key={c.id} value={c.id}>
                                        {c.nome} (v. dia {c.dia_vencimento})
                                      </option>
                                    ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Rodapé do Card */}
                    <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-outline-variant/30 text-xs">
                      
                      {/* Checkbox de Regra Futura */}
                      <div>
                        {isDespesa && !t.ignorar && (
                          <label className="inline-flex items-center gap-2 text-on-surface-variant cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!salvarRegrasFuturas[t.id]}
                              onChange={(e) =>
                                setSalvarRegrasFuturas((prev) => ({
                                  ...prev,
                                  [t.id]: e.target.checked,
                                }))
                              }
                              className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                            />
                            <span>Lembrar classificação para compras futuras como "{t.descricao}"</span>
                          </label>
                        )}
                      </div>

                      {/* Botão Ignorar / Descartar */}
                      <button
                        type="button"
                        onClick={() => handleUpdateImportedRow(t.id, "ignorar", !t.ignorar)}
                        className={`inline-flex items-center gap-1 font-semibold cursor-pointer py-1 px-2.5 rounded-lg transition-colors ${
                          t.ignorar
                            ? "bg-primary text-on-primary hover:bg-primary-container"
                            : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {t.ignorar ? "add_circle" : "do_not_disturb_on"}
                        </span>
                        {t.ignorar ? "Incluir Lançamento" : "Descartar Importação"}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Ações Finais */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-outline-variant pt-5">
              <div className="text-sm text-on-surface-variant font-medium">
                Importando: <span className="font-bold text-on-surface">{transacoesImportadas.filter(t => !t.ignorar).length}</span> de <span className="font-bold text-on-surface">{transacoesImportadas.length}</span> lançamentos.
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePreencherFalso}
                  disabled={loading}
                  className="px-4 py-2 bg-secondary/15 border border-secondary/35 text-secondary hover:bg-secondary/25 font-label-md text-label-md rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
                  Simular Teste (Preenchimento Rápido)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPdfFile(null);
                    setImportStatus("");
                    setTransacoesImportadas([]);
                    setShowConciliacao(false);
                    setErrosLeitura([]);
                    setSelectedImportedIds([]);
                  }}
                  className="px-5 py-2 text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConciliacao}
                  disabled={loading}
                  className="px-6 py-2.5 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent"></span>}
                  Confirmar Importação
                </button>
              </div>
            </div>
          </div>
        )
      )}
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
              Deseja atualizar a categoria de todas elas para "<strong>{categoriasMap[pendingBatchUpdate.valor] || pendingBatchUpdate.valor}</strong>" ou alterar apenas esta?
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowBatchModal(false);
                  setPendingBatchUpdate(null);
                  router.refresh(); // Desfazer visualmente a alteração
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
    </div>
  );
}
