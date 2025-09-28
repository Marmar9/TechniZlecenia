#!/bin/bash

# Common utilities for TechniZlecenia deployment system

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    if [[ "${DEBUG:-}" == "1" ]]; then
        echo -e "${PURPLE}[DEBUG]${NC} $1"
    fi
}

# Remote command execution
remote_exec() {
    local command="$1"
    local silent="${2:-false}"
    
    if [[ "$silent" == "true" ]]; then
        ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$DEPLOY_VPS_HOST" "$command" 2>/dev/null
    else
        ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$DEPLOY_VPS_HOST" "$command"
    fi
}

# Check if remote host is reachable
check_remote_connection() {
    if remote_exec "echo 'connection test'" true >/dev/null 2>&1; then
        return 0
    else
        log_error "Cannot connect to remote host: $DEPLOY_VPS_HOST"
        return 1
    fi
}

# Copy file to remote
copy_to_remote() {
    local local_path="$1"
    local remote_path="$2"
    
    scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$local_path" "$DEPLOY_VPS_HOST:$remote_path"
}

# Copy directory to remote
copy_dir_to_remote() {
    local local_path="$1"
    local remote_path="$2"
    
    scp -r -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$local_path" "$DEPLOY_VPS_HOST:$remote_path"
}

# Check if process is running locally
is_local_process_running() {
    local process_name="$1"
    local port="$2"
    
    if [[ -n "$port" ]]; then
        if command -v lsof >/dev/null 2>&1; then
            lsof -ti:$port >/dev/null 2>&1
        elif command -v ss >/dev/null 2>&1; then
            ss -tlnp | grep ":$port " >/dev/null 2>&1
        else
            netstat -tlnp 2>/dev/null | grep ":$port " >/dev/null 2>&1
        fi
    else
        pgrep -f "$process_name" >/dev/null 2>&1
    fi
}

# Check if process is running remotely
is_remote_process_running() {
    local process_name="$1"
    local port="$2"
    
    if [[ -n "$port" ]]; then
        remote_exec "ss -tlnp | grep ':$port '" true >/dev/null 2>&1
    else
        remote_exec "pgrep -f '$process_name'" true >/dev/null 2>&1
    fi
}

# Wait for service to be ready
wait_for_service() {
    local location="$1"
    local host="$2"
    local port="$3"
    local max_attempts="${4:-30}"
    local attempt=0
    
    log_info "Waiting for service at $host:$port..."
    
    while [[ $attempt -lt $max_attempts ]]; do
        if [[ "$location" == "local" ]]; then
            if command -v nc >/dev/null 2>&1; then
                if nc -z "$host" "$port" 2>/dev/null; then
                    log_success "Service is ready at $host:$port"
                    return 0
                fi
            elif command -v telnet >/dev/null 2>&1; then
                if echo "quit" | telnet "$host" "$port" 2>/dev/null | grep "Connected" >/dev/null; then
                    log_success "Service is ready at $host:$port"
                    return 0
                fi
            fi
        else
            if remote_exec "nc -z $host $port" true; then
                log_success "Service is ready at $host:$port"
                return 0
            fi
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    log_error "Service at $host:$port did not become ready within $((max_attempts * 2)) seconds"
    return 1
}

# Generate random secret
generate_secret() {
    local length="${1:-50}"
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 $length | tr -d '\n'
    else
        head -c $length /dev/urandom | base64 | tr -d '\n'
    fi
}

# Load environment file
load_env_file() {
    local env_file="$1"
    if [[ -f "$env_file" ]]; then
        log_debug "Loading environment from: $env_file"
        set -a
        source "$env_file"
        set +a
    else
        log_warning "Environment file not found: $env_file"
    fi
}

# Create directory if it doesn't exist
ensure_directory() {
    local location="$1"
    local dir_path="$2"
    
    if [[ "$location" == "local" ]]; then
        mkdir -p "$dir_path"
    else
        remote_exec "mkdir -p '$dir_path'"
    fi
}

# Check if command exists
command_exists() {
    local location="$1"
    local command="$2"
    
    if [[ "$location" == "local" ]]; then
        command -v "$command" >/dev/null 2>&1
    else
        remote_exec "command -v '$command'" true >/dev/null 2>&1
    fi
}

# Get current timestamp
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Backup file
backup_file() {
    local location="$1"
    local file_path="$2"
    local backup_suffix="${3:-$(date +%Y%m%d_%H%M%S)}"
    
    if [[ "$location" == "local" ]]; then
        if [[ -f "$file_path" ]]; then
            cp "$file_path" "${file_path}.backup_${backup_suffix}"
            log_info "Backed up $file_path to ${file_path}.backup_${backup_suffix}"
        fi
    else
        remote_exec "if [[ -f '$file_path' ]]; then cp '$file_path' '${file_path}.backup_${backup_suffix}'; fi"
        log_info "Backed up remote $file_path"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    local location="$1"
    local pattern="$2"
    local keep_count="${3:-5}"
    
    if [[ "$location" == "local" ]]; then
        find . -name "$pattern" -type f -print0 | xargs -0 ls -t | tail -n +$((keep_count + 1)) | xargs -r rm
    else
        remote_exec "find . -name '$pattern' -type f -print0 | xargs -0 ls -t | tail -n +$((keep_count + 1)) | xargs -r rm" true
    fi
}

# Validate environment
validate_environment() {
    local required_vars=("$@")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    return 0
}

# Get component URL
get_component_url() {
    local component="$1"
    local location="$2"
    local mode="$3"
    
    # Use environment variables or defaults
    local vps_ip="${VPS_IP:-206.189.52.131}"
    local api_port="${API_PORT:-8080}"
    local web_port="${WEB_PORT:-3000}"
    local db_port="${DB_PORT:-5432}"
    local prod_api_domain="${PROD_API_DOMAIN:-api.oxylize.com}"
    local prod_web_domain="${PROD_WEB_DOMAIN:-oxylize.com}"
    
    case "$component" in
        "api")
            if [[ "$location" == "remote" ]]; then
                if [[ "$mode" == "prod" ]]; then
                    echo "https://${prod_api_domain}"
                else
                    echo "http://${vps_ip}:${api_port}"
                fi
            else
                echo "http://localhost:${api_port}"
            fi
            ;;
        "web")
            if [[ "$location" == "remote" ]]; then
                if [[ "$mode" == "prod" ]]; then
                    echo "https://${prod_web_domain}"
                else
                    echo "http://${vps_ip}:${web_port}"
                fi
            else
                echo "http://localhost:${web_port}"
            fi
            ;;
        "db")
            if [[ "$location" == "remote" ]]; then
                echo "${vps_ip}:${db_port}"
            else
                echo "localhost:${db_port}"
            fi
            ;;
    esac
}

# Get database connection string
get_database_url() {
    local db_location="$1"
    local mode="$2"
    
    # Use environment variables or defaults
    local db_port="${DB_PORT:-5432}"
    local postgres_user="${POSTGRES_USER:-dev}"
    local postgres_password="${POSTGRES_PASSWORD:-dev}"
    local postgres_db="${POSTGRES_DB:-techni-zlecenia}"
    
    # Always use localhost - SSH tunnel handles remote connections
    echo "postgresql://${postgres_user}:${postgres_password}@localhost:${db_port}/${postgres_db}"
}

# SSH tunnel management for remote database
create_ssh_tunnel() {
    local db_location="$1"
    local db_port="${DB_PORT:-5432}"
    local vps_host="${VPS_HOST:-root@206.189.52.131}"
    
    if [[ "$db_location" != "remote" ]]; then
        log_debug "Database is local, no SSH tunnel needed"
        return 0
    fi
    
    # Check if tunnel already exists
    if is_ssh_tunnel_active "$db_port"; then
        log_info "SSH tunnel to database already active"
        return 0
    fi
    
    log_info "Creating SSH tunnel to remote database..."
    
    # Kill any existing tunnel on this port
    pkill -f "ssh.*${db_port}:localhost:${db_port}" 2>/dev/null || true
    sleep 1
    
    # Create new tunnel
    ssh -f -N -L "${db_port}:localhost:${db_port}" "$vps_host" 2>/dev/null
    
    if [[ $? -eq 0 ]]; then
        # Wait a moment for tunnel to establish
        sleep 2
        
        if is_ssh_tunnel_active "$db_port"; then
            log_success "SSH tunnel to database established (localhost:${db_port})"
            return 0
        else
            log_error "SSH tunnel failed to establish"
            return 1
        fi
    else
        log_error "Failed to create SSH tunnel to database"
        return 1
    fi
}

# Check if SSH tunnel is active
is_ssh_tunnel_active() {
    local port="$1"
    
    # Check if the port is bound and if there's an SSH process for it
    if command -v lsof >/dev/null 2>&1; then
        if lsof -ti:$port >/dev/null 2>&1 && pgrep -f "ssh.*${port}:localhost:${port}" >/dev/null 2>&1; then
            return 0
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -tlnp | grep ":$port " >/dev/null 2>&1 && pgrep -f "ssh.*${port}:localhost:${port}" >/dev/null 2>&1; then
            return 0
        fi
    fi
    
    return 1
}

# Close SSH tunnel
close_ssh_tunnel() {
    local db_port="${DB_PORT:-5432}"
    
    log_info "Closing SSH tunnel to database..."
    
    if pkill -f "ssh.*${db_port}:localhost:${db_port}" 2>/dev/null; then
        log_success "SSH tunnel closed"
    else
        log_warning "No SSH tunnel found to close"
    fi
}

# Ensure database connectivity (create tunnel if needed)
ensure_database_connectivity() {
    local db_location="$1"
    local db_port="${DB_PORT:-5432}"
    
    if [[ "$db_location" == "remote" ]]; then
        create_ssh_tunnel "$db_location"
    fi
    
    # Test database connectivity
    if wait_for_service "local" "localhost" "$db_port" 10; then
        log_success "Database is accessible at localhost:${db_port}"
        return 0
    else
        log_error "Database is not accessible at localhost:${db_port}"
        return 1
    fi
}
