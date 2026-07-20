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

async function inspecionarUsuarios() {
  console.log("=== COLEÇÃO USUARIOS NO FIRESTORE ===");
  const usuariosSnap = await firestore.collection("usuarios").get();
  usuariosSnap.docs.forEach((doc) => {
    console.log(`Email doc: "${doc.id}":`, doc.data());
  });
}

inspecionarUsuarios().catch(console.error);
