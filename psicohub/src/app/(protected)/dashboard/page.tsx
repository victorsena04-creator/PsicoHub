import Link from "next/link";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";

// Força o Next.js a não cachear a página estaticamente
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    filtro?: string;
    mes?: string;
    ano?: string;
  };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const sessao = obterSessao();
  if (!sessao) {
    redirect("/login");
  }

  // Filtro de visualização (Consolidado, PF ou PJ) vindo da URL
  const filtro = searchParams.filtro || "consolidado";

  // Mapear o filtro para usar nas queries
  const tipoContaFiltro = filtro === "consolidado" ? null : filtro.toUpperCase();

  // Pegar mês e ano correntes ou vindo dos filtros da URL
  const now = new Date();
  const mes = searchParams.mes !== undefined ? String(searchParams.mes).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
  const ano = searchParams.ano !== undefined ? String(searchParams.ano) : String(now.getFullYear());

  const mesNum = mes ? parseInt(mes, 10) : 0;
  const anoNum = ano ? parseInt(ano, 10) : 0;

  // --- QUERIES NO CLOUD FIRESTORE (Executadas em paralelo) ---
  const [consultasSnapshot, recebimentosSnapshot, despesasSnapshot, metasSnapshot] = await Promise.all([
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("consultas").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("recebimentos").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("despesas").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("metas").get()
  ]);

  const consultas = consultasSnapshot.docs.map(doc => doc.data() as any);
  const recebimentos = recebimentosSnapshot.docs.map(doc => doc.data() as any);
  const despesasData = despesasSnapshot.docs.map(doc => doc.data() as any);
  const metas = metasSnapshot.docs.map(doc => doc.data() as any);

  // --- PROCESSAMENTO E FILTRAGEM DOS DADOS NO SERVIDOR (JS IN-MEMORY) ---

  // Função auxiliar para verificar se uma data corresponde ao mês e ano selecionados
  const filtrarPorMesAno = (dataHoraStr: string) => {
    if (!dataHoraStr) return false;
    const datePart = dataHoraStr.split(" ")[0]; // Pega YYYY-MM-DD
    if (!datePart) return false;
    const [cAno, cMes] = datePart.split("-");
    return cAno === ano && cMes === mes;
  };

  // 1. Faturado (Consultas realizadas no período) - Exclusivo PJ / Consolidado
  let faturado = 0;
  if (filtro === "consolidado" || filtro === "pj") {
    faturado = consultas
      .filter(c => c.status === "realizada" && filtrarPorMesAno(c.data_hora))
      .reduce((sum, c) => sum + (c.valor || 0), 0);
  }

  // 2. Recebido (Recebimentos com status 'pago' no período)
  const recebido = recebimentos
    .filter(r => {
      const matchStatus = r.status === "pago" && r.data_pagamento;
      const matchTipo = tipoContaFiltro ? r.tipo_conta === tipoContaFiltro : true;
      const matchData = r.data_pagamento ? filtrarPorMesAno(r.data_pagamento) : false;
      return matchStatus && matchTipo && matchData;
    })
    .reduce((sum, r) => sum + (r.valor || 0), 0);

  // 3. A Receber (Recebimentos pendentes ou atrasados geral)
  const aReceber = recebimentos
    .filter(r => {
      const matchStatus = r.status === "pendente" || r.status === "atrasado";
      const matchTipo = tipoContaFiltro ? r.tipo_conta === tipoContaFiltro : true;
      return matchStatus && matchTipo;
    })
    .reduce((sum, r) => sum + (r.valor || 0), 0);

  // 4. Previsto (Consultas agendadas ou realizadas no período) - Exclusivo PJ / Consolidado
  let previsto = 0;
  if (filtro === "consolidado" || filtro === "pj") {
    previsto = consultas
      .filter(c => (c.status === "agendada" || c.status === "realizada") && filtrarPorMesAno(c.data_hora))
      .reduce((sum, c) => sum + (c.valor || 0), 0);
  }

  // 5. Despesas (Gasto total no período)
  const despesas = despesasData
    .filter(d => {
      const matchTipo = tipoContaFiltro ? d.tipo_conta === tipoContaFiltro : true;
      const matchData = d.data ? filtrarPorMesAno(d.data) : false;
      return matchTipo && matchData;
    })
    .reduce((sum, d) => sum + (d.valor || 0), 0);

  // 6. Lucro Líquido (Recebido - Despesas)
  const lucroLiquido = recebido - despesas;

  // --- MÉTRICAS DA AGENDA ---
  const consultasPeriodo = consultas.filter(c => filtrarPorMesAno(c.data_hora));
  let agendadas = 0;
  let realizadas = 0;
  let canceladas = 0;
  let faltas = 0;

  consultasPeriodo.forEach(item => {
    if (item.status === 'agendada') agendadas++;
    else if (item.status === 'realizada') realizadas++;
    else if (item.status === 'cancelada') canceladas++;
    else if (item.status === 'falta') faltas++;
  });

  // O total de agendadas para o mês inclui as que vão acontecer e as que já aconteceram
  const totalAgendadasMes = agendadas + realizadas + canceladas + faltas;
  
  // Taxa de Comparecimento = Realizadas / (Realizadas + Faltas)
  const totalComparecimento = realizadas + faltas;
  const taxaComparecimento = totalComparecimento > 0 
    ? Math.round((realizadas / totalComparecimento) * 100)
    : 0;

  // --- METAS E TETOS DO MÊS ---
  const metaMes = metas.find(m => m.mes === mesNum && m.ano === anoNum);
  const metaProlabore = metaMes?.meta_prolabore || 0;
  const metaDespesas = metaMes?.meta_despesas || 0;

  // Progresso faturamento PJ
  const progressoPJ = metaProlabore > 0 ? Math.min(Math.round((recebido / metaProlabore) * 100), 100) : 0;
  
  // Despesas PF no período
  const totalDespesasPF = despesasData
    .filter(d => d.tipo_conta === 'PF' && d.data && filtrarPorMesAno(d.data))
    .reduce((sum, d) => sum + (d.valor || 0), 0);
  
  const progressoPF = metaDespesas > 0 ? Math.min(Math.round((totalDespesasPF / metaDespesas) * 100), 100) : 0;

  // Mapear nome de mês formatado para exibir nos títulos
  const nomeMesStr = mes ? new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleDateString("pt-BR", { month: "long" }) : "Todos";
  const labelPeriodo = mes ? `${nomeMesStr.charAt(0).toUpperCase() + nomeMesStr.slice(1)} de ${ano}` : "Geral";

  return (
    <div className="w-full">
      {/* Cabeçalho da Página com MesFiltroHeader */}
      <MesFiltroHeader
        titulo="Dashboard"
        subtitulo="Visão geral dos seus indicadores clínicos e financeiros do consultório."
        actionButton={
          /* Seletor de Caixa (Filtro PF/PJ) */
          <div className="bg-surface-container-low p-1 rounded-lg inline-flex border border-outline-variant">
            <Link
              href={`?filtro=consolidado&mes=${mes}&ano=${ano}`}
              className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-colors ${
                filtro === "consolidado"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Geral (Consolidado)
            </Link>
            <Link
              href={`?filtro=pf&mes=${mes}&ano=${ano}`}
              className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-colors ${
                filtro === "pf"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Pessoa Física (PF)
            </Link>
            <Link
              href={`?filtro=pj&mes=${mes}&ano=${ano}`}
              className={`px-4 py-1.5 rounded-md font-label-md text-label-md transition-colors ${
                filtro === "pj"
                  ? "bg-surface-container-lowest text-on-surface shadow-sm font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Pessoa Jurídica (PJ)
            </Link>
          </div>
        }
      />

      {/* Seção Financeira (Grelha Bento) */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-on-surface-variant">payments</span>
          <h3 className="font-headline-sm text-headline-sm text-on-background">Visão Financeira</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: Faturado */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:shadow-[0_10px_15px_-3px_rgb(0,0,0,0.05)] transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Faturado (Consultas Realizadas)</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container/10 text-primary uppercase tracking-wider">
                Exclusivo PJ
              </span>
            </div>
            <div className="flex items-end gap-3">
              <span className="font-headline-lg text-headline-lg text-on-surface">
                R$ {faturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card: Recebido */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:shadow-[0_10px_15px_-3px_rgb(0,0,0,0.05)] transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Recebido (Dinheiro em Caixa)</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                filtro === "consolidado" ? "bg-surface-variant text-on-surface-variant" :
                filtro === "pf" ? "bg-secondary-container/20 text-secondary" : "bg-primary-container/10 text-primary"
              }`}>
                {filtro === "consolidado" ? "Consolidado" : filtro === "pf" ? "Pessoal PF" : "Consultório PJ"}
              </span>
            </div>
            <div className="flex items-end gap-3">
              <span className="font-headline-lg text-headline-lg text-on-surface">
                R$ {recebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card: A Receber */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:shadow-[0_10px_15px_-3px_rgb(0,0,0,0.05)] transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">A Receber (Pendentes)</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                filtro === "consolidado" ? "bg-surface-variant text-on-surface-variant" :
                filtro === "pf" ? "bg-secondary-container/20 text-secondary" : "bg-primary-container/10 text-primary"
              }`}>
                {filtro === "consolidado" ? "Consolidado" : filtro === "pf" ? "Pessoal PF" : "Consultório PJ"}
              </span>
            </div>
            <div className="flex items-end gap-3">
              <span className="font-headline-lg text-headline-lg text-on-surface">
                R$ {aReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card: Previsto */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:shadow-[0_10px_15px_-3px_rgb(0,0,0,0.05)] transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Previsto (Vencimentos no Mês)</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                filtro === "consolidado" ? "bg-surface-variant text-on-surface-variant" :
                filtro === "pf" ? "bg-secondary-container/20 text-secondary" : "bg-primary-container/10 text-primary"
              }`}>
                {filtro === "consolidado" ? "Consolidado" : filtro === "pf" ? "Pessoal PF" : "Consultório PJ"}
              </span>
            </div>
            <div className="flex items-end gap-3">
              <span className="font-headline-lg text-headline-lg text-on-surface">
                R$ {previsto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card: Despesas */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:shadow-[0_10px_15px_-3px_rgb(0,0,0,0.05)] transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Despesas (Saídas do Mês)</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                filtro === "consolidado" ? "bg-surface-variant text-on-surface-variant" :
                filtro === "pf" ? "bg-secondary-container/20 text-secondary" : "bg-primary-container/10 text-primary"
              }`}>
                {filtro === "consolidado" ? "Consolidado" : filtro === "pf" ? "Pessoal PF" : "Consultório PJ"}
              </span>
            </div>
            <div className="flex items-end gap-3">
              <span className="font-headline-lg text-headline-lg text-on-surface text-error">
                R$ {despesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Card: Lucro Líquido */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:shadow-[0_10px_15px_-3px_rgb(0,0,0,0.05)] transition-shadow bg-gradient-to-br from-surface-container-lowest to-surface-container-low">
            <div className="flex justify-between items-start mb-4">
              <span className="font-label-md text-label-md text-on-surface-variant">Saldo Líquido</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                filtro === "consolidado" ? "bg-surface-variant text-on-surface-variant" :
                filtro === "pf" ? "bg-secondary-container/20 text-secondary" : "bg-primary-container/10 text-primary"
              }`}>
                {filtro === "consolidado" ? "Consolidado" : filtro === "pf" ? "Pessoal PF" : "Consultório PJ"}
              </span>
            </div>
            <div className="flex items-end gap-3">
              <span className={`font-headline-lg text-headline-lg ${lucroLiquido >= 0 ? "text-secondary" : "text-error"}`}>
                R$ {lucroLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Secundária: Agenda e Metas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Seção da Agenda */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-on-surface-variant">calendar_month</span>
            <h3 className="font-headline-sm text-headline-sm text-on-background">Indicadores da Agenda ({labelPeriodo})</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col justify-center items-center text-center h-28 hover:shadow-sm transition-shadow">
              <span className="font-headline-md text-headline-md text-on-surface">{totalAgendadasMes}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-1">
                Agendadas
              </span>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col justify-center items-center text-center h-28 hover:shadow-sm transition-shadow">
              <span className="font-headline-md text-headline-md text-on-surface text-secondary">{realizadas}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-1">
                Realizadas
              </span>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col justify-center items-center text-center h-28 hover:shadow-sm transition-shadow">
              <span className="font-headline-md text-headline-md text-on-surface text-amber-500">{canceladas}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-1">
                Canceladas
              </span>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col justify-center items-center text-center h-28 hover:shadow-sm transition-shadow">
              <span className="font-headline-md text-headline-md text-on-surface text-error">{faltas}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-1">
                Faltas
              </span>
            </div>
            <div className="col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex justify-between items-center h-16">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                Taxa de Comparecimento
              </span>
              <span className="font-headline-sm text-headline-sm text-secondary font-bold">
                {taxaComparecimento}%
              </span>
            </div>
          </div>
        </section>

        {/* Seção de Metas & Limites */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-on-surface-variant">track_changes</span>
            <h3 className="font-headline-sm text-headline-sm text-on-background">Metas &amp; Limites Financeiros ({labelPeriodo})</h3>
          </div>
          <div className="flex flex-col gap-6">
            {/* Meta PJ */}
            {(filtro === "consolidado" || filtro === "pj") && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative overflow-hidden hover:shadow-sm transition-shadow">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">
                      Meta de Retirada / Faturamento PJ
                    </h4>
                    <span className="font-headline-sm text-headline-sm text-on-surface">
                      R$ {recebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}{" "}
                      <span className="text-on-surface-variant font-body-md text-body-md">
                        / R$ {metaProlabore.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </span>
                  </div>
                  <span className="font-label-md text-label-md text-primary font-bold">{progressoPJ}%</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-350"
                    style={{ width: `${progressoPJ}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Teto PF */}
            {(filtro === "consolidado" || filtro === "pf") && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative overflow-hidden hover:shadow-sm transition-shadow">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">
                      Teto de Gastos Pessoais PF
                    </h4>
                    <span className="font-headline-sm text-headline-sm text-on-surface">
                      R$ {totalDespesasPF.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}{" "}
                      <span className="text-on-surface-variant font-body-md text-body-md">
                        / R$ {metaDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </span>
                  </div>
                  <span className={`font-label-md text-label-md font-bold ${
                    progressoPF > 90 ? "text-error" : progressoPF > 75 ? "text-amber-500" : "text-secondary"
                  }`}>
                    {progressoPF}%
                  </span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-350 ${
                      progressoPF > 90 ? "bg-error" : progressoPF > 75 ? "bg-amber-500" : "bg-secondary"
                    }`}
                    style={{ width: `${progressoPF}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}