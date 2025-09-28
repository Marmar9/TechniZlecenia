#!/bin/bash

# API Component Management Script
# Handles Rust API backend deployment and management

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$SCRIPT_DIR/../utils/common.sh"

ACTION="$1"
LOCATION="$2"
MODE="$3"

if [[ -z "$ACTION" || -z "$LOCATION" || -z "$MODE" ]]; then
    echo "Usage: $0 <action> <local|remote> <dev|prod>"
    echo "Actions: start, stop, restart, rebuild, status, logs, deploy"
    exit 1
fi

# Configuration
API_PORT="8080"
API_BINARY="techni-zlecenia-api"
SERVICE_NAME="techni-zlecenia-api"

# Environment configuration
configure_environment() {
    local location="$1"
    local mode="$2"
    
    # Load common environment
    load_env_file "$SCRIPT_DIR/../config/current-api.env"
    
    # Set additional environment variables
    export RUST_LOG="info"
    export SERVER_PEPPER="${SERVER_PEPPER:-$(generate_secret 50)}"
    export ACCESS_TOKEN_LIFETIME="${ACCESS_TOKEN_LIFETIME:-15}"
    export REFRESH_TOKEN_LIFETIME="${REFRESH_TOKEN_LIFETIME:-14}"
    export ACCESS_TOKEN_SECRET="${ACCESS_TOKEN_SECRET:-$(generate_secret 50)}"
    export REFRESH_TOKEN_SECRET="${REFRESH_TOKEN_SECRET:-$(generate_secret 50)}"
    
    # Get database URL based on configuration
    export DATABASE_URL=$(get_database_url "$DEPLOY_DB_LOCATION" "$mode")
    
    log_info "API Environment configured:"
    log_info "  Database: $DATABASE_URL"
    log_info "  Mode: $mode"
    log_info "  Location: $location"
}

# Build API
build_api() {
    log_info "Building Rust API..."
    
    cd "$PROJECT_ROOT/api"
    
    if [[ "$MODE" == "prod" ]]; then
        cargo build --release
        local binary_path="target/release/$API_BINARY"
    else
        cargo build
        local binary_path="target/debug/$API_BINARY"
    fi
    
    if [[ ! -f "$binary_path" ]]; then
        log_error "Build failed: $binary_path not found"
        return 1
    fi
    
    log_success "API build completed: $binary_path"
}

# Start API locally
start_local() {
    configure_environment "local" "$MODE"
    
    if is_local_process_running "$API_BINARY" "$API_PORT"; then
        log_warning "API is already running locally"
        return 0
    fi
    
    log_info "Starting API locally..."
    
    cd "$PROJECT_ROOT/api"
    
    # Ensure we have a built binary
    if [[ "$MODE" == "prod" ]]; then
        local binary_path="target/release/$API_BINARY"
    else
        local binary_path="target/debug/$API_BINARY"
    fi
    
    if [[ ! -f "$binary_path" ]]; then
        log_info "Binary not found, building..."
        build_api
    fi
    
    # Start the API in the background
    nohup ./"$binary_path" > /tmp/techni-api.log 2>&1 &
    local pid=$!
    
    echo $pid > /tmp/techni-api.pid
    
    log_info "API started with PID: $pid"
    
    # Wait for service to be ready
    if wait_for_service "local" "localhost" "$API_PORT" 15; then
        log_success "API is running at http://localhost:$API_PORT"
    else
        log_error "API failed to start properly"
        return 1
    fi
}

# Stop API locally
stop_local() {
    log_info "Stopping local API..."
    
    if [[ -f "/tmp/techni-api.pid" ]]; then
        local pid=$(cat /tmp/techni-api.pid)
        if kill "$pid" 2>/dev/null; then
            log_success "API stopped (PID: $pid)"
            rm -f /tmp/techni-api.pid
        else
            log_warning "Could not stop API with PID: $pid"
        fi
    fi
    
    # Fallback: kill by process name
    pkill -f "$API_BINARY" 2>/dev/null || true
    
    # Fallback: kill by port
    if command -v lsof >/dev/null 2>&1; then
        local port_pid=$(lsof -ti:$API_PORT 2>/dev/null || true)
        if [[ -n "$port_pid" ]]; then
            kill "$port_pid" 2>/dev/null || true
            log_info "Killed process on port $API_PORT"
        fi
    fi
    
    sleep 2
    
    if ! is_local_process_running "$API_BINARY" "$API_PORT"; then
        log_success "Local API stopped"
    else
        log_error "Failed to stop local API"
        return 1
    fi
}

# Deploy API to remote server
deploy_remote() {
    configure_environment "remote" "$MODE"
    
    if ! check_remote_connection; then
        return 1
    fi
    
    log_info "Deploying API to remote server..."
    
    # Build API locally first
    build_api
    
    # Create remote directory
    ensure_directory "remote" "/var/www/api"
    
    # Copy binary
    cd "$PROJECT_ROOT/api"
    local binary_path
    if [[ "$MODE" == "prod" ]]; then
        binary_path="target/release/$API_BINARY"
    else
        binary_path="target/debug/$API_BINARY"
    fi
    
    log_info "Copying API binary..."
    copy_to_remote "$binary_path" "/var/www/api/$API_BINARY"
    
    # Copy migrations
    log_info "Copying migrations..."
    copy_dir_to_remote "migrations/" "/var/www/api/migrations/"
    
    # Set permissions
    remote_exec "chmod +x /var/www/api/$API_BINARY"
    remote_exec "chown -R www-data:www-data /var/www/api/"
    
    # Create systemd service
    create_systemd_service
    
    log_success "API deployed to remote server"
}

# Create systemd service for remote API
create_systemd_service() {
    log_info "Creating systemd service..."
    
    local service_content="[Unit]
Description=TechniZlecenia API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/api
ExecStart=/var/www/api/$API_BINARY
Restart=always
RestartSec=5
Environment=RUST_LOG=info
Environment=DATABASE_URL=$DATABASE_URL
Environment=SERVER_PEPPER=$SERVER_PEPPER
Environment=ACCESS_TOKEN_LIFETIME=$ACCESS_TOKEN_LIFETIME
Environment=REFRESH_TOKEN_LIFETIME=$REFRESH_TOKEN_LIFETIME
Environment=ACCESS_TOKEN_SECRET=$ACCESS_TOKEN_SECRET
Environment=REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET

[Install]
WantedBy=multi-user.target"
    
    # Write service file to remote
    remote_exec "cat > /etc/systemd/system/$SERVICE_NAME.service << 'EOF'
$service_content
EOF"
    
    # Reload systemd and enable service
    remote_exec "systemctl daemon-reload"
    remote_exec "systemctl enable $SERVICE_NAME"
    
    log_success "Systemd service created and enabled"
}

# Start API remotely
start_remote() {
    configure_environment "remote" "$MODE"
    
    if ! check_remote_connection; then
        return 1
    fi
    
    log_info "Starting remote API..."
    
    # Check if service exists, create if not
    if ! remote_exec "systemctl list-unit-files | grep $SERVICE_NAME" true >/dev/null; then
        log_info "Service not found, deploying first..."
        deploy_remote
    fi
    
    # Start the service
    if remote_exec "systemctl start $SERVICE_NAME"; then
        log_success "API service started"
        
        # Wait for service to be ready
        if wait_for_service "remote" "127.0.0.1" "$API_PORT" 15; then
            local api_url=$(get_component_url "api" "remote" "$MODE")
            log_success "API is running at $api_url"
        else
            log_error "API failed to start properly"
            return 1
        fi
    else
        log_error "Failed to start API service"
        return 1
    fi
}

# Stop API remotely
stop_remote() {
    if ! check_remote_connection; then
        return 1
    fi
    
    log_info "Stopping remote API..."
    
    if remote_exec "systemctl stop $SERVICE_NAME" true; then
        log_success "API service stopped"
    else
        log_warning "Failed to stop API service (may not be running)"
    fi
}

# Show API logs
show_logs() {
    local location="$1"
    local lines="${2:-50}"
    
    if [[ "$location" == "local" ]]; then
        if [[ -f "/tmp/techni-api.log" ]]; then
            echo -e "${CYAN}=== Local API Logs (last $lines lines) ===${NC}"
            tail -n "$lines" /tmp/techni-api.log
        else
            log_warning "No local API logs found"
        fi
    else
        if ! check_remote_connection; then
            return 1
        fi
        
        echo -e "${CYAN}=== Remote API Logs (last $lines lines) ===${NC}"
        remote_exec "journalctl -u $SERVICE_NAME --no-pager -n $lines" || log_warning "No remote API logs found"
    fi
}

# Show API status
show_status() {
    local location="$1"
    
    echo -e "${CYAN}=== API Status ($location) ===${NC}"
    
    if [[ "$location" == "local" ]]; then
        if is_local_process_running "$API_BINARY" "$API_PORT"; then
            echo -e "${GREEN}✓ API is running locally on port $API_PORT${NC}"
            
            if [[ -f "/tmp/techni-api.pid" ]]; then
                local pid=$(cat /tmp/techni-api.pid)
                echo "  PID: $pid"
            fi
        else
            echo -e "${RED}✗ API is not running locally${NC}"
        fi
    else
        if ! check_remote_connection; then
            return 1
        fi
        
        echo "Remote API Status:"
        remote_exec "systemctl status $SERVICE_NAME --no-pager" || echo "Service not found"
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
        "rebuild")
            if [[ "$LOCATION" == "remote" ]]; then
                stop_remote
            else
                stop_local
            fi
            build_api
            if [[ "$LOCATION" == "remote" ]]; then
                deploy_remote
                start_remote
            else
                start_local
            fi
            ;;
        "deploy")
            if [[ "$LOCATION" == "remote" ]]; then
                deploy_remote
            else
                log_error "Deploy action only applicable for remote location"
                exit 1
            fi
            ;;
        "status")
            show_status "$LOCATION"
            ;;
        "logs")
            show_logs "$LOCATION"
            ;;
        *)
            log_error "Unknown action: $ACTION"
            echo "Available actions: start, stop, restart, rebuild, deploy, status, logs"
            exit 1
            ;;
    esac
}

main
