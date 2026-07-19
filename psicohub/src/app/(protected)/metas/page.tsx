import { MetasForm } from "@/components/metas/MetasForm";
import { MesFiltroHeader } from "@/components/shared/MesFiltroHeader";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    mes?: string;
    ano?: string;
  };
}

const mesesMap: { [key: string]: string } = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro"
};

export default async function MetasPage({ searchParams }: PageProps) {
  const sessao = obterSessao();
  if (!sessao) {
    redirect("/login");
  }

  const now = new Date();
  
  // Pegar mês e ano a partir dos parâmetros de busca
  const mesStr = searchParams.mes !== undefined ? searchParams.mes : String(now.getMonth() + 1).padStart(2, "0");
  const anoStr = searchParams.ano !== undefined ? searchParams.ano : String(now.getFullYear());

  // As metas requerem um mês e ano específicos, se vier "Todos" (vazio) colocamos o mês/ano corrente como fallback
  const mesFinal = mesStr || String(now.getMonth() + 1).padStart(2, "0");
  const anoFinal = anoStr || String(now.getFullYear());

  const mesNum = parseInt(mesFinal, 10);
  const anoNum = parseInt(anoFinal, 10);

  // --- QUERIES NO CLOUD FIRESTORE (Executadas em paralelo) ---
  const [metasSnapshot, recebimentosSnapshot, despesasSnapshot] = await Promise.all([
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("metas").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("recebimentos").get(),
    firestore.collection("consultorios").doc(sessao.consultorioId).collection("despesas").get()
  ]);

  const metas = metasSnapshot.docs.map(doc => doc.data() as any);
  const recebimentos = recebimentosSnapshot.docs.map(doc => doc.data() as any);
  const despesasData = despesasSnapshot.docs.map(doc => doc.data() as any);

  // --- PROCESSAMENTO NO SERVIDOR (JS IN-MEMORY) ---

  const filtrarPorMesAno = (dataStr: string) => {
    if (!dataStr) return false;
    const datePart = dataStr.split(" ")[0]; // Pega YYYY-MM-DD
    const [cAno, cMes] = datePart.split("-");
    return cAno === anoFinal && cMes === mesFinal;
  };

  // 1. Buscar metas do período selecionado
  const metaPeriodo = metas.find(m => m.mes === mesNum && m.ano === anoNum);
  const metaProlabore = metaPeriodo?.meta_prolabore || 0;
  const metaDespesas = metaPeriodo?.meta_despesas || 0;

  // 2. Calcular total recebido no caixa PJ no período selecionado
  const recebidoPJ = recebimentos
    .filter(r => r.status === "pago" && r.tipo_conta === "PJ" && r.data_pagamento && filtrarPorMesAno(r.data_pagamento))
    .reduce((sum, r) => sum + (r.valor || 0), 0);

  // 3. Calcular total de despesas pessoais PF no período selecionado
  const despesasPF = despesasData
    .filter(d => d.tipo_conta === "PF" && d.data && filtrarPorMesAno(d.data))
    .reduce((sum, d) => sum + (d.valor || 0), 0);

  // Obter texto amigável do período selecionado
  const mesNome = mesesMap[mesFinal] || mesFinal;
  const mesTexto = `${mesNome} de ${anoFinal}`;

  return (
    <div className="w-full">
      {/* Cabeçalho da Página via MesFiltroHeader */}
      <MesFiltroHeader
        titulo="Metas &amp; Limites"
        subtitulo="Defina e acompanhe suas metas de retirada e tetos de gastos para o período."
      />

      {/* Componente de formulário e controle de metas */}
      <MetasForm
        metaProlaboreInicial={metaProlabore}
        metaDespesasInicial={metaDespesas}
        recebidoPJ={recebidoPJ}
        despesasPF={despesasPF}
        mesTexto={mesTexto}
        mes={mesNum}
        ano={anoNum}
      />
    </div>
  );
}
