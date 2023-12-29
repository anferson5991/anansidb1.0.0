import sqlite3
import json

def create(db_path, app_data):
    # Conectar ao banco de dados SQLite
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Criar a tabela para armazenar dados JSON, se não existir
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS json_data (
            id INTEGER PRIMARY KEY,
            data TEXT
        );
    ''')

    # Converter dados para string JSON e inserir na tabela
    json_str = json.dumps(app_data)
    cursor.execute("INSERT INTO json_data (data) VALUES (?)", [json_str])

    # Commit e fechar a conexão
    conn.commit()
    conn.close()