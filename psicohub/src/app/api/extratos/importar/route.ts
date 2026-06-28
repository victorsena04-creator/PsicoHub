import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import db from "@/lib/db";

const execAsync = promisify(exec);

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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Arquivo PDF não enviado." },
        { status: 400 }
      );
    }

    // 1. Criar diretório temporário se não existir
    const tmpDir = path.join(process.cwd(), ".tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Buscar lista de termos a desconsiderar no SQLite local (aprendizado contínuo)
    let ignoreListPath = "";
    try {
      const termosDb = db.prepare("SELECT termo FROM termos_ignorar_extrato").all() as { termo: string }[];
      if (termosDb.length > 0) {
        const ignoreList = termosDb.map(t => t.termo);
        const ignoreFileName = `ignore-${Date.now()}.json`;
        ignoreListPath = path.join(tmpDir, ignoreFileName);
        fs.writeFileSync(ignoreListPath, JSON.stringify(ignoreList, null, 2), "utf-8");
      }
    } catch (dbErr) {
      console.warn("⚠️ Não foi possível carregar a lista de termos a ignorar:", dbErr);
    }

    // 2. Gravar o PDF temporário
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempFileName = `extrato-${Date.now()}.pdf`;
    const tempFilePath = path.join(tmpDir, tempFileName);
    fs.writeFileSync(tempFilePath, buffer);

    // 3. Definir caminhos para rodar o script Python
    const pythonScriptPath = "c:\\Users\\victo\\OneDrive\\Desenvolvimento\\Projetos\\extratos-bancarios\\extrator_extrato.py";
    const outTempDir = path.join(tmpDir, `out-${Date.now()}`);

    // Executar o Python via subprocesso
    // Passamos --json para obter a saída estruturada e --sem-classificacao porque a classificação
    // será feita pelo Next.js baseada no banco de dados SQLite local.
    const ignoreArg = ignoreListPath ? `--ignore-list "${ignoreListPath}"` : "";
    const command = `python "${pythonScriptPath}" --json -i "${tempFilePath}" -o "${outTempDir}" --sem-classificacao ${ignoreArg}`;

    console.log(`Executing: ${command}`);
    
    let pythonOutput = "";
    try {
      const { stdout } = await execAsync(command);
      pythonOutput = stdout.trim();
    } catch (execErr: any) {
      console.warn("⚠️ Comando 'python' falhou. Tentando executar com 'py'...", execErr.message);
      
      const fallbackCommand = `py "${pythonScriptPath}" --json -i "${tempFilePath}" -o "${outTempDir}" --sem-classificacao ${ignoreArg}`;
      try {
        const { stdout } = await execAsync(fallbackCommand);
        pythonOutput = stdout.trim();
      } catch (fallbackErr: any) {
        console.error("🚨 Ambos os comandos 'python' e 'py' falharam:", fallbackErr);
        // Limpeza dos arquivos temporários
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (ignoreListPath && fs.existsSync(ignoreListPath)) fs.unlinkSync(ignoreListPath);
        if (fs.existsSync(outTempDir)) fs.rmSync(outTempDir, { recursive: true, force: true });

        return NextResponse.json(
          { success: false, error: `Falha ao processar o extrato PDF: ${fallbackErr.stderr || fallbackErr.message}` },
          { status: 500 }
        );
      }
    }

    // Limpeza dos arquivos temporários
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    if (ignoreListPath && fs.existsSync(ignoreListPath)) fs.unlinkSync(ignoreListPath);
    if (fs.existsSync(outTempDir)) fs.rmSync(outTempDir, { recursive: true, force: true });

    // 4. Parse da saída do script Python
    let parsedData: any;
    try {
      parsedData = JSON.parse(pythonOutput);
    } catch (parseErr) {
      console.error("🚨 Falha ao fazer parse do JSON retornado pelo Python:", pythonOutput);
      return NextResponse.json(
        { success: false, error: "Erro de processamento: O analisador de PDF retornou uma resposta inválida." },
        { status: 500 }
      );
    }

    const { transacoes = [], erros = [], status_geral = "sucesso" } = parsedData;

    // 5. Buscar as regras de classificação cadastradas no SQLite local
    const regras = db.prepare("SELECT * FROM regras_classificacao").all() as {
      id: string;
      termo_chave: string;
      categoria: string;
      tipo_conta: "PF" | "PJ";
    }[];

    // Mapear regras para facilitar o cruzamento
    const regrasNormalizadas = regras.map(r => ({
      ...r,
      termo_chave_norm: normalizarTexto(r.termo_chave)
    }));

    // 6. Enriquecer/classificar as transações brutas
    const transacoesClassificadas = transacoes.map((t: any, idx: number) => {
      const descNorm = normalizarTexto(t.descricao);
      let categoria: string | null = null;
      let tipo_conta: "PF" | "PJ" | null = null;
      let regra_id: string | null = null;

      // Procurar match de regra
      for (const regra of regrasNormalizadas) {
        if (descNorm.includes(regra.termo_chave_norm)) {
          categoria = regra.categoria;
          tipo_conta = regra.tipo_conta;
          regra_id = regra.id;
          break;
        }
      }

      const valor = parseFloat(t.valor);
      
      return {
        id: `t-import-${idx}-${Date.now()}`,
        data: t.data,
        descricao: t.descricao,
        valor,
        arquivo_origem: t.arquivo_origem,
        status_confronto: t.status_confronto || "sucesso",
        categoria: categoria || "FALTA IDENTIFICAR",
        tipo_conta: tipo_conta || (valor > 0 ? "PJ" : null),
        regra_aplicada_id: regra_id,
        ja_classificado: categoria !== null
      };
    });

    return NextResponse.json({
      success: true,
      status_geral,
      transacoes: transacoesClassificadas,
      erros
    });

  } catch (error: any) {
    console.error("🚨 Erro geral na API de importação de extrato:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
