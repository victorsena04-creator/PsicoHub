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

async function limparDuplicidades() {
  console.log("🧹 Iniciando limpeza de consultórios duplicados no Firestore...");

  // Excluir consultórios duplicados "reR95VFxowBkoWzXaEsu" e "consultorio-principal"
  const idsParaRemover = ["reR95VFxowBkoWzXaEsu", "consultorio-principal"];

  for (const consultorioId of idsParaRemover) {
    console.log(`🗑️ Apagando subcoleções do consultório duplicado: ${consultorioId}...`);
    const colecoes = ["despesas", "recebimentos", "pacientes", "consultas", "metas", "cartoes_credito", "dividas", "investimentos", "regras_classificacao", "termos_ignorar"];

    for (const colName of colecoes) {
      const snapshot = await firestore.collection("consultorios").doc(consultorioId).collection(colName).get();
      if (!snapshot.empty) {
        const batch = firestore.batch();
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        console.log(`   └─ Removidos ${snapshot.docs.length} documentos da subcoleção '${colName}'`);
      }
    }

    await firestore.collection("consultorios").doc(consultorioId).delete();
    console.log(`✅ Documento do consultório '${consultorioId}' removido com sucesso.`);
  }

  // Garantir que todos os usuários em "usuarios" apontem para "desperte-psique"
  console.log("🔒 Garantindo que todos os usuários apontem para 'desperte-psique'...");
  const usuariosSnapshot = await firestore.collection("usuarios").get();
  for (const uDoc of usuariosSnapshot.docs) {
    await firestore.collection("usuarios").doc(uDoc.id).update({
      consultorioId: "desperte-psique"
    });
    console.log(`   └─ Usuário '${uDoc.id}' configurado para consultório 'desperte-psique'`);
  }

  console.log("\n🎉 Limpeza concluída com 100% de sucesso! O Firestore agora possui um banco único e limpo: 'desperte-psique'.");
}

limparDuplicidades().catch(console.error);
