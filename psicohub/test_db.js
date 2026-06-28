const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('🔄 Iniciando teste de banco de dados SQLite local...');

const DB_PATH = path.join(__dirname, 'psicohub.db');
const SCHEMA_PATH = path.join(__dirname, 'database', 'schema.sql');

try {
  // 1. Abrir a conexão com o banco SQLite (cria o arquivo psicohub.db se não existir)
  console.log(`📂 Conectando ao banco de dados em: ${DB_PATH}`);
  const db = new Database(DB_PATH);
  
  // Ativar chaves estrangeiras
  db.pragma('foreign_keys = ON');
  console.log('✅ Conexão estabelecida e chaves estrangeiras ativadas.');

  // 2. Ler e aplicar o arquivo de esquema SQL
  if (fs.existsSync(SCHEMA_PATH)) {
    console.log(`📖 Lendo esquema SQL de: ${SCHEMA_PATH}`);
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    console.log('✅ Esquema de tabelas aplicado com sucesso.');
  } else {
    throw new Error(`Esquema SQL não encontrado no caminho: ${SCHEMA_PATH}`);
  }

  // 3. Testar inserção e consulta em uma tabela para validação
  console.log('📝 Inserindo um paciente de teste para validação...');
  const insertStmt = db.prepare(`
    INSERT INTO pacientes (id, nome, whatsapp, email, valor_consulta, frequencia, dia_semana, horario)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const testId = 'teste-uuid-123';
  insertStmt.run(testId, 'Paciente Teste SQLite', '11999999999', 'teste@email.com', 150.00, 'semanal', 2, '14:00');
  console.log('✅ Paciente de teste inserido com sucesso.');

  // 4. Testar leitura do registro
  console.log('📖 Consultando o paciente inserido...');
  const selectStmt = db.prepare('SELECT * FROM pacientes WHERE id = ?');
  const paciente = selectStmt.get(testId);
  
  if (paciente && paciente.nome === 'Paciente Teste SQLite') {
    console.log('🎉 Teste de leitura bem-sucedido! Dados recuperados:', paciente);
  } else {
    throw new Error('Falha ao recuperar os dados corretos do paciente.');
  }

  // 5. Testar exclusão (limpeza)
  console.log('🧹 Excluindo o registro de teste...');
  const deleteStmt = db.prepare('DELETE FROM pacientes WHERE id = ?');
  deleteStmt.run(testId);
  console.log('✅ Registro de teste removido.');

  // 6. Fechar conexão
  db.close();
  console.log('🚪 Conexão fechada. Banco de dados funcionando perfeitamente!');
} catch (error) {
  console.error('🚨 Erro durante o teste do banco de dados:', error);
  process.exit(1);
}
