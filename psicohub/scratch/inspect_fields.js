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

async function inspecionarFormatoDatas() {
  console.log("=== EXEMPLOS DE DATAS NAS DESPESAS ===");
  const despesasSnap = await firestore.collection("consultorios").doc("desperte-psique").collection("despesas").get();
  despesasSnap.docs.slice(0, 5).forEach((d) => console.log("Despesa data:", typeof d.data().data, d.data().data));

  console.log("\n=== EXEMPLOS DE DATAS NOS RECEBIMENTOS ===");
  const recebimentosSnap = await firestore.collection("consultorios").doc("desperte-psique").collection("recebimentos").get();
  recebimentosSnap.docs.slice(0, 5).forEach((r) => console.log("Recebimento data_pagamento:", typeof r.data().data_pagamento, r.data().data_pagamento));
}

inspecionarFormatoDatas().catch(console.error);
