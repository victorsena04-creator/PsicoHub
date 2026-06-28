"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Cartao {
  id: string;
  nome: string;
  tipo_conta: "PF" | "PJ";
}

export function NovoLancamentoModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [error, setError] = useState("");

  // Estados do formulário
  const [tipoLancamento, setTipoLancamento] = useState<"entrada" | "saida">("saida");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [categoria, setCategoria] = useState("outros");
  const [tipoConta, setTipoConta] = useState<"PF" | "PJ">("PJ");
  const [meioPagamento, setMeioPagamento] = useState<"conta_corrente" | "cartao_credito">("conta_corrente");
  const [cartaoId, setCartaoId] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const fetchCartoes = async () => {
      try {
        const response = await fetch("/api/cartoes");
        const resJson = await response.json();
        if (response.ok && resJson.success) {
          setCartoes(resJson.data);
          if (resJson.data.length > 0) {
            setCartaoId(resJson.data[0].id);
          }
        }
      } catch (err) {
        console.error("Erro ao obter cartões:", err);
      }
    };

    fetchCartoes();
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setError("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setTipoLancamento("saida");
    setDescricao("");
    setValor("");
    setData(new Date().toISOString().split("T")[0]);
    setCategoria("outros");
    setTipoConta("PJ");
    setMeioPagamento("conta_corrente");
    setCartaoId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !valor || !data || !tipoConta) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/financeiro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo_lancamento: tipoLancamento,
          descricao,
          valor: parseFloat(valor),
          data,
          categoria: tipoLancamento === "entrada" ? "Atendimento" : categoria,
          tipo_conta: tipoConta,
          meio_pagamento: tipoLancamento === "saida" ? meioPagamento : undefined,
          cartao_id: (tipoLancamento === "saida" && meioPagamento === "cartao_credito") ? cartaoId : undefined,
        }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || "Erro ao salvar lançamento.");
      }

      handleClose();
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Falha ao registrar novo lançamento.");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar cartões com base na responsabilidade selecionada (PF ou PJ)
  const cartoesFiltrados = cartoes.filter((c) => c.tipo_conta === tipoConta);

  return (
    <>
      <button 
        onClick={handleOpen}
        className="bg-primary hover:bg-primary/95 text-on-primary font-label-md text-label-md py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
          add
        </span>
        Novo Lançamento
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={handleClose} className="absolute inset-0 bg-black/45 backdrop-blur-sm"></div>

          <div className="absolute w-full max-w-[500px] bg-surface-bright border border-outline-variant rounded-xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 animate-fadeIn">
            {/* Cabeçalho */}
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-outline-variant">
              <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">payments</span>
                Novo Lançamento Manual
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
              {/* Direção/Tipo do lançamento */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  Tipo de Lançamento
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoLancamento("entrada");
                      setTipoConta("PJ"); // Receita geralmente é PJ no consultório
                    }}
                    className={`py-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      tipoLancamento === "entrada"
                        ? "border-secondary bg-secondary/5 text-secondary"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">arrow_downward</span>
                    Receita (Entrada)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoLancamento("saida")}
                    className={`py-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      tipoLancamento === "saida"
                        ? "border-error bg-error/5 text-error"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                    Despesa (Saída)
                  </button>
                </div>
              </div>

              {/* Responsabilidade (PF ou PJ) */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  Caixa de Destino / Origem
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoConta("PJ")}
                    className={`relative flex flex-col items-start cursor-pointer rounded-lg border p-2.5 transition-all ${
                      tipoConta === "PJ"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="block text-xs font-bold">PJ Business</span>
                    <span className="text-[10px] opacity-75">Consultório</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoConta("PF")}
                    className={`relative flex flex-col items-start cursor-pointer rounded-lg border p-2.5 transition-all ${
                      tipoConta === "PF"
                        ? "border-secondary bg-secondary/5 text-secondary"
                        : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span className="block text-xs font-bold">PF Personal</span>
                    <span className="text-[10px] opacity-75">Pessoal</span>
                  </button>
                </div>
              </div>

              {/* Meio de Pagamento (somente despesa) */}
              {tipoLancamento === "saida" && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                    Meio de Pagamento
                  </label>
                  <select
                    value={meioPagamento}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setMeioPagamento(val);
                      if (val === "cartao_credito" && cartoesFiltrados.length > 0) {
                        setCartaoId(cartoesFiltrados[0].id);
                      } else {
                        setCartaoId("");
                      }
                    }}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary outline-none text-on-surface cursor-pointer"
                  >
                    <option value="conta_corrente">Conta Corrente / Pix</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                  </select>
                </div>
              )}

              {/* Seletor de Cartões (somente despesa em cartão de crédito) */}
              {tipoLancamento === "saida" && meioPagamento === "cartao_credito" && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                    Qual Cartão?
                  </label>
                  <select
                    value={cartaoId}
                    onChange={(e) => setCartaoId(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary outline-none text-on-surface cursor-pointer"
                  >
                    {cartoesFiltrados.length === 0 ? (
                      <option value="">Nenhum cartão {tipoConta} cadastrado</option>
                    ) : (
                      cartoesFiltrados.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Valor e Data */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Valor (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono-sm text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      required
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      disabled={loading}
                      className={`w-full pl-9 pr-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs font-mono-sm focus:ring-1 outline-none ${
                        tipoLancamento === "entrada" 
                          ? "focus:ring-secondary text-secondary" 
                          : "focus:ring-error text-error"
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary outline-none text-on-surface cursor-pointer"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  placeholder="Ex: Recebimento consulta extra, Material escritório"
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary outline-none text-on-surface"
                />
              </div>

              {/* Categoria (somente despesa) */}
              {tipoLancamento === "saida" && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Categoria
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-xs focus:ring-1 focus:ring-primary outline-none text-on-surface cursor-pointer"
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
              )}

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
                  disabled={loading}
                  className="bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs px-5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {loading ? "Registrando..." : "Registrar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
