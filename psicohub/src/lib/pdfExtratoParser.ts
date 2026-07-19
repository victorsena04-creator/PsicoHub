// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");

export interface TransacaoExtratoBruto {
  data: string; // Formato "DD/MM/YYYY" ou "YYYY-MM-DD"
  descricao: string;
  valor: number; // Positivo para Entrada/Recebimento, Negativo para Saída/Despesa
  arquivo_origem?: string;
}

/**
 * Função para extrair texto de um PDF de extrato bancário (Nubank, Itaú, Bradesco, Inter, Santander, C6, etc.)
 * e estruturar as transações financeiras.
 * 
 * @param buffer Buffer do arquivo PDF enviado no upload
 * @param nomeArquivo Nome do arquivo PDF para identificação
 */
export async function extrairTransacoesDePdf(buffer: Buffer, nomeArquivo: string = "extrato.pdf"): Promise<{
  transacoes: TransacaoExtratoBruto[];
  erros: string[];
}> {
  const erros: string[] = [];
  const transacoes: TransacaoExtratoBruto[] = [];

  try {
    const parsed = await pdfParse(buffer);
    const text = parsed.text || "";

    if (!text.trim()) {
      erros.push("O arquivo PDF está vazio ou não contém texto selecionável (imagem/scan).");
      return { transacoes, erros };
    }

    // Dividir em linhas
    const linhas = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const anoAtual = new Date().getFullYear();

    // Regex para datas nos formatos:
    // 1. DD/MM/YYYY ou DD/MM/YY (ex: 15/07/2026, 05/07/26)
    // 2. DD/MM (ex: 15/07)
    // 3. DD MMM (ex: 12 OUT, 05 JUL, 01 JAN)
    const regexDataExtenso = /^(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/i;
    const regexDataBarra = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;

    const mesesExtensoMap: Record<string, string> = {
      JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06",
      JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12"
    };

    // Regex para identificar valores numéricos no padrão monetário brasileiro:
    // Ex: 1.250,50 | -1.250,50 | 150,00- | R$ 150,00 | 150,00 D | 150,00 C
    const regexValor = /(?:R\$\s*)?(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*([DC]|-)?/gi;

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];

      // Tentar casar data no início da linha
      let dataFormatada: string | null = null;
      let restoLinha = linha;

      const matchBarra = linha.match(regexDataBarra);
      const matchExtenso = linha.match(regexDataExtenso);

      if (matchBarra) {
        const dia = matchBarra[1].padStart(2, "0");
        const mes = matchBarra[2].padStart(2, "0");
        let anoStr = matchBarra[3];

        if (!anoStr) {
          anoStr = String(anoAtual);
        } else if (anoStr.length === 2) {
          anoStr = `20${anoStr}`;
        }

        dataFormatada = `${dia}/${mes}/${anoStr}`;
        restoLinha = linha.substring(matchBarra[0].length).trim();
      } else if (matchExtenso) {
        const dia = matchExtenso[1].padStart(2, "0");
        const mesSigla = matchExtenso[2].toUpperCase();
        const mes = mesesExtensoMap[mesSigla] || "01";
        const anoStr = String(anoAtual);

        dataFormatada = `${dia}/${mes}/${anoStr}`;
        restoLinha = linha.substring(matchExtenso[0].length).trim();
      }

      if (!dataFormatada) {
        continue;
      }

      // Procurar valores na linha
      const matchesValores = Array.from(restoLinha.matchAll(regexValor));
      if (matchesValores.length === 0) {
        continue;
      }

      // O último valor encontrado na linha costuma ser o valor da transação (ou o penúltimo se houver saldo)
      const valorMatch = matchesValores[matchesValores.length - 1];
      let valorStr = valorMatch[1].replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
      let valorNum = parseFloat(valorStr);

      const sufito = valorMatch[2] ? valorMatch[2].toUpperCase() : "";

      if (sufito === "D" || sufito === "-") {
        valorNum = -Math.abs(valorNum);
      } else if (sufito === "C") {
        valorNum = Math.abs(valorNum);
      }

      // Remover a parte do valor da descrição
      let descricao = restoLinha.substring(0, valorMatch.index).trim();
      if (!descricao) {
        descricao = restoLinha.replace(valorMatch[0], "").trim();
      }

      // Se a descrição contiver palavras indicativas de débito/saída sem sinal negativo explícito
      const descLower = descricao.toLowerCase();
      const palavrasSaida = ["pagamento", "pgto", "compra", "pix enviado", "tarifa", "debito", "saque", "transferencia enviada", "boleto"];
      const palavrasEntrada = ["pix recebido", "deposito", "rendimento", "transferencia recebida", "estorno", "credito"];

      if (palavrasSaida.some(p => descLower.includes(p)) && valorNum > 0 && !sufito) {
        valorNum = -valorNum;
      } else if (palavrasEntrada.some(p => descLower.includes(p)) && valorNum < 0 && !sufito) {
        valorNum = Math.abs(valorNum);
      }

      // Ignorar linhas de saldo / totais
      if (descLower.includes("saldo anterior") || descLower.includes("saldo do dia") || descLower.includes("saldo final")) {
        continue;
      }

      if (descricao.length >= 2 && !isNaN(valorNum) && valorNum !== 0) {
        transacoes.push({
          data: dataFormatada,
          descricao,
          valor: valorNum,
          arquivo_origem: nomeArquivo
        });
      }
    }

    if (transacoes.length === 0) {
      erros.push("Nenhuma transação financeira foi identificada no padrão do arquivo PDF.");
    }

  } catch (err: any) {
    console.error("🚨 Erro ao ler PDF com pdf-parse:", err);
    erros.push(`Falha ao ler arquivo PDF: ${err.message || "Erro desconhecido"}`);
  }

  return { transacoes, erros };
}
