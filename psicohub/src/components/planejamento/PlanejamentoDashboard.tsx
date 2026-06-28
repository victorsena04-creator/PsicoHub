"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Divida {
  id: string;
  credor: string;
  valor_total: number;
  valor_pago: number;
  valor_parcela: number;
  parcelas_totais: number;
  parcelas_pagas: number;
  destinacao_mensal: number;
  status: "ativa" | "quitada";
  tipo_conta: "PF" | "PJ";
  vencimento_proxima_parcela: string | null;
}

interface Investimento {
  id: string;
  nome_ativo: string;
  tipo_investimento: "reserva_emergencia" | "renda_fixa" | "renda_variavel" | "outros";
  saldo_acumulado: number;
  meta_aporte_mensal: number;
  tipo_conta: "PF" | "PJ";
}

interface PlanejamentoDashboardProps {
  dividas: Divida[];
  investimentos: Investimento[];
  lucroLiquido: number;
}

export function PlanejamentoDashboard({
  dividas,
  investimentos,
  lucroLiquido,
}: PlanejamentoDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modais abertos
  const [showDividaModal, setShowDividaModal] = useState(false);
  const [showInvestModal, setShowInvestModal] = useState(false);

  // --- ESTADOS DO FORMULÁRIO DE DÍVIDAS ---
  const [credor, setCredor] = useState("");
  const [valorTotalDiv, setValorTotalDiv] = useState("");
  const [valorParcelaDiv, setValorParcelaDiv] = useState("");
  const [parcelasTotaisDiv, setParcelasTotaisDiv] = useState("");
  const [tipoContaDiv, setTipoContaDiv] = useState<"PF" | "PJ">("PF");
  const [vencimentoDiv, setVencimentoDiv] = useState("");

  // --- ESTADOS DO FORMULÁRIO DE INVESTIMENTOS ---
  const [nomeAtivo, setNomeAtivo] = useState("");
  const [tipoInvest, setTipoInvest] = useState<any>("reserva_emergencia");
  const [saldoAcumulado, setSaldoAcumulado] = useState("");
  const [metaAporte, setMetaAporte] = useState("");
  const [tipoContaInvest, setTipoContaInvest] = useState<"PF" | "PJ">("PF");

  // --- ESTADOS DO SIMULADOR DE DESTINAÇÃO ---
  // Porcentagens padrão totalizando 100%
  const [giroPct, setGiroPct] = useState(25);
  const [transferenciaPct, setTransferenciaPct] = useState(45);
  const [dividasPct, setDividasPct] = useState(15);
  const [investPct, setInvestPct] = useState(15);

  const totalPct = giroPct + transferenciaPct + dividasPct + investPct;

  // Lógica dos Sliders para ajustar limites (mantendo o teto de 100%)
  const handleSliderChange = (tipo: "giro" | "transf" | "divida" | "invest", value: number) => {
    if (tipo === "giro") {
      const maxPermitido = 100 - (transferenciaPct + dividasPct + investPct);
      setGiroPct(Math.min(value, Math.max(0, maxPermitido)));
    } else if (tipo === "transf") {
      const maxPermitido = 100 - (giroPct + dividasPct + investPct);
      setTransferenciaPct(Math.min(value, Math.max(0, maxPermitido)));
    } else if (tipo === "divida") {
      const maxPermitido = 100 - (giroPct + transferenciaPct + investPct);
      setDividasPct(Math.min(value, Math.max(0, maxPermitido)));
    } else if (tipo === "invest") {
      const maxPermitido = 100 - (giroPct + transferenciaPct + dividasPct);
      setInvestPct(Math.min(value, Math.max(0, maxPermitido)));
    }
  };

  // Cadastrar nova dívida
  const handleSaveDivida = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/planejamento/dividas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credor,
          valor_total: parseFloat(valorTotalDiv),
          valor_parcela: parseFloat(valorParcelaDiv),
          parcelas_totais: parseInt(parcelasTotaisDiv),
          tipo_conta: tipoContaDiv,
          vencimento_proxima_parcela: vencimentoDiv || null,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar dívida.");
      }

      setShowDividaModal(false);
      // Limpar formulário
      setCredor("");
      setValorTotalDiv("");
      setValorParcelaDiv("");
      setParcelasTotaisDiv("");
      setVencimentoDiv("");
      
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  // Cadastrar novo investimento
  const handleSaveInvestimento = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/planejamento/investimentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome_ativo: nomeAtivo,
          tipo_investimento: tipoInvest,
          saldo_acumulado: parseFloat(saldoAcumulado) || 0,
          meta_aporte_mensal: parseFloat(metaAporte) || 0,
          tipo_conta: tipoContaInvest,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar investimento.");
      }

      setShowInvestModal(false);
      // Limpar formulário
      setNomeAtivo("");
      setSaldoAcumulado("");
      setMetaAporte("");
      
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  // Mapeador do tipo de investimentos
  const tipoInvestMap: { [key: string]: string } = {
    reserva_emergencia: "Reserva de Emergência",
    renda_fixa: "Renda Fixa",
    renda_variavel: "Renda Variável",
    outros: "Outros Investimentos",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* COLUNA ESQUERDA: Dívidas & Investimentos (8 colunas) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Seção de Dívidas */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error">money_off</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Dívidas Ativas
              </h2>
            </div>
            <button
              onClick={() => setShowDividaModal(true)}
              className="text-primary hover:bg-surface-container-high border border-outline-variant px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold transition-colors cursor-pointer"
            >
              Adicionar Dívida
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dividas.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-on-surface-variant/50 border border-dashed border-outline-variant rounded-lg text-sm bg-surface-container-low/20">
                Nenhuma dívida ativa cadastrada. Muito bem!
              </div>
            ) : (
              dividas.map((div) => {
                const progresso = div.parcelas_totais > 0 
                  ? Math.round((div.parcelas_pagas / div.parcelas_totais) * 100)
                  : 0;

                return (
                  <div
                    key={div.id}
                    className="border border-outline-variant rounded-xl p-4 hover:shadow-sm transition-shadow relative bg-surface-container-low/20"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-label-md text-label-md font-bold text-on-surface">
                        {div.credor}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                        div.tipo_conta === "PJ"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-secondary/10 text-secondary border-secondary/20"
                      }`}>
                        {div.tipo_conta === "PJ" ? "PJ Business" : "PF Personal"}
                      </span>
                    </div>

                    <div className="font-headline-md text-headline-md text-on-surface mb-2 font-bold">
                      R$ {div.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>

                    <div className="flex justify-between text-xs text-on-surface-variant mb-3">
                      <span>Parcela: R$ {div.valor_parcela.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}/mês</span>
                      <span>
                        {div.parcelas_pagas}/{div.parcelas_totais} pagas ({progresso}%)
                      </span>
                    </div>

                    {/* Barra de Progresso de Quitação */}
                    <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                      <div className="bg-error h-full rounded-full transition-all duration-350" style={{ width: `${progresso}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Seção de Investimentos */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">trending_up</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Investimentos &amp; Reservas
              </h2>
            </div>
            <button
              onClick={() => setShowInvestModal(true)}
              className="text-primary hover:bg-surface-container-high border border-outline-variant px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold transition-colors cursor-pointer"
            >
              Nova Aplicação
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {investimentos.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-on-surface-variant/50 border border-dashed border-outline-variant rounded-lg text-sm bg-surface-container-low/20">
                Nenhum investimento registrado. Comece a poupar criando uma Reserva de Emergência!
              </div>
            ) : (
              investimentos.map((inv) => (
                <div
                  key={inv.id}
                  className="border border-outline-variant rounded-xl p-4 hover:shadow-sm transition-shadow relative bg-surface-container-low/20"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-label-md text-label-md font-bold text-on-surface">
                      {inv.nome_ativo}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                      inv.tipo_conta === "PJ"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-secondary/10 text-secondary border-secondary/20"
                    }`}>
                      {inv.tipo_conta === "PJ" ? "PJ Business" : "PF Personal"}
                    </span>
                  </div>

                  <div className="font-headline-md text-headline-md text-secondary mb-2 font-bold">
                    R$ {inv.saldo_acumulado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>

                  <div className="text-xs text-on-surface-variant">
                    Tipo: {tipoInvestMap[inv.tipo_investimento]}
                  </div>

                  <div className="mt-3 pt-3 border-t border-outline-variant/40 text-xs text-on-surface-variant flex justify-between">
                    <span>Aporte Mensal Planejado:</span>
                    <span className="font-semibold text-on-surface">
                      R$ {inv.meta_aporte_mensal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>

      {/* COLUNA DIREITA: Simulador de Saldo Líquido (4 colunas) */}
      <div className="lg:col-span-4">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm sticky top-24">
          <div className="text-center mb-6">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1 font-bold">
              Simulador de Destinação
            </h2>
            <div className="text-xs text-on-surface-variant uppercase tracking-wider">
              Lucro Líquido do Mês Atual
            </div>
            <div className="font-headline-lg text-headline-lg text-primary font-extrabold mt-1">
              R$ {lucroLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Barra Visual Colorida */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-on-surface-variant mb-2">
              <span>Alocado: {totalPct}%</span>
              <span>Restante: {100 - totalPct}%</span>
            </div>
            <div className="h-3 w-full flex rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/30">
              <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${giroPct}%` }}></div>
              <div className="bg-teal-500 h-full transition-all duration-300" style={{ width: `${transferenciaPct}%` }}></div>
              <div className="bg-error h-full transition-all duration-300" style={{ width: `${dividasPct}%` }}></div>
              <div className="bg-secondary h-full transition-all duration-300" style={{ width: `${investPct}%` }}></div>
            </div>
          </div>

          {/* Sliders de Distribuição */}
          <div className="flex flex-col gap-5">
            {/* Slider 1: Capital de Giro */}
            <div>
              <div className="flex justify-between text-body-md mb-1">
                <div className="flex items-center gap-1.5 font-medium text-on-surface">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  Giro Caixa PJ
                </div>
                <span className="font-mono-sm font-semibold">
                  R$ {((lucroLiquido * giroPct) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} ({giroPct}%)
                </span>
              </div>
              <input
                className="w-full accent-indigo-500 h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer"
                max="100"
                min="0"
                type="range"
                value={giroPct}
                onChange={(e) => handleSliderChange("giro", parseInt(e.target.value))}
              />
            </div>

            {/* Slider 2: Transferência PF / Pró-labore */}
            <div>
              <div className="flex justify-between text-body-md mb-1">
                <div className="flex items-center gap-1.5 font-medium text-on-surface">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                  Retirada Pro-Labore PF
                </div>
                <span className="font-mono-sm font-semibold">
                  R$ {((lucroLiquido * transferenciaPct) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} ({transferenciaPct}%)
                </span>
              </div>
              <input
                className="w-full accent-teal-500 h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer"
                max="100"
                min="0"
                type="range"
                value={transferenciaPct}
                onChange={(e) => handleSliderChange("transf", parseInt(e.target.value))}
              />
            </div>

            {/* Slider 3: Quitação de Dívidas */}
            <div>
              <div className="flex justify-between text-body-md mb-1">
                <div className="flex items-center gap-1.5 font-medium text-on-surface">
                  <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                  Acelerar Dívidas PF
                </div>
                <span className="font-mono-sm font-semibold">
                  R$ {((lucroLiquido * dividasPct) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} ({dividasPct}%)
                </span>
              </div>
              <input
                className="w-full accent-error h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer"
                max="100"
                min="0"
                type="range"
                value={dividasPct}
                onChange={(e) => handleSliderChange("divida", parseInt(e.target.value))}
              />
            </div>

            {/* Slider 4: Investimentos */}
            <div>
              <div className="flex justify-between text-body-md mb-1">
                <div className="flex items-center gap-1.5 font-medium text-on-surface">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  Investimentos PF/PJ
                </div>
                <span className="font-mono-sm font-semibold">
                  R$ {((lucroLiquido * investPct) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} ({investPct}%)
                </span>
              </div>
              <input
                className="w-full accent-secondary h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer"
                max="100"
                min="0"
                type="range"
                value={investPct}
                onChange={(e) => handleSliderChange("invest", parseInt(e.target.value))}
              />
            </div>
          </div>

          <button
            onClick={() => alert(`Destinação de lucros aplicada no simulador! Giro: R$ ${((lucroLiquido * giroPct) / 100).toFixed(2)}, Retirada: R$ ${((lucroLiquido * transferenciaPct) / 100).toFixed(2)}`)}
            className="w-full mt-6 bg-primary text-on-primary py-2.5 rounded-lg font-label-md hover:bg-primary-container transition-colors shadow-sm cursor-pointer font-semibold text-sm"
          >
            Aplicar Destinação
          </button>
        </section>
      </div>

      {/* --- MODAL ADICIONAR DÍVIDA --- */}
      {showDividaModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div onClick={() => setShowDividaModal(false)} className="absolute inset-0 bg-on-background/25 backdrop-blur-sm"></div>
          
          <div className="absolute w-full max-w-[500px] bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg flex flex-col z-10">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Nova Dívida Ativa</h3>
              <button onClick={() => setShowDividaModal(false)} className="text-outline hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveDivida} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Credor / Origem</label>
                <input
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md text-on-surface"
                  placeholder="Ex: Banco do Brasil, Empréstimo"
                  required
                  value={credor}
                  onChange={(e) => setCredor(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Valor Total (R$)</label>
                  <input
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md font-mono-sm text-on-surface"
                    type="number"
                    placeholder="12000,00"
                    required
                    value={valorTotalDiv}
                    onChange={(e) => setValorTotalDiv(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Valor da Parcela (R$)</label>
                  <input
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md font-mono-sm text-on-surface"
                    type="number"
                    placeholder="500,00"
                    required
                    value={valorParcelaDiv}
                    onChange={(e) => setValorParcelaDiv(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Total Parcelas</label>
                  <input
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md text-on-surface"
                    type="number"
                    placeholder="24"
                    required
                    value={parcelasTotaisDiv}
                    onChange={(e) => setParcelasTotaisDiv(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Vencimento Próxima</label>
                  <input
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md text-on-surface cursor-pointer"
                    type="date"
                    value={vencimentoDiv}
                    onChange={(e) => setVencimentoDiv(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Responsabilidade</label>
                <select
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md text-on-surface cursor-pointer"
                  value={tipoContaDiv}
                  onChange={(e) => setTipoContaDiv(e.target.value as any)}
                >
                  <option value="PF">Pessoa Física (PF)</option>
                  <option value="PJ">Pessoa Jurídica (PJ)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDividaModal(false)}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
                >
                  {loading ? "Salvando..." : "Salvar Dívida"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL ADICIONAR INVESTIMENTO --- */}
      {showInvestModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div onClick={() => setShowInvestModal(false)} className="absolute inset-0 bg-on-background/25 backdrop-blur-sm"></div>
          
          <div className="absolute w-full max-w-[500px] bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg flex flex-col z-10">
            <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Nova Aplicação / Ativo</h3>
              <button onClick={() => setShowInvestModal(false)} className="text-outline hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveInvestimento} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Nome do Ativo</label>
                <input
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md text-on-surface"
                  placeholder="Ex: CDB Liquidez Diária, Tesouro Direto"
                  required
                  value={nomeAtivo}
                  onChange={(e) => setNomeAtivo(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Saldo Acumulado (R$)</label>
                  <input
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md font-mono-sm text-on-surface"
                    type="number"
                    placeholder="3000,00"
                    value={saldoAcumulado}
                    onChange={(e) => setSaldoAcumulado(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Meta Aporte Mensal (R$)</label>
                  <input
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md font-mono-sm text-on-surface"
                    type="number"
                    placeholder="200,00"
                    value={metaAporte}
                    onChange={(e) => setMetaAporte(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Tipo Investimento</label>
                  <select
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md text-on-surface cursor-pointer"
                    value={tipoInvest}
                    onChange={(e) => setTipoInvest(e.target.value as any)}
                  >
                    <option value="reserva_emergencia">Reserva Emergência</option>
                    <option value="renda_fixa">Renda Fixa</option>
                    <option value="renda_variavel">Renda Variável</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Origem Caixa</label>
                  <select
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md text-on-surface cursor-pointer"
                    value={tipoContaInvest}
                    onChange={(e) => setTipoContaInvest(e.target.value as any)}
                  >
                    <option value="PF">PF - Personal</option>
                    <option value="PJ">PJ - Business</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowInvestModal(false)}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
                >
                  {loading ? "Salvando..." : "Salvar Investimento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
