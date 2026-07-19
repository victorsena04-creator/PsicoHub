/**
 * Mock inofensivo do banco de dados SQLite para evitar erros de importação
 * em rotas legadas enquanto finalizamos a migração completa do PsicoHub para o Firestore.
 */
const db = {
  prepare: () => ({
    get: () => {
      console.warn("⚠️ Chamada a rota SQLite legada que está inativa.");
      return undefined;
    },
    all: () => {
      console.warn("⚠️ Chamada a rota SQLite legada que está inativa.");
      return [];
    },
    run: () => {
      console.warn("⚠️ Chamada a rota SQLite legada que está inativa.");
      return { changes: 0 };
    }
  }),
  transaction: (fn: any) => fn,
  exec: () => {
    console.warn("⚠️ Chamada a rota SQLite legada que está inativa.");
  },
  pragma: () => {}
} as any;

export default db;
