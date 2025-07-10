#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Function to check if the database is ready
# We will use sequelize-cli's `db:migrate:status` as a proxy for connection readiness
wait_for_db() {
  echo "Waiting for database to be ready..."
  # We need to extract DB connection info from DATABASE_URL
  # Format: mysql://user:password@host:port/database
  DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

  # A simple TCP check is a good first step
  # But sequelize-cli provides a more robust check
  until npx sequelize-cli db:migrate:status > /dev/null 2>&1; do
    echo "Database is unavailable - sleeping"
    sleep 2
  done

  echo "Database is up and running!"
}

# Call the function to wait for the database
wait_for_db

# Now that the database is ready, run the migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate

echo "Migrations finished."

# Then, execute the main command (passed to the script)
# This will be `npm start` from your Dockerfile's CMD
exec "$@"