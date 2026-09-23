#!/bin/bash
set -e

export PGPASSWORD="${POSTGRES_PASSWORD:-$POSTGRESQL_PASSWORD}"

# Function to create database
create_database() {
    local db_name=$1
    echo "Creating database if not exists: $db_name"
    psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE $db_name;" || true
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "GRANT ALL PRIVILEGES ON DATABASE $db_name TO $POSTGRES_USER;"
}

# Create health insurance databases
create_database auth_db
create_database policies_db
create_database claims_db
create_database members_db
create_database hospitals_db
create_database billing_db
create_database documents_db
create_database support_db

echo "All Health Insurance microservice databases created successfully!"
