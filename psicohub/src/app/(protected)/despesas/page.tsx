import { DespesasDashboard } from "@/components/despesas/DespesasDashboard";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface PageProps {
  searchParams: {
    filtro?: string;
    mes?: string;
    ano?: string;
    tab?: string;
  };
}

interface Cartao {
  id: string;
  nome: string;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
  tipo_conta: "PF" | "PJ";
  valor_fatura?: number; // Calculado no servidor
}

interface DespesaExibicao {
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

export default async function DespesasPage({ searchParams }: PageProps) {
  const sessao = obterSessao();
  if (!sessao) {
    redirect("/login");
  }

  // Filtros ativos na URL
  const filtro = searchParams.filtro || "consolidado";
  const tipoContaFiltro = filtro === "pf" ? "PF" : filtro === "pj" ? "PJ" : null;
  const now = new Date();
  
  // Se o parâmetro não foi passado, iniciamos em branco (Geral / Todos os Meses) ou com a seleção do usuário
  const mes = searchParams.mes !== undefined ? searchParams.mes : "";
  const ano = searchParams.ano !== undefined ? searchParams.ano : "";

  console.log("🔥 [DESPESAS PAGE] SESSAO:", sessao, "MES:", mes, "ANO:", ano);
  
  const mesNum = mes ? parseInt(mes, 10) : now.getMonth() + 1;
  const anoNum = ano ? parseInt(ano, 10) : now.getFullYear();

  const consultorioId = (sessao && sessao.consultorioId) ? sessao.consultorioId : "desperte-psique";

  let despesasData: any[] = [];
  let cartoes: Cartao[] = [];

  try {
    const [despesasSnapshot, cartoesSnapshot] = await Promise.all([
      firestore.collection("consultorios").doc(consultorioId).collection("despesas").get(),
      firestore.collection("consultorios").doc(consultorioId).collection("cartoes_credito").get()
    ]);

    despesasData = despesasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    cartoes = cartoesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any })) as Cartao[];
  } catch (err) {
    console.error("🚨 Erro ao buscar despesas do consultório no Firestore:", err);
  }

  const cartoesMap = new Map(cartoes.map(c => [c.id, c]));

  // --- PROCESSAMENTO NO SERVIDOR (JS IN-MEMORY) ---

  const filtrarPorMesAno = (dataStr: string) => {
    if (!dataStr) return false;
    if (!mes && !ano) return true; // Visão Geral: Exibe tudo sem filtrar mês/ano
    const datePart = dataStr.split(" ")[0]; // Pega YYYY-MM-DD
    const [cAno, cMes] = datePart.split("-");
    const matchAno = ano ? cAno === ano : true;
    const matchMes = mes ? cMes === mes : true;
    return matchAno && matchMes;
  };

  // 1. Filtrar e mapear despesas
  let despesas = despesasData.map(d => {
    const cartao = d.cartao_id ? cartoesMap.get(d.cartao_id) : null;
    return {
      id: d.id,
      descricao: d.descricao,
      valor: d.valor || 0,
      data: d.data,
      categoria: d.categoria || "outros",
      origem: d.origem || "manual",
      tipo_conta: d.tipo_conta,
      meio_pagamento: d.meio_pagamento,
      cartao_id: d.cartao_id || null,
      cartao_nome: cartao?.nome || null,
      fatura_mes: d.fatura_mes || null,
      fatura_ano: d.fatura_ano || null
    } as DespesaExibicao;
  });

  // Aplicar filtros
  despesas = despesas.filter(d => {
    const matchTipo = tipoContaFiltro ? d.tipo_conta === tipoContaFiltro : true;
    const matchData = d.data ? filtrarPorMesAno(d.data) : false;
    return matchTipo && matchData;
  });

  // Ordenar despesas por data decrescente
  despesas.sort((a, b) => b.data.localeCompare(a.data));

  // 2. Calcular total de fatura para cada cartão
  const cartoesComFatura = cartoes.map(cartao => {
    const totalFatura = despesasData
      .filter(d => {
        if (d.cartao_id !== cartao.id) return false;
        if (!mes && !ano) return true;
        const matchM = mes ? d.fatura_mes === mesNum : true;
        const matchA = ano ? d.fatura_ano === anoNum : true;
        return matchM && matchA;
      })
      .reduce((sum, d) => sum + (d.valor || 0), 0);

    return {
      ...cartao,
      valor_fatura: totalFatura
    };
  });

  // Ordenar cartões por nome
  cartoesComFatura.sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="w-full">
      {/* Cabeçalho da Página via MesFiltroHeader */}
      <MesFiltroHeader
        titulo="Despesas & Caixa"
        subtitulo="Gerencie seus gastos, faturas de cartão de crédito e conciliação de extratos."
      />

      {/* Componente Cliente que engloba as abas de Despesas, Faturas de Cartão e Importação de Extrato */}
      <DespesasDashboard 
        despesasIniciais={despesas} 
        cartoes={cartoesComFatura} 
        filtroInicial={filtro}
        abaInicial={searchParams.tab as any}
      />
    </div>
  );
}
