import db from "@/lib/db";
import Link from "next/link";
import { NovoLancamentoModal } from "@/components/financeiro/NovoLancamentoModal";
import { LancamentosTable } from "@/components/financeiro/LancamentosTable";
import { GraficosDashboard } from "@/components/financeiro/GraficosDashboard";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    filtro?: string;
    mes?: string;
    ano?: string;
    busca?: string;
  };
}

interface Lancamento {
  direcao: "entrada" | "saida";
  id: string;
  data: string;
  descricao: string;
  categoria: string;
  tipo_conta: "PF" | "PJ";
  valor: number;
}

export default async function FinanceiroPage({ searchParams }: PageProps) {
  // Filtros da URL
  const filtro = searchParams.filtro || "consolidado";
  const busca = searchParams.busca || "";

  const now = new Date();
  // Inicialização padrão do filtro de mês e ano
  const mes = searchParams.mes !== undefined ? searchParams.mes : String(now.getMonth() + 1).padStart(2, '0');
  const ano = searchParams.ano !== undefined ? searchParams.ano : String(now.getFullYear());

  const tipoContaFiltro = filtro === "consolidado" ? null : filtro.toUpperCase();

  // Filtros SQL dinâmicos baseados no Mês e Ano
  let dateFilterRecebimentos = "";
  let dateFilterDespesas = "";
  const queryParamsRecebimentos: any[] = [];
  const queryParamsDespesas: any[] = [];

  if (mes) {
    dateFilterRecebimentos += " AND strftime('%m', data_pagamento) = ?";
    dateFilterDespesas += " AND strftime('%m', data) = ?";
    queryParamsRecebimentos.push(mes);
    queryParamsDespesas.push(mes);
  }
  if (ano) {
    dateFilterRecebimentos += " AND strftime('%Y', data_pagamento) = ?";
    dateFilterDespesas += " AND strftime('%Y', data) = ?";
    queryParamsRecebimentos.push(ano);
    queryParamsDespesas.push(ano);
  }

  // --- QUERIES DOS INDICADORES FINANCEIROS ---

  // 1. Entradas no mês/período selecionado
  const queryEntradas = `
    SELECT SUM(valor) as total FROM recebimentos 
    WHERE status = 'pago' AND data_pagamento IS NOT NULL
      ${tipoContaFiltro ? `AND tipo_conta = '${tipoContaFiltro}'` : ''}
      ${dateFilterRecebimentos}
  `;
  const resEntradas = db.prepare(queryEntradas).get(queryParamsRecebimentos) as { total: number | null };
  const entradasTotal = resEntradas?.total || 0;

  // 2. Saídas no mês/período selecionado
  const querySaidas = `
    SELECT SUM(valor) as total FROM despesas 
    WHERE 1=1
      ${tipoContaFiltro ? `AND tipo_conta = '${tipoContaFiltro}'` : ''}
      ${dateFilterDespesas}
  `;
  const resSaidas = db.prepare(querySaidas).get(queryParamsDespesas) as { total: number | null };
  const saidasTotal = resSaidas?.total || 0;

  // 3. Saldo Atual (Entradas - Saídas acumuladas gerais do banco)
  // Para ser realista, o Saldo Acumulado soma todas as entradas pagas menos todas as despesas da conta selecionada
  const queryEntradasGerais = `
    SELECT SUM(valor) as total FROM recebimentos 
    WHERE status = 'pago'
      ${tipoContaFiltro ? `AND tipo_conta = '${tipoContaFiltro}'` : ''}
  `;
  const querySaidasGerais = `
    SELECT SUM(valor) as total FROM despesas 
    ${tipoContaFiltro ? `WHERE tipo_conta = '${tipoContaFiltro}'` : ''}
  `;
  const resEntradasGerais = db.prepare(queryEntradasGerais).get() as { total: number | null };
  const resSaidasGerais = db.prepare(querySaidasGerais).get() as { total: number | null };
  
  const saldoTotal = (resEntradasGerais?.total || 0) - (resSaidasGerais?.total || 0);

  // --- QUERIES DE GRÁFICOS E AGREGADOS ---
  // 1. Entradas no período selecionado (já calculado via queryEntradas)
  const entradasPeriodoTotal = entradasTotal;

  // 2. Saídas no período selecionado (já calculado via querySaidas)
  const saidasPeriodoTotal = saidasTotal;

  const saldoPeriodoTotal = entradasPeriodoTotal - saidasPeriodoTotal;

  // 3. Despesas agrupadas por categoria no período selecionado
  const queryDespesasCategorias = `
    SELECT categoria, SUM(valor) as total FROM despesas
    WHERE 1=1
      ${tipoContaFiltro ? `AND tipo_conta = '${tipoContaFiltro}'` : ''}
      ${dateFilterDespesas}
    GROUP BY categoria
    ORDER BY total DESC
  `;
  const despesasCategorias = db.prepare(queryDespesasCategorias).all(queryParamsDespesas) as { categoria: string; total: number }[];

  // 4. Receitas agrupadas por categoria no período selecionado
  const queryReceitasCategorias = `
    SELECT COALESCE(categoria, 'atendimento') as categoria, SUM(valor) as total FROM recebimentos
    WHERE status = 'pago' AND data_pagamento IS NOT NULL
      ${tipoContaFiltro ? `AND tipo_conta = '${tipoContaFiltro}'` : ''}
      ${dateFilterRecebimentos}
    GROUP BY categoria
    ORDER BY total DESC
  `;
  const receitasCategorias = db.prepare(queryReceitasCategorias).all(queryParamsRecebimentos) as { categoria: string; total: number }[];

  const queryLancamentos = `
    SELECT * FROM (
      SELECT 
        'entrada' as direcao,
        r.id,
        r.data_pagamento as data,
        'Consulta - ' || COALESCE(p.nome, 'Lançamento Avulso (Extrato)') as descricao,
        COALESCE(r.categoria, 'atendimento') as categoria,
        r.tipo_conta,
        r.valor
      FROM recebimentos r
      LEFT JOIN pacientes p ON r.paciente_id = p.id
      WHERE r.status = 'pago' AND r.data_pagamento IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'saida' as direcao,
        d.id,
        d.data as data,
        d.descricao,
        d.categoria,
        d.tipo_conta,
        d.valor
      FROM despesas d
    )
    WHERE 1=1
      ${tipoContaFiltro ? `AND tipo_conta = '${tipoContaFiltro}'` : ''}
      ${busca ? `AND (descricao LIKE '%${busca}%' OR categoria LIKE '%${busca}%')` : ''}
      ${mes ? "AND strftime('%m', data) = ?" : ""}
      ${ano ? "AND strftime('%Y', data) = ?" : ""}
    ORDER BY data DESC
  `;

  // Mapear parâmetros da query UNION ALL
  const queryParamsLancamentos: any[] = [];
  if (mes) queryParamsLancamentos.push(mes);
  if (ano) queryParamsLancamentos.push(ano);

  const lancamentos = db.prepare(queryLancamentos).all(queryParamsLancamentos) as Lancamento[];

  // Mapeador de categorias em português para ficar visualmente polido
  const categoriasMap: { [key: string]: string } = {
    aluguel: "Aluguel / Sala",
    internet: "Internet / Telefone",
    marketing: "Marketing / Ads",
    impostos: "Impostos / DAS",
    ferramentas: "Ferramentas / Apps",
    alimentacao: "Alimentação",
    outros: "Outros Gastos",
    Atendimento: "Atendimento Clínico",
  };

  return (
    <div className="w-full">
      {/* Cabeçalho do Módulo Financeiro com MesFiltroHeader */}
      <MesFiltroHeader
        titulo="Controle Financeiro"
        subtitulo="Gerencie os lançamentos de fluxo de caixa unificados ou separados por conta."
        actionButton={
          <div className="flex items-center gap-3">
            <Link
              href="/despesas?tab=extratos"
              className="bg-surface hover:bg-surface-container-high border border-outline-variant text-on-surface font-label-md text-label-md py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                upload_file
              </span>
              Importar Extrato PDF
            </Link>
            <NovoLancamentoModal />
          </div>
        }
      />

      {/* Seletores de Conta (Abas) e Cards de Resumo */}
      <div className="mb-8">
        <div className="border-b border-outline-variant flex gap-6 font-label-md text-label-md mb-8">
          <Link
            href={`?filtro=consolidado&mes=${mes}&ano=${ano}&busca=${busca}`}
            className={`py-3 transition-colors ${
              filtro === "consolidado"
                ? "text-primary border-b-2 border-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Fluxo Consolidado
          </Link>
          <Link
            href={`?filtro=pf&mes=${mes}&ano=${ano}&busca=${busca}`}
            className={`py-3 transition-colors ${
              filtro === "pf"
                ? "text-primary border-b-2 border-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Pessoa Física (PF)
          </Link>
          <Link
            href={`?filtro=pj&mes=${mes}&ano=${ano}&busca=${busca}`}
            className={`py-3 transition-colors ${
              filtro === "pj"
                ? "text-primary border-b-2 border-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Pessoa Jurídica (PJ)
          </Link>
        </div>

        {/* Cards de KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card: Saldo Atual */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Saldo Acumulado</span>
              <div className="w-8 h-8 rounded-full bg-primary-container/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  account_balance
                </span>
              </div>
            </div>
            <span className="font-headline-md text-headline-md font-bold text-on-surface">
              R$ {saldoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Card: Entradas do Mês */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Entradas no Mês</span>
              <div className="w-8 h-8 rounded-full bg-secondary-container/30 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  arrow_downward
                </span>
              </div>
            </div>
            <span className="font-headline-md text-headline-md font-bold text-secondary">
              R$ {entradasTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Card: Saídas do Mês */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Saídas no Mês</span>
              <div className="w-8 h-8 rounded-full bg-error-container/40 text-error flex items-center justify-center">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  arrow_upward
                </span>
              </div>
            </div>
            <span className="font-headline-md text-headline-md font-bold text-error">
              R$ {saidasTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Seção de Gráficos Analíticos Dinâmicos (Visualização Premium Stitch) */}
      <GraficosDashboard
        entradasTotal={entradasPeriodoTotal}
        saidasTotal={saidasPeriodoTotal}
        saldoTotal={saldoPeriodoTotal}
        despesasCategorias={despesasCategorias}
        receitasCategorias={receitasCategorias}
        filtroAtivo={filtro}
      />

      {/* Barra de Filtros e Busca Simplificada */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-6">
        {/* Formulário de Busca Simples na URL */}
        <form method="GET" className="relative w-full">
          {/* Preservar outros filtros */}
          <input type="hidden" name="filtro" value={filtro} />
          {mes && <input type="hidden" name="mes" value={mes} />}
          {ano && <input type="hidden" name="ano" value={ano} />}
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            style={{ fontSize: "18px" }}
          >
            search
          </span>
          <input
            name="busca"
            defaultValue={busca}
            className="w-full border border-outline-variant rounded-lg pl-9 pr-3 py-2 font-body-md text-body-md focus:outline-none focus:border-primary text-on-surface bg-surface-container-lowest"
            placeholder="Buscar lançamentos por descrição ou categoria..."
            type="text"
          />
        </form>
      </div>

      {/* Lista de Transações (Componente Interativo do Cliente) */}
      <LancamentosTable lancamentos={lancamentos} />
    </div>
  );
}
