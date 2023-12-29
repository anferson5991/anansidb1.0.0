import sqlite3
import json

def query_json_data():
    # Conectar ao banco de dados SQLite
    conn = sqlite3.connect('anansi.db')
    cursor = conn.cursor()

    # Consultar todos os dados na tabela json_data
    cursor.execute("SELECT * FROM json_data")
    rows = cursor.fetchall()

    # Fechar a conexão
    conn.close()

    # Imprimir os resultados
    for row in rows:
        print("ID:", row[0])
        try:
            data = json.loads(row[1])  # Converter a string JSON de volta para um dicionário
            print(json.dumps(data, indent=4))  # Imprimir o dicionário formatado
        except json.JSONDecodeError:
            print("Erro ao decodificar JSON para o ID:", row[0])

if __name__ == "__main__":
    query_json_data()
