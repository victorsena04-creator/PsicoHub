import sqlite3
import os
import sys
import json
from datetime import datetime

# Analogia simples: Este script lê o seu arquivo de banco local (SQLite) como um livro de registros antigo
# e copia linha por linha para as coleções do Firebase Firestore (nuvem), organizando por gavetas (subcoleções) do consultório.

try:
    import firebase_admin
    from firebase_admin import credentials
    from firebase_admin import firestore
except ImportError:
    print("🚨 Biblioteca 'firebase-admin' não instalada.")
    print("👉 Por favor, rode o comando no terminal: pip install firebase-admin")
    sys.exit(1)

def rodar_migracao():
    print("=== MIGRANDO SQLITE PARA FIRESTORE (PsicoHub) ===\n")
    
    # 1. Definir caminhos e configurações (aceitando argumentos via CLI)
    db_path = "./psicohub/psicohub.db"
    service_account_path = "./service-account.json"
    consultorio_id = ""

    if len(sys.argv) > 1:
        # Se passado por argumento: python migrate_to_firestore.py [consultorio_id] [db_path] [service_account_path]
        consultorio_id = sys.argv[1].strip()
        if len(sys.argv) > 2:
            db_path = sys.argv[2].strip()
        if len(sys.argv) > 3:
            service_account_path = sys.argv[3].strip()
        print(f"🤖 Rodando migração via linha de comando:")
        print(f"   Consultório ID: {consultorio_id}")
        print(f"   Caminho Banco: {db_path}")
        print(f"   Chave JSON: {service_account_path}\n")
    else:
        # Modo interativo
        db_path = input("📁 Digite o caminho do arquivo do SQLite (pressione Enter para usar './psicohub/psicohub.db'): ").strip()
        if not db_path:
            db_path = "./psicohub/psicohub.db"
            
        service_account_path = input("🔑 Digite o caminho da chave JSON da Conta de Serviço do Firebase: ").strip()
        if not service_account_path:
            service_account_path = "./service-account.json"
            
        consultorio_id = input("🏢 Digite o ID do Consultório (Tenant) de destino no Firestore: ").strip()

    if not consultorio_id:
        print("❌ O ID do Consultório é obrigatório para garantir o isolamento dos dados.")
        return

    if not os.path.exists(db_path):
        print(f"❌ Arquivo de banco de dados não encontrado em: {db_path}")
        return

    if not os.path.exists(service_account_path):
        print(f"❌ Arquivo JSON de Conta de Serviço do Firebase não encontrado em: {service_account_path}")
        return
    if not consultorio_id:
        print("❌ O ID do Consultório é obrigatório para garantir o isolamento dos dados.")
        return

    # 2. Inicializar o Firebase Admin
    print("\n🔥 Conectando ao Firebase...")
    try:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        db_firestore = firestore.client()
        print("✅ Conectado ao Firebase com sucesso.")
    except Exception as e:
        print(f"🚨 Falha ao conectar ao Firebase: {e}")
        return

    # 3. Conectar ao SQLite local
    print("📖 Abrindo banco de dados SQLite local...")
    try:
        conn = sqlite3.connect(db_path)
        # Permite acessar colunas por nome (row['nome_coluna'])
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
    except Exception as e:
        print(f"🚨 Falha ao abrir o SQLite: {e}")
        return

    # 4. Tabelas a serem migradas
    # Nome no SQLite -> Subcoleção correspondente no Firestore
    tabelas_migracao = {
        "pacientes": "pacientes",
        "agenda_base": "agenda_base",
        "consultas": "consultas",
        "recebimentos": "recebimentos",
        "cartoes_credito": "cartoes_credito",
        "despesas": "despesas",
        "regras_classificacao": "regras_classificacao",
        "metas": "metas",
        "dividas": "dividas",
        "investimentos": "investimentos",
        "termos_ignorar_extrato": "termos_ignorar_extrato"
    }

    try:
        # Referência do documento do consultório proprietário
        consultorio_ref = db_firestore.collection("consultorios").document(consultorio_id)
        
        # Verificar se o consultório existe, caso contrário, cria-o
        consultorio_doc = consultorio_ref.get()
        if not consultorio_doc.exists:
            nome_formatado = consultorio_id.replace("-", " ").title()
            print(f"🏢 Criando consultório com ID: {consultorio_id} (Nome: {nome_formatado})...")
            consultorio_ref.set({
                "id": consultorio_id,
                "nome": nome_formatado,
                "created_at": datetime.now().isoformat()
            })

        for tab_sqlite, subcol_firestore in tabelas_migracao.items():
            print(f"\n⏳ Migrando tabela '{tab_sqlite}' para subcoleção '{subcol_firestore}'...")
            
            # Verificar se a tabela existe no SQLite
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{tab_sqlite}'")
            if not cursor.fetchone():
                print(f"ℹ️ Tabela '{tab_sqlite}' não existe no SQLite local. Pulando...")
                continue
                
            cursor.execute(f"SELECT * FROM {tab_sqlite}")
            rows = cursor.fetchall()
            
            if not rows:
                print(f"ℹ️ Tabela '{tab_sqlite}' está vazia. Pulando...")
                continue
                
            print(f"📊 Encontrados {len(rows)} registros para migrar.")
            
            # Enviar dados em lotes (batch) de no máximo 400 gravações por lote (limite do Firestore é 500)
            batch = db_firestore.batch()
            count = 0
            total_migrado = 0
            
            for row in rows:
                doc_data = {}
                # Converte os tipos do SQLite para tipos válidos no Firestore (Python JSON types)
                for col in row.keys():
                    val = row[col]
                    # UUIDs de ID serão usados como IDs de documentos no Firestore
                    if col == 'id':
                        doc_id = str(val)
                    else:
                        # Trata nulos e numéricos
                        if val is None:
                            doc_data[col] = None
                        elif isinstance(val, bytes):
                            doc_data[col] = val.decode('utf-8', errors='ignore')
                        else:
                            doc_data[col] = val
                
                # Campos adicionais de controle
                doc_data['id'] = doc_id
                
                # Referência do documento na subcoleção do consultório
                doc_ref = consultorio_ref.collection(subcol_firestore).document(doc_id)
                batch.set(doc_ref, doc_data)
                
                count += 1
                total_migrado += 1
                
                # Commit do batch quando atingir o limite
                if count >= 400:
                    batch.commit()
                    print(f"   Processed {total_migrado}/{len(rows)}...")
                    batch = db_firestore.batch()
                    count = 0
                    
            if count > 0:
                batch.commit()
                
            print(f"✅ Sucesso: {total_migrado} registros de '{tab_sqlite}' migrados.")

        # Criar o usuário administrador na coleção global de usuários
        print("\n🔑 Criando acesso para o e-mail administrador do desenvolvedor...")
        admin_email = "victorsena04@gmail.com"
        user_ref = db_firestore.collection("usuarios").document(admin_email.lower())
        user_ref.set({
            "email": admin_email.lower(),
            "consultorioId": consultorio_id,
            "role": "principal",
            "ativo": 1,
            "updated_at": datetime.now().isoformat()
        })
        print(f"✅ Usuário '{admin_email}' vinculado ao consultório '{consultorio_id}' com sucesso.")

        print("\n🎉 MIGRACAO CONCLUIDA COM SUCESSO! Todos os dados estão online.")

    except Exception as e:
        print(f"🚨 Erro durante a migração dos dados: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    rodar_migracao()
