import Link from "next/link";
import { NovoLancamentoModal } from "@/components/financeiro/NovoLancamentoModal";
import { LancamentosTable } from "@/components/financeiro/LancamentosTable";
import { GraficosDashboard } from "@/components/financeiro/GraficosDashboard";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";

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
  const sessao = obterSessao();
  if (!sessao) {
    redirect("/login");
  }

  // Filtros da URL
  const filtro = searchParams.filtro || "consolidado";
  const busca = searchParams.busca || "";

  const now = new Date();
  // Se o parâmetro não foi passado ou for vazio, fica em branco para refletir "Todos os Meses"
  const mes = searchParams.mes !== undefined ? searchParams.mes : "";
  const ano = searchParams.ano !== undefined ? searchParams.ano : "";

  console.log("🔥 [FINANCEIRO PAGE] SESSAO:", sessao, "MES:", mes, "ANO:", ano, "FILTRO:", filtro);

  const tipoContaFiltro = filtro === "consolidado" ? null : filtro.toUpperCase();

  // --- QUERIES NO CLOUD FIRESTORE (Executadas em paralelo) ---
  const [recebimentosSnapshot, despesasSnapshot, pacientesSnapshot] = await Promise.all([
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("recebimentos").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("despesas").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("pacientes").get()
  ]);

  const recebimentos = recebimentosSnapshot.docs.map(doc => doc.data() as any);
  const despesasData = despesasSnapshot.docs.map(doc => doc.data() as any);
  const pacientesMap = new Map(pacientesSnapshot.docs.map(doc => [doc.id, doc.data() as any]));

  // --- PROCESSAMENTO NO SERVIDOR (JS IN-MEMORY) ---

  const filtrarPorMesAno = (dataStr: string) => {
    if (!dataStr) return false;
    if (!mes && !ano) return true; // Visão Geral: Retorna tudo se Todos os Meses estiver selecionado
    const datePart = dataStr.split(" ")[0]; // Pega YYYY-MM-DD
    const [cAno, cMes] = datePart.split("-");
    const matchAno = ano ? cAno === ano : true;
    const matchMes = mes ? cMes === mes : true;
    return matchAno && matchMes;
  };

  // 1. Entradas no mês/período selecionado
  const entradasFiltradas = recebimentos.filter(r => {
    const matchStatus = r.status === "pago" && r.data_pagamento;
    const matchTipo = tipoContaFiltro ? r.tipo_conta === tipoContaFiltro : true;
    const matchData = r.data_pagamento ? filtrarPorMesAno(r.data_pagamento) : false;
    return matchStatus && matchTipo && matchData;
  });
  const entradasTotal = entradasFiltradas.reduce((sum, r) => sum + (r.valor || 0), 0);

  // 2. Saídas no mês/período selecionado
  const saidasFiltradas = despesasData.filter(d => {
    const matchTipo = tipoContaFiltro ? d.tipo_conta === tipoContaFiltro : true;
    const matchData = d.data ? filtrarPorMesAno(d.data) : false;
    return matchTipo && matchData;
  });
  const saidasTotal = saidasFiltradas.reduce((sum, d) => sum + (d.valor || 0), 0);

  // 3. Saldo Atual Geral (Todas as Entradas pagas - Todas as Saídas do caixa selecionado)
  const entradasGeraisTotal = recebimentos
    .filter(r => r.status === "pago" && (tipoContaFiltro ? r.tipo_conta === tipoContaFiltro : true))
    .reduce((sum, r) => sum + (r.valor || 0), 0);

  const saidasGeraisTotal = despesasData
    .filter(d => (tipoContaFiltro ? d.tipo_conta === tipoContaFiltro : true))
    .reduce((sum, d) => sum + (d.valor || 0), 0);

  const saldoTotal = entradasGeraisTotal - saidasGeraisTotal;

  const saldoPeriodoTotal = entradasTotal - saidasTotal;

  // 4. Despesas agrupadas por categoria no período selecionado
  const despesasPorCategoria: Record<string, number> = {};
  saidasFiltradas.forEach(d => {
    const cat = d.categoria || "outros";
    despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + (d.valor || 0);
  });
  const despesasCategorias = Object.keys(despesasPorCategoria).map(cat => ({
    categoria: cat,
    total: despesasPorCategoria[cat]
  }));
  despesasCategorias.sort((a, b) => b.total - a.total);

  // 5. Receitas agrupadas por categoria no período selecionado
  const receitasPorCategoria: Record<string, number> = {};
  entradasFiltradas.forEach(r => {
    const cat = r.categoria || "atendimento";
    receitasPorCategoria[cat] = (receitasPorCategoria[cat] || 0) + (r.valor || 0);
  });
  const receitasCategorias = Object.keys(receitasPorCategoria).map(cat => ({
    categoria: cat,
    total: receitasPorCategoria[cat]
  }));
  receitasCategorias.sort((a, b) => b.total - a.total);

  // 6. União de Lançamentos (UNION ALL simulado)
  const listEntradas = recebimentos
    .filter(r => r.status === "pago" && r.data_pagamento)
    .map(r => {
      const pac = r.paciente_id ? pacientesMap.get(r.paciente_id) : null;
      return {
        direcao: "entrada" as const,
        id: r.id,
        data: r.data_pagamento,
        descricao: `Consulta - ${pac?.nome || "Lançamento Avulso (Extrato)"}`,
        categoria: r.categoria || "atendimento",
        tipo_conta: r.tipo_conta as "PF" | "PJ",
        valor: r.valor || 0
      };
    });

  const listSaidas = despesasData.map(d => ({
    direcao: "saida" as const,
    id: d.id,
    data: d.data,
    descricao: d.descricao,
    categoria: d.categoria || "outros",
    tipo_conta: d.tipo_conta as "PF" | "PJ",
    valor: d.valor || 0
  }));

  // Combinar e aplicar filtros finais (tipo_conta, busca, mes/ano)
  let lancamentos = [...listEntradas, ...listSaidas];

  lancamentos = lancamentos.filter(l => {
    const matchTipo = tipoContaFiltro ? l.tipo_conta === tipoContaFiltro : true;
    const matchData = l.data ? filtrarPorMesAno(l.data) : false;
    
    let matchBusca = true;
    if (busca) {
      const buscaLower = busca.toLowerCase();
      const descLower = (l.descricao || "").toLowerCase();
      const catLower = (l.categoria || "").toLowerCase();
      matchBusca = descLower.includes(buscaLower) || catLower.includes(buscaLower);
    }

    return matchTipo && matchData && matchBusca;
  });

  // Ordenar decrescente por data
  lancamentos.sort((a, b) => b.data.localeCompare(a.data));

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

      {/* Seção de Gráficos Analíticos Dinâmicos */}
      <GraficosDashboard
        entradasTotal={entradasTotal}
        saidasTotal={saidasTotal}
        saldoTotal={saldoPeriodoTotal}
        despesasCategorias={despesasCategorias}
        receitasCategorias={receitasCategorias}
        filtroAtivo={filtro}
      />

      {/* Barra de Filtros e Busca Simplificada */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-6">
        <form method="GET" className="relative w-full">
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
