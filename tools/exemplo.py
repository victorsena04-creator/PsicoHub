#!/usr/bin/env python3
"""
Exemplo de Ferramenta - Projeto PsicoHub

Este é um script de exemplo para demonstrar a estrutura
de ferramentas no protocolo V.L.A.E.G.

Autor: Piloto do Sistema
Data: [Data Atual]
"""

import os
from pathlib import Path


def main():
    """Função principal da ferramenta."""
    print("=== Ferramenta de Exemplo - PsicoHub ===")
    
    # Exemplo de como carregar variáveis de ambiente
    # api_key = os.getenv('API_KEY')
    
    # Exemplo de uso de .tmp para arquivos intermediários
    tmp_dir = Path('.tmp')
    tmp_dir.mkdir(exist_ok=True)
    
    # Exemplo de arquivo temporário
    temp_file = tmp_dir / 'exemplo.tmp'
    temp_file.write_text('Dados temporários de exemplo')
    
    print(f"Arquivo temporário criado em: {temp_file}")
    print("Ferramenta executada com sucesso!")


if __name__ == "__main__":
    main()