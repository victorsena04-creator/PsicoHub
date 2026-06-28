"use client";

import { useState } from "react";

interface CategoriaAgrupada {
  categoria: string;
  total: number;
}

interface GraficosDashboardProps {
  entradasTotal: number;
  saidasTotal: number;
  saldoTotal: number;
  despesasCategorias: CategoriaAgrupada[];
  receitasCategorias: CategoriaAgrupada[];
  filtroAtivo: string;
}

export function GraficosDashboard({
  entradasTotal,
  saidasTotal,
  saldoTotal,
  despesasCategorias,
  receitasCategorias,
  filtroAtivo,
}: GraficosDashboardProps) {
  const [tabAtiva, setTabAtiva] = useState<"despesas" | "receitas">("despesas");

  // Mapeamentos em português
  const categoriasDespesasMap: { [key: string]: string } = {
    aluguel: "Aluguel / Sala",
    internet: "Internet / Telefone",
    marketing: "Marketing / Ads",
    impostos: "Impostos / DAS",
    ferramentas: "Ferramentas / Apps",
    alimentacao: "Alimentação",
    outros: "Outros Gastos",
  };

  const categoriasReceitasMap: { [key: string]: string } = {
    atendimento: "Atendimento Clínico",
    supervisao: "Supervisão",
    palestra: "Palestras / Cursos",
    outros: "Outros Recebimentos",
  };

  // 1. Cálculos para a Rosca SVG (Fluxo de Caixa)
  const totalGeral = entradasTotal + saidasTotal;
  const percentEntradas = totalGeral > 0 ? (entradasTotal / totalGeral) * 100 : 0;
  const percentSaidas = totalGeral > 0 ? (saidasTotal / totalGeral) * 100 : 0;

  // Circunferência para raio 50 = 2 * PI * 50 = 314
  const circunferencia = 314;
  const entradasDash = (percentEntradas / 100) * circunferencia;
  const saidasDash = (percentSaidas / 100) * circunferencia;

  // 2. Cálculos para a lista de categorias do gráfico de barras horizontais
  const categoriasAtuais = tabAtiva === "despesas" ? despesasCategorias : receitasCategorias;
  const mapaNomesAtuais = tabAtiva === "despesas" ? categoriasDespesasMap : categoriasReceitasMap;
  const corBarraAtiva = tabAtiva === "despesas" ? "bg-error" : "bg-secondary";

  // Encontrar o maior valor absoluto para servir de base 100% de largura
  const maiorValor = categoriasAtuais.reduce((max, item) => (item.total > max ? item.total : max), 0);

  // Valor total absoluto acumulado da lista de categorias exibida
  const somaCategorias = categoriasAtuais.reduce((soma, item) => soma + item.total, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
      {/* CARD 1 (Bento Box): Distribuição por Categorias (8 Colunas) */}
      <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
        <div>
          {/* Cabeçalho da Tab de Categorias */}
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-outline-variant/60">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Gastos e Receitas por Categoria
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Proporção detalhada dos lançamentos de caixa
              </p>
            </div>
            {/* Seletor Despesas / Receitas */}
            <div className="flex bg-surface-container p-1 rounded-lg border border-outline-variant">
              <button
                onClick={() => setTabAtiva("despesas")}
                className={`px-3 py-1 rounded-md font-label-sm text-label-sm transition-all cursor-pointer ${
                  tabAtiva === "despesas"
                    ? "bg-surface-container-lowest text-error font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Despesas
              </button>
              <button
                onClick={() => setTabAtiva("receitas")}
                className={`px-3 py-1 rounded-md font-label-sm text-label-sm transition-all cursor-pointer ${
                  tabAtiva === "receitas"
                    ? "bg-surface-container-lowest text-secondary font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Receitas
              </button>
            </div>
          </div>

          {/* Listagem de Barras Horizontais */}
          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
            {categoriasAtuais.length === 0 ? (
              <div className="text-center text-on-surface-variant py-8 font-body-md text-xs">
                Nenhum lançamento registrado nesta categoria para o filtro selecionado.
              </div>
            ) : (
              categoriasAtuais.map((item) => {
                const nomeCategoria = mapaNomesAtuais[item.categoria] || item.categoria;
                const percentDoMaior = maiorValor > 0 ? (item.total / maiorValor) * 100 : 0;
                const percentDoTotal = somaCategorias > 0 ? (item.total / somaCategorias) * 100 : 0;

                return (
                  <div key={item.categoria} className="space-y-1.5 group">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-on-surface group-hover:text-primary transition-colors">
                        {nomeCategoria}
                      </span>
                      <div className="text-on-surface-variant font-mono-sm">
                        R$ {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] opacity-75 font-normal">
                          ({percentDoTotal.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    {/* Barra de Progresso */}
                    <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${corBarraAtiva}`}
                        style={{ width: `${percentDoMaior}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CARD 2 (Bento Box): Fluxo de Caixa / Rosca SVG (5 Colunas) */}
      <div className="col-span-12 lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Resumo do Fluxo de Caixa
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5 border-b border-outline-variant/60 pb-3 mb-6">
            Comparativo entre entradas e saídas
          </p>

          <div className="flex items-center justify-around gap-4">
            {/* Gráfico de Rosca SVG */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              {totalGeral === 0 ? (
                // Círculo Cinza de Fallback se não houver dados
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    className="stroke-surface-container-high"
                    strokeWidth="12"
                    fill="transparent"
                  />
                </svg>
              ) : (
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  {/* Segmento 1: Entradas (Verde/Secondary) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    className="stroke-secondary"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={`${entradasDash} ${circunferencia}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                  />
                  {/* Segmento 2: Saídas (Vermelho/Error) */}
                  {saidasTotal > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="stroke-error"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${saidasDash} ${circunferencia}`}
                      strokeDashoffset={-entradasDash}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              )}

              {/* Informação Centralizada */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
                  Lucro Líquido
                </span>
                <span
                  className={`font-headline-sm text-[15px] font-extrabold ${
                    saldoTotal >= 0 ? "text-secondary" : "text-error"
                  }`}
                >
                  {saldoTotal >= 0 ? "+" : "-"} R${" "}
                  {Math.abs(saldoTotal).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* Legenda dos Dados */}
            <div className="space-y-4 text-xs font-semibold">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-secondary">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  <span>Entradas (Pix/Pix Paciente)</span>
                </div>
                <span className="text-[13px] text-on-surface font-mono-sm pl-4 font-bold">
                  R$ {entradasTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  <span className="text-[10px] font-normal text-on-surface-variant ml-1">
                    ({percentEntradas.toFixed(0)}%)
                  </span>
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-error">
                  <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                  <span>Saídas (Gastos/Faturas)</span>
                </div>
                <span className="text-[13px] text-on-surface font-mono-sm pl-4 font-bold">
                  R$ {saidasTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  <span className="text-[10px] font-normal text-on-surface-variant ml-1">
                    ({percentSaidas.toFixed(0)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
