import admin from "firebase-admin";

// Interface para evitar recriação de instâncias do Firebase Admin em modo de desenvolvimento (Fast Refresh do Next.js)
const globalWithFirebase = global as typeof globalThis & {
  firebaseAdminApp?: admin.app.App;
};

function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  
  let formatted = key.trim();
  // Remove aspas simples ou duplas que envolvem a chave se tiverem sido coladas no painel de Env Vars
  if ((formatted.startsWith('"') && formatted.endsWith('"')) || (formatted.startsWith("'") && formatted.endsWith("'"))) {
    formatted = formatted.slice(1, -1);
  }
  // Converte \n literais para quebras de linha reais exigidas pelo OpenSSL/Firebase
  return formatted.replace(/\\n/g, "\n");
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = getPrivateKey();

if (!globalWithFirebase.firebaseAdminApp) {
  if (projectId && clientEmail && privateKey) {
    try {
      globalWithFirebase.firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("🔥 Firebase Admin SDK inicializado com sucesso via Conta de Serviço.");
    } catch (err) {
      console.error("🚨 Erro ao inicializar Firebase Admin cert:", err);
    }
  }

  if (!globalWithFirebase.firebaseAdminApp) {
    try {
      globalWithFirebase.firebaseAdminApp = admin.initializeApp();
      console.log("🔥 Firebase Admin SDK inicializado via credenciais de ambiente.");
    } catch (error) {
      console.error("🚨 Erro crítico: Não foi possível inicializar o Firebase Admin SDK.");
    }
  }
}

// Exporta as instâncias prontas dos serviços do Firebase para serem usadas no backend
export const adminApp = globalWithFirebase.firebaseAdminApp;
export const firestore = admin.firestore();
export const auth = admin.auth();

// Configura o Firestore para ignorar campos indefinidos ao invés de lançar erro
try {
  firestore.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // Configurações só podem ser definidas uma vez, ignora se já tiverem sido aplicadas
}
