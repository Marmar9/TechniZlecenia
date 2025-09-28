#!/bin/bash

# Web Component Management Script
# Handles Next.js frontend deployment and management

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$SCRIPT_DIR/../utils/common.sh"

ACTION="$1"
LOCATION="$2"
MODE="$3"

if [[ -z "$ACTION" || -z "$LOCATION" || -z "$MODE" ]]; then
    echo "Usage: $0 <action> <local|remote> <dev|prod>"
    echo "Actions: start, stop, restart, rebuild, build, deploy, status, logs"
    exit 1
fi

# Configuration
WEB_PORT="3000"
PM2_APP_NAME="techni-zlecenia-web"

# Environment configuration
configure_environment() {
    local location="$1"
    local mode="$2"
    
    # Load common environment
    load_env_file "$SCRIPT_DIR/../config/current-web.env"
    
    # Get API URL based on configuration
    local api_url=$(get_component_url "api" "$DEPLOY_API_LOCATION" "$mode")
    export NEXT_PUBLIC_API_URL="$api_url"
    
    if [[ "$mode" == "prod" ]]; then
        export NODE_ENV="production"
    else
        export NODE_ENV="development"
    fi
    
    export PORT="$WEB_PORT"
    
    log_info "Web Environment configured:"
    log_info "  API URL: $NEXT_PUBLIC_API_URL"
    log_info "  Node Environment: $NODE_ENV"
    log_info "  Mode: $mode"
    log_info "  Location: $location"
}

# Build web application
build_web() {
    local mode="$1"
    
    configure_environment "$LOCATION" "$mode"
    
    log_info "Building Next.js application..."
    
    cd "$PROJECT_ROOT/web"
    
    # Install dependencies
    if [[ -f "package-lock.json" ]]; then
        npm ci
    else
        npm install
    fi
    
    # Build application
    if [[ "$mode" == "prod" ]]; then
        npm run build:prod 2>/dev/null || npm run build
    else
        npm run build:dev 2>/dev/null || npm run build
    fi
    
    log_success "Web application built successfully"
}

# Start web application locally
start_local() {
    configure_environment "local" "$MODE"
    
    if is_local_process_running "next" "$WEB_PORT" || is_local_process_running "node.*next" "$WEB_PORT"; then
        log_warning "Web application is already running locally"
        return 0
    fi
    
    log_info "Starting web application locally..."
    
    cd "$PROJECT_ROOT/web"
    
    # Ensure dependencies are installed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        npm install
    fi
    
    # Start based on mode
    if [[ "$MODE" == "prod" ]]; then
        # Build if needed
        if [[ ! -d ".next" ]]; then
            build_web "$MODE"
        fi
        
        # Start in production mode
        nohup npm start > /tmp/techni-web.log 2>&1 &
    else
        # Start in development mode
        nohup npm run dev > /tmp/techni-web.log 2>&1 &
    fi
    
    local pid=$!
    echo $pid > /tmp/techni-web.pid
    
    log_info "Web application started with PID: $pid"
    
    # Wait for service to be ready
    if wait_for_service "local" "localhost" "$WEB_PORT" 20; then
        log_success "Web application is running at http://localhost:$WEB_PORT"
    else
        log_error "Web application failed to start properly"
        return 1
    fi
}

# Stop web application locally
stop_local() {
    log_info "Stopping local web application..."
    
    if [[ -f "/tmp/techni-web.pid" ]]; then
        local pid=$(cat /tmp/techni-web.pid)
        if kill "$pid" 2>/dev/null; then
            log_success "Web application stopped (PID: $pid)"
            rm -f /tmp/techni-web.pid
        else
            log_warning "Could not stop web application with PID: $pid"
        fi
    fi
    
    # Fallback: kill by process name
    pkill -f "next" 2>/dev/null || true
    
    # Fallback: kill by port
    if command -v lsof >/dev/null 2>&1; then
        local port_pid=$(lsof -ti:$WEB_PORT 2>/dev/null || true)
        if [[ -n "$port_pid" ]]; then
            kill "$port_pid" 2>/dev/null || true
            log_info "Killed process on port $WEB_PORT"
        fi
    fi
    
    sleep 2
    
    if ! is_local_process_running "next" "$WEB_PORT"; then
        log_success "Local web application stopped"
    else
        log_error "Failed to stop local web application"
        return 1
    fi
}

# Deploy web application to remote server
deploy_remote() {
    configure_environment "remote" "$MODE"
    
    if ! check_remote_connection; then
        return 1
    fi
    
    log_info "Deploying web application to remote server..."
    
    # Build application locally
    build_web "$MODE"
    
    # Create remote directory
    ensure_directory "remote" "/var/www/myapp"
    
    cd "$PROJECT_ROOT/web"
    
    # Copy built application
    log_info "Copying application files..."
    
    # Create tar archive to preserve permissions and reduce transfer time
    tar czf /tmp/web-build.tar.gz .next package.json package-lock.json next.config.js public/
    
    copy_to_remote "/tmp/web-build.tar.gz" "/tmp/web-build.tar.gz"
    
    # Extract on remote server
    remote_exec "cd /var/www/myapp && tar xzf /tmp/web-build.tar.gz && rm /tmp/web-build.tar.gz"
    
    # Install production dependencies on remote
    log_info "Installing dependencies on remote server..."
    remote_exec "cd /var/www/myapp && npm ci --only=production"
    
    # Set permissions
    remote_exec "chown -R www-data:www-data /var/www/myapp/"
    
    # Create or update PM2 ecosystem file
    create_pm2_config
    
    # Clean up local tar file
    rm -f /tmp/web-build.tar.gz
    
    log_success "Web application deployed to remote server"
}

# Create PM2 configuration
create_pm2_config() {
    log_info "Creating PM2 configuration..."
    
    local ecosystem_content="module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/myapp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: '$NODE_ENV',
      PORT: $WEB_PORT,
      NEXT_PUBLIC_API_URL: '$NEXT_PUBLIC_API_URL'
    },
    error_file: '/var/log/pm2/${PM2_APP_NAME}-error.log',
    out_file: '/var/log/pm2/${PM2_APP_NAME}-out.log',
    log_file: '/var/log/pm2/${PM2_APP_NAME}.log'
  }]
}"
    
    # Write ecosystem file to remote
    remote_exec "cat > /var/www/myapp/ecosystem.config.js << 'EOF'
$ecosystem_content
EOF"
    
    log_success "PM2 configuration created"
}

# Start web application remotely
start_remote() {
    configure_environment "remote" "$MODE"
    
    if ! check_remote_connection; then
        return 1
    fi
    
    log_info "Starting remote web application..."
    
    # Check if application is deployed
    if ! remote_exec "test -d /var/www/myapp/.next" true; then
        log_info "Application not found, deploying first..."
        deploy_remote
    fi
    
    # Ensure PM2 is installed
    if ! remote_exec "command -v pm2" true >/dev/null; then
        log_info "Installing PM2..."
        remote_exec "npm install -g pm2"
    fi
    
    # Create log directory
    remote_exec "mkdir -p /var/log/pm2"
    
    # Stop existing instance if running
    remote_exec "pm2 delete $PM2_APP_NAME" true >/dev/null 2>&1 || true
    
    # Start with PM2
    if remote_exec "cd /var/www/myapp && pm2 start ecosystem.config.js"; then
        log_success "Web application started with PM2"
        
        # Wait for service to be ready
        if wait_for_service "remote" "127.0.0.1" "$WEB_PORT" 20; then
            local web_url=$(get_component_url "web" "remote" "$MODE")
            log_success "Web application is running at $web_url"
        else
            log_error "Web application failed to start properly"
            return 1
        fi
    else
        log_error "Failed to start web application with PM2"
        return 1
    fi
}

# Stop web application remotely
stop_remote() {
    if ! check_remote_connection; then
        return 1
    fi
    
    log_info "Stopping remote web application..."
    
    if remote_exec "pm2 stop $PM2_APP_NAME" true; then
        log_success "Web application stopped"
    else
        log_warning "Failed to stop web application (may not be running)"
    fi
}

# Show web application logs
show_logs() {
    local location="$1"
    local lines="${2:-50}"
    
    if [[ "$location" == "local" ]]; then
        if [[ -f "/tmp/techni-web.log" ]]; then
            echo -e "${CYAN}=== Local Web Logs (last $lines lines) ===${NC}"
            tail -n "$lines" /tmp/techni-web.log
        else
            log_warning "No local web logs found"
        fi
    else
        if ! check_remote_connection; then
            return 1
        fi
        
        echo -e "${CYAN}=== Remote Web Logs (last $lines lines) ===${NC}"
        remote_exec "pm2 logs $PM2_APP_NAME --lines $lines" || log_warning "No remote web logs found"
    fi
}

# Show web application status
show_status() {
    local location="$1"
    
    echo -e "${CYAN}=== Web Application Status ($location) ===${NC}"
    
    if [[ "$location" == "local" ]]; then
        if is_local_process_running "next" "$WEB_PORT" || is_local_process_running "node.*next" "$WEB_PORT"; then
            echo -e "${GREEN}✓ Web application is running locally on port $WEB_PORT${NC}"
            
            if [[ -f "/tmp/techni-web.pid" ]]; then
                local pid=$(cat /tmp/techni-web.pid)
                echo "  PID: $pid"
            fi
        else
            echo -e "${RED}✗ Web application is not running locally${NC}"
        fi
    else
        if ! check_remote_connection; then
            return 1
        fi
        
        echo "Remote Web Application Status:"
        remote_exec "pm2 list | grep $PM2_APP_NAME" || echo "PM2 process not found"
    fi
}

# Test web application
test_web() {
    local location="$1"
    
    configure_environment "$location" "$MODE"
    
    local web_url=$(get_component_url "web" "$location" "$MODE")
    
    log_info "Testing web application at: $web_url"
    
    if command -v curl >/dev/null 2>&1; then
        if curl -s "$web_url" >/dev/null; then
            log_success "Web application is responding"
        else
            log_error "Web application is not responding"
            return 1
        fi
    else
        log_warning "curl not available for testing"
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
            build_web "$MODE"
            if [[ "$LOCATION" == "remote" ]]; then
                deploy_remote
                start_remote
            else
                start_local
            fi
            ;;
        "build")
            build_web "$MODE"
            ;;
        "deploy")
            if [[ "$LOCATION" == "remote" ]]; then
                deploy_remote
            else
                log_error "Deploy action only applicable for remote location"
                exit 1
            fi
            ;;
        "test")
            test_web "$LOCATION"
            ;;
        "status")
            show_status "$LOCATION"
            ;;
        "logs")
            show_logs "$LOCATION"
            ;;
        *)
            log_error "Unknown action: $ACTION"
            echo "Available actions: start, stop, restart, rebuild, build, deploy, test, status, logs"
            exit 1
            ;;
    esac
}

main
