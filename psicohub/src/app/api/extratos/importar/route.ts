import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { obterSessao } from "@/lib/sessao";
import { extrairTransacoesDePdf } from "@/lib/pdfExtratoParser";

export const dynamic = 'force-dynamic';

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  try {
    const sessao = obterSessao();
    if (!sessao) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Arquivo PDF não enviado." },
        { status: 400 }
      );
    }

    // 1. Converter arquivo PDF para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Extrair transações usando o leitor nativo em JS (pdf-parse)
    const { transacoes: transacoesBrutas, erros } = await extrairTransacoesDePdf(buffer, file.name);

    if (transacoesBrutas.length === 0) {
      return NextResponse.json({
        success: true,
        status_geral: "aviso",
        transacoes: [],
        erros: erros.length > 0 ? erros : ["Nenhuma transação financeira encontrada no PDF."]
      });
    }

    // 3. Buscar no Firestore as regras de classificação e os termos a ignorar do consultório
    const [regrasSnapshot, ignorarSnapshot] = await Promise.all([
      firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("regras_classificacao")
        .get(),
      firestore
        .collection("consultorios")
        .doc(sessao.consultorioId)
        .collection("termos_ignorar")
        .get()
    ]);

    const regras = regrasSnapshot.docs.map(doc => doc.data() as any);
    const termosIgnorarSet = new Set(ignorarSnapshot.docs.map(doc => normalizarTexto(doc.data().termo || "")));

    const regrasNormalizadas = regras.map(r => ({
      ...r,
      termo_chave_norm: normalizarTexto(r.termo_chave || "")
    }));

    // 4. Enriquecer e classificar transações
    const transacoesClassificadas = transacoesBrutas
      .filter(t => {
        const descNorm = normalizarTexto(t.descricao);
        return !termosIgnorarSet.has(descNorm);
      })
      .map((t, idx) => {
        const descNorm = normalizarTexto(t.descricao);
        let categoria: string | null = null;
        let tipo_conta: "PF" | "PJ" | null = null;
        let regra_id: string | null = null;

        // Procurar correspondência com regras do consultório
        for (const regra of regrasNormalizadas) {
          if (regra.termo_chave_norm && descNorm.includes(regra.termo_chave_norm)) {
            categoria = regra.categoria;
            tipo_conta = regra.tipo_conta;
            regra_id = regra.id;
            break;
          }
        }

        return {
          id: `t-import-${idx}-${Date.now()}`,
          data: t.data,
          descricao: t.descricao,
          valor: t.valor,
          arquivo_origem: t.arquivo_origem || file.name,
          status_confronto: "sucesso",
          categoria: categoria || "FALTA IDENTIFICAR",
          tipo_conta: tipo_conta || (t.valor > 0 ? "PJ" : null),
          regra_aplicada_id: regra_id,
          ja_classificado: categoria !== null
        };
      });

    return NextResponse.json({
      success: true,
      status_geral: "sucesso",
      transacoes: transacoesClassificadas,
      erros
    });

  } catch (error: any) {
    console.error("🚨 Erro na API de importação de extrato:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
