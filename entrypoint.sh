#!/bin/sh
set -e

# --- Opcional: Esperar o Banco de Dados Estar Online ---
# Se o seu banco de dados está em um serviço separado e pode não estar pronto
# imediatamente quando o contêiner da sua aplicação inicia, é CRÍTICO esperar por ele.
# Substitua 'your_database_host' e 'your_database_port' pelos valores corretos
# (normalmente, são variáveis de ambiente definidas no EasyPanel).

# Exemplo para MySQL ou PostgreSQL (ajuste a porta)
# Se você usa MySQL, a porta padrão é 3306. Para PostgreSQL, é 5432.
# O comando `nc -z` tenta se conectar ao host e porta sem enviar dados, apenas para verificar a conectividade.
DB_HOST=${DB_HOST:-"localhost"} # Use uma variável de ambiente, ou 'localhost' se o DB for no mesmo contêiner (raro)
DB_PORT=${DB_PORT:-"3306"} # ou "5432" para PostgreSQL
TIMEOUT=30 # Tempo máximo para esperar o DB (em segundos)

echo "Waiting for database at $DB_HOST:$DB_PORT..."
count=0
while ! nc -z $DB_HOST $DB_PORT; do
  count=$((count+1))
  if [ $count -gt $TIMEOUT ]; then
    echo "Database did not become available within $TIMEOUT seconds."
    exit 1 # Sai com erro se o DB não ficar online
  fi
  echo "Database is not ready yet. Retrying in 1 second..."
  sleep 1
done
echo "Database is up and running. Proceeding with migrations."

# --- Rodar as Migrações ---
echo "Running database migrations..."
npx sequelize-cli db:migrate

# --- Iniciar a Aplicação Principal ---
# O `exec "$@"` garante que o comando original do CMD do Dockerfile seja executado,
# substituindo o processo atual do shell pelo processo da sua aplicação.
# Isso é uma boa prática para garantir que sinais (como SIGTERM) sejam
# repassados corretamente para sua aplicação.
echo "Starting application..."
exec "$@"