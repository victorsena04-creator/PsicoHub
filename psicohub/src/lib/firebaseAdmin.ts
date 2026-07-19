import admin from "firebase-admin";

// Interface para evitar recriação de instâncias do Firebase Admin em modo de desenvolvimento (Fast Refresh do Next.js)
const globalWithFirebase = global as typeof globalThis & {
  firebaseAdminApp?: admin.app.App;
};

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!globalWithFirebase.firebaseAdminApp) {
  // Em desenvolvimento local, se não houver variáveis de ambiente de conta de serviço configuradas,
  // podemos tentar usar as credenciais padrão do Firebase (Application Default Credentials - ADC)
  // ou emitir um alerta. No ambiente Vercel, as variáveis estarão configuradas no painel.
  if (projectId && clientEmail && privateKey) {
    const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
    
    globalWithFirebase.firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
    console.log("🔥 Firebase Admin SDK inicializado com sucesso via Conta de Serviço.");
  } else {
    // Caso as credenciais não estejam no .env, avisa no console e tenta inicialização padrão (caso rode em GCP/Firebase CLI local)
    console.warn("⚠️ Credenciais completas do Firebase Admin não encontradas no arquivo .env. Tentando inicialização padrão...");
    try {
      globalWithFirebase.firebaseAdminApp = admin.initializeApp();
      console.log("🔥 Firebase Admin SDK inicializado usando credenciais do ambiente local.");
    } catch (error) {
      console.error("🚨 Erro crítico: Não foi possível inicializar o Firebase Admin SDK. Configure as variáveis FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.");
    }
  }
}

// Exporta as instâncias prontas dos serviços do Firebase para serem usadas no backend
export const adminApp = globalWithFirebase.firebaseAdminApp;
export const firestore = admin.firestore();
export const auth = admin.auth();

// Configura o Firestore para ignorar campos indefinidos ao invés de lançar erro (facilita gravações de dados opcionais)
try {
  firestore.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // Configurações só podem ser definidas uma vez, ignora se já tiverem sido aplicadas
}
