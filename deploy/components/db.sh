#!/bin/bash

# Database Component Management Script
# Handles PostgreSQL database deployment and management

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$SCRIPT_DIR/../utils/common.sh"

ACTION="$1"
LOCATION="$2"
MODE="$3"

if [[ -z "$ACTION" || -z "$LOCATION" || -z "$MODE" ]]; then
    echo "Usage: $0 <action> <local|remote> <dev|prod>"
    echo "Actions: start, stop, restart, migrate, backup, restore, status, logs"
    exit 1
fi

# Configuration
DB_PORT="5432"
CONTAINER_NAME="dev-database"

# Environment configuration
configure_environment() {
    local location="$1"
    local mode="$2"
    
    # Load common environment
    load_env_file "$SCRIPT_DIR/../config/current-db.env"
    
    export POSTGRES_USER="${POSTGRES_USER:-dev}"
    export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-dev}"
    export POSTGRES_DB="${POSTGRES_DB:-techni-zlecenia}"
    
    # Set database URL (always localhost, SSH tunnel handles remote)
    export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$DB_PORT/$POSTGRES_DB"
    
    log_info "Database Environment configured:"
    log_info "  Database URL: $DATABASE_URL"
    log_info "  Mode: $mode"
    log_info "  Location: $location"
}

# Start database locally
start_local() {
    configure_environment "local" "$MODE"
    
    if is_local_process_running "postgres" "$DB_PORT"; then
        log_warning "PostgreSQL is already running locally"
        return 0
    fi
    
    log_info "Starting local database..."
    
    # Check if Docker container exists and is running
    if command -v docker >/dev/null 2>&1; then
        if docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" -q | grep -q .; then
            log_warning "Database container is already running"
            return 0
        fi
        
        # Check if container exists but is stopped
        if docker ps -a --filter "name=$CONTAINER_NAME" -q | grep -q .; then
            log_info "Starting existing database container..."
            docker start "$CONTAINER_NAME"
        else
            log_info "Creating new database container..."
            docker run -p "$DB_PORT:$DB_PORT" -d \
                --name "$CONTAINER_NAME" \
                -e POSTGRES_USER="$POSTGRES_USER" \
                -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
                -e POSTGRES_DB="$POSTGRES_DB" \
                postgres:16-alpine
        fi
        
        # Wait for database to be ready
        if wait_for_service "local" "localhost" "$DB_PORT" 30; then
            log_success "Database is running at localhost:$DB_PORT"
        else
            log_error "Database failed to start properly"
            return 1
        fi
    else
        log_error "Docker not available. Please install Docker or start PostgreSQL manually."
        return 1
    fi
}

# Stop database locally
stop_local() {
    log_info "Stopping local database..."
    
    if command -v docker >/dev/null 2>&1; then
        if docker ps --filter "name=$CONTAINER_NAME" -q | grep -q .; then
            docker stop "$CONTAINER_NAME"
            log_success "Database container stopped"
        else
            log_warning "Database container is not running"
        fi
    else
        # Try to stop system PostgreSQL
        if command -v systemctl >/dev/null 2>&1; then
            systemctl stop postgresql 2>/dev/null || true
        elif command -v brew >/dev/null 2>&1; then
            brew services stop postgresql 2>/dev/null || true
        fi
        log_info "Attempted to stop system PostgreSQL"
    fi
}

# Start database remotely
start_remote() {
    configure_environment "remote" "$MODE"
    
    if ! check_remote_connection; then
        return 1
    fi
    
    log_info "Starting remote database..."
    
    # Check if PostgreSQL is already running
    if is_remote_process_running "postgres" "$DB_PORT"; then
        log_warning "PostgreSQL is already running remotely"
    else
        # Start PostgreSQL service
        if remote_exec "systemctl start postgresql"; then
            log_success "PostgreSQL service started"
            
            # Wait for service to be ready on remote
            if wait_for_service "remote" "127.0.0.1" "$DB_PORT" 30; then
                log_success "Remote database service is running"
            else
                log_error "Database failed to start properly"
                return 1
            fi
        else
            log_error "Failed to start PostgreSQL service"
            return 1
        fi
    fi
    
    # Create SSH tunnel for local access
    if ensure_database_connectivity "remote"; then
        log_success "Database is accessible via SSH tunnel at localhost:$DB_PORT"
    else
        log_error "Failed to establish database connectivity"
        return 1
    fi
}

# Stop database remotely
stop_remote() {
    log_info "Stopping remote database..."
    
    # Close SSH tunnel first
    close_ssh_tunnel
    
    if check_remote_connection; then
        if remote_exec "systemctl stop postgresql" true; then
            log_success "PostgreSQL service stopped"
        else
            log_warning "Failed to stop PostgreSQL service (may not be running)"
        fi
    else
        log_warning "Cannot connect to remote server to stop database service"
    fi
}

# Run database migrations
run_migrations() {
    local location="$1"
    
    configure_environment "$location" "$MODE"
    
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT/api"
    
    # Check if sqlx is available
    if ! command -v sqlx >/dev/null 2>&1; then
        log_error "sqlx CLI not found. Install with: cargo install sqlx-cli"
        return 1
    fi
    
    # Ensure database connectivity (creates SSH tunnel if needed)
    if ! ensure_database_connectivity "$location"; then
        log_error "Cannot establish database connectivity"
        return 1
    fi
    
    # Run migrations (always against localhost due to tunnel)
    if sqlx migrate run --database-url "$DATABASE_URL"; then
        log_success "Migrations completed successfully"
    else
        log_error "Migration failed"
        return 1
    fi
}

# Backup database
backup_database() {
    local location="$1"
    local backup_file="${2:-backup_$(date +%Y%m%d_%H%M%S).sql}"
    
    configure_environment "$location" "$MODE"
    
    log_info "Creating database backup..."
    
    local dump_command="pg_dump $DATABASE_URL"
    
    if [[ "$location" == "local" ]]; then
        if command -v pg_dump >/dev/null 2>&1; then
            $dump_command > "$backup_file"
            log_success "Backup created: $backup_file"
        else
            # Use Docker container
            if docker ps --filter "name=$CONTAINER_NAME" -q | grep -q .; then
                docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_file"
                log_success "Backup created: $backup_file"
            else
                log_error "Cannot create backup: no PostgreSQL tools available"
                return 1
            fi
        fi
    else
        if ! check_remote_connection; then
            return 1
        fi
        
        remote_exec "pg_dump $DATABASE_URL > /tmp/$backup_file"
        scp "$DEPLOY_VPS_HOST:/tmp/$backup_file" "./$backup_file"
        remote_exec "rm /tmp/$backup_file"
        log_success "Remote backup downloaded: $backup_file"
    fi
}

# Restore database
restore_database() {
    local location="$1"
    local backup_file="$2"
    
    if [[ -z "$backup_file" ]]; then
        log_error "Backup file not specified"
        return 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    configure_environment "$location" "$MODE"
    
    log_info "Restoring database from: $backup_file"
    
    local restore_command="psql $DATABASE_URL"
    
    if [[ "$location" == "local" ]]; then
        if command -v psql >/dev/null 2>&1; then
            $restore_command < "$backup_file"
            log_success "Database restored successfully"
        else
            # Use Docker container
            if docker ps --filter "name=$CONTAINER_NAME" -q | grep -q .; then
                docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$backup_file"
                log_success "Database restored successfully"
            else
                log_error "Cannot restore: no PostgreSQL tools available"
                return 1
            fi
        fi
    else
        if ! check_remote_connection; then
            return 1
        fi
        
        copy_to_remote "$backup_file" "/tmp/restore.sql"
        remote_exec "psql $DATABASE_URL < /tmp/restore.sql"
        remote_exec "rm /tmp/restore.sql"
        log_success "Remote database restored successfully"
    fi
}

# Show database logs
show_logs() {
    local location="$1"
    local lines="${2:-50}"
    
    if [[ "$location" == "local" ]]; then
        if command -v docker >/dev/null 2>&1; then
            if docker ps --filter "name=$CONTAINER_NAME" -q | grep -q .; then
                echo -e "${CYAN}=== Local Database Logs (last $lines lines) ===${NC}"
                docker logs --tail "$lines" "$CONTAINER_NAME"
            else
                log_warning "No local database container running"
            fi
        else
            log_warning "Cannot show logs: Docker not available"
        fi
    else
        if ! check_remote_connection; then
            return 1
        fi
        
        echo -e "${CYAN}=== Remote Database Logs (last $lines lines) ===${NC}"
        remote_exec "journalctl -u postgresql --no-pager -n $lines" || log_warning "No remote database logs found"
    fi
}

# Show database status
show_status() {
    local location="$1"
    
    echo -e "${CYAN}=== Database Status ($location) ===${NC}"
    
    if [[ "$location" == "local" ]]; then
        if command -v docker >/dev/null 2>&1; then
            if docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" -q | grep -q .; then
                echo -e "${GREEN}✓ Database container is running${NC}"
                docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            else
                echo -e "${RED}✗ Database container is not running${NC}"
            fi
        else
            if is_local_process_running "postgres" "$DB_PORT"; then
                echo -e "${GREEN}✓ PostgreSQL is running locally${NC}"
            else
                echo -e "${RED}✗ PostgreSQL is not running locally${NC}"
            fi
        fi
    else
        if ! check_remote_connection; then
            return 1
        fi
        
        echo "Remote Database Status:"
        remote_exec "systemctl status postgresql --no-pager" || echo "PostgreSQL service not found"
    fi
}

# Test database connection
test_connection() {
    local location="$1"
    
    configure_environment "$location" "$MODE"
    
    log_info "Testing database connection..."
    
    if command -v psql >/dev/null 2>&1; then
        if psql "$DATABASE_URL" -c "SELECT version();" >/dev/null 2>&1; then
            log_success "Database connection successful"
            psql "$DATABASE_URL" -c "SELECT version();"
        else
            log_error "Database connection failed"
            return 1
        fi
    else
        log_warning "psql not available for connection test"
    fi
}

# Main execution
main() {
    case "$ACTION" in
        "start")
            if [[ "$LOCATION" == "local" ]]; then
                start_local
            else
                start_remote
            fi
            ;;
        "stop")
            if [[ "$LOCATION" == "local" ]]; then
                stop_local
            else
                stop_remote
            fi
            ;;
        "restart")
            if [[ "$LOCATION" == "local" ]]; then
                stop_local
                sleep 2
                start_local
            else
                stop_remote
                sleep 2
                start_remote
            fi
            ;;
        "migrate")
            run_migrations "$LOCATION"
            ;;
        "backup")
            backup_database "$LOCATION" "$4"
            ;;
        "restore")
            restore_database "$LOCATION" "$4"
            ;;
        "test")
            test_connection "$LOCATION"
            ;;
        "status")
            show_status "$LOCATION"
            ;;
        "logs")
            show_logs "$LOCATION"
            ;;
        *)
            log_error "Unknown action: $ACTION"
            echo "Available actions: start, stop, restart, migrate, backup, restore, test, status, logs"
            exit 1
            ;;
    esac
}

main
