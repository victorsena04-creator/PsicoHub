const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, "utf8");
  envText.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (projectId && clientEmail && privateKey) {
  const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
  }
}

const firestore = admin.firestore();

async function testarSortEDataNull() {
  const despesasSnap = await firestore.collection("consultorios").doc("desperte-psique").collection("despesas").get();
  const recebimentosSnap = await firestore.collection("consultorios").doc("desperte-psique").collection("recebimentos").get();

  const recebimentos = recebimentosSnap.docs.map(doc => doc.data());
  const despesasData = despesasSnap.docs.map(doc => doc.data());

  const listEntradas = recebimentos
    .filter(r => r.status === "pago" && r.data_pagamento)
    .map(r => ({
      direcao: "entrada",
      id: r.id,
      data: r.data_pagamento,
      descricao: "Entrada",
      categoria: r.categoria || "atendimento",
      tipo_conta: r.tipo_conta,
      valor: r.valor || 0
    }));

  const listSaidas = despesasData.map(d => ({
    direcao: "saida",
    id: d.id,
    data: d.data,
    descricao: d.descricao,
    categoria: d.categoria || "outros",
    tipo_conta: d.tipo_conta,
    valor: d.valor || 0
  }));

  let lancamentos = [...listEntradas, ...listSaidas];

  console.log(`📊 Total de lancamentos combinados: ${lancamentos.length}`);

  let temDataInvalida = false;
  lancamentos.forEach((l, idx) => {
    if (!l.data || typeof l.data !== "string") {
      console.log(`🚨 Lançamento no índice ${idx} tem data inválida:`, l);
      temDataInvalida = true;
    }
  });

  try {
    lancamentos.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    console.log("✅ Ordenação concluída com sucesso sem erros!");
  } catch (err) {
    console.error("🚨 ERRO DURANTE ORDENAÇÃO:", err);
  }
}

testarSortEDataNull().catch(console.error);
