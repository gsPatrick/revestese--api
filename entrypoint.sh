#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Function to check if the database is ready
wait_for_db() {
  echo "Waiting for database to be ready..."
  # A simple check is enough since we won't run complex commands yet.
  # We can use `db:migrate:status` as a proxy for connection readiness
  until npx sequelize-cli db:migrate:status > /dev/null 2>&1; do
    echo "Database is unavailable - sleeping"
    sleep 2
  done

  echo "Database is up and running!"
}

# Call the function to wait for the database
wait_for_db

# --- MIGRAÇÕES DESATIVADAS TEMPORARIAMENTE ---
echo "Skipping database migrations as requested."
# npx sequelize-cli db:migrate # <-- LINHA PRINCIPAL COMENTADA

echo "Migrations step bypassed."

# Then, execute the main command (passed to the script)
# This will be `npm start` from your Dockerfile's CMD
exec "$@"