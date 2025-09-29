#!/bin/bash

# TechniZlecenia Hybrid Deployment System
# Controls components across local and remote environments
# Usage: ./deploy.sh [options] <action> [components]

set -e

# Check prerequisites
check_prerequisites() {
    local missing_tools=()
    
    # Check for required tools
    if ! command -v ssh >/dev/null 2>&1; then
        missing_tools+=("ssh")
    fi
    
    if ! command -v scp >/dev/null 2>&1; then
        missing_tools+=("scp")
    fi
    
    # Check for optional but recommended tools
    if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Neither curl nor wget found. Health checks may be limited.${NC}"
    fi
    
    if ! command -v nc >/dev/null 2>&1 && ! command -v telnet >/dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Neither nc nor telnet found. Port checks may be limited.${NC}"
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        echo -e "${RED}Error: Missing required tools: ${missing_tools[*]}${NC}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load configuration from config.env
if [[ -f "$SCRIPT_DIR/config.env" ]]; then
    source "$SCRIPT_DIR/config.env"
else
    echo -e "${YELLOW}Warning: config.env not found, using defaults${NC}"
fi

# Set defaults if not defined in config.env
VPS_HOST="${VPS_HOST:-root@206.189.52.131}"
VPS_IP="${VPS_IP:-206.189.52.131}"
PROD_API_DOMAIN="${PROD_API_DOMAIN:-api.oxylize.com}"
PROD_WEB_DOMAIN="${PROD_WEB_DOMAIN:-oxylize.com}"
API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-3000}"
DB_PORT="${DB_PORT:-5432}"

# Load utilities
source "$SCRIPT_DIR/utils/common.sh"
source "$SCRIPT_DIR/utils/health-check.sh"

# Default configuration
API_LOCATION="local"
DB_LOCATION="local"
WEB_LOCATION="local"
MODE="dev"
ACTION=""
COMPONENTS=""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Help function
show_help() {
    echo -e "${CYAN}TechniZlecenia Hybrid Deployment System${NC}"
    echo ""
    echo "Usage: $0 [options] <action> [components]"
    echo ""
    echo -e "${YELLOW}Component Location Options:${NC}"
    echo "  --api=local|remote     API backend location (default: local)"
    echo "  --db=local|remote      Database location (default: local)"  
    echo "  --web=local|remote     Web frontend location (default: local)"
    echo ""
    echo -e "${YELLOW}Mode Options:${NC}"
    echo "  --mode=dev|prod        Deployment mode (default: dev)"
    echo ""
    echo -e "${YELLOW}Actions:${NC}"
    echo "  start [components]     Start specified components or all"
    echo "  stop [components]      Stop specified components or all"
    echo "  restart [components]   Restart specified components or all"
    echo "  rebuild [components]   Rebuild and restart components"
    echo "  status                 Show status of all components"
    echo "  logs [component]       Show logs for component"
    echo "  migrate               Run database migrations"
    echo "  tunnel                Manage SSH tunnel to remote database"
    echo "  config                Show current configuration"
    echo ""
    echo -e "${YELLOW}Components:${NC}"
    echo "  api                   Rust API backend"
    echo "  db                    PostgreSQL database"
    echo "  web                   Next.js frontend"
    echo "  all                   All components (default)"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 --api=remote --db=remote --web=local --mode=dev start"
    echo "  $0 --api=local --db=remote restart api"
    echo "  $0 --mode=prod --api=remote --web=remote start all"
    echo "  $0 status"
    echo "  $0 logs api"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --api=*)
            API_LOCATION="${1#*=}"
            shift
            ;;
        --db=*)
            DB_LOCATION="${1#*=}"
            shift
            ;;
        --web=*)
            WEB_LOCATION="${1#*=}"
            shift
            ;;
        --mode=*)
            MODE="${1#*=}"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        start|stop|restart|rebuild|status|logs|migrate|tunnel|config)
            ACTION="$1"
            shift
            ;;
        api|db|web|all)
            if [[ -z "$COMPONENTS" ]]; then
                COMPONENTS="$1"
            else
                COMPONENTS="$COMPONENTS $1"
            fi
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Default action and components
if [[ -z "$ACTION" ]]; then
    ACTION="status"
fi

if [[ -z "$COMPONENTS" ]]; then
    COMPONENTS="all"
fi

# Validate locations
for location in "$API_LOCATION" "$DB_LOCATION" "$WEB_LOCATION"; do
    if [[ "$location" != "local" && "$location" != "remote" ]]; then
        echo -e "${RED}Error: Location must be 'local' or 'remote', got: $location${NC}"
        exit 1
    fi
done

# Validate mode
if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
    echo -e "${RED}Error: Mode must be 'dev' or 'prod', got: $MODE${NC}"
    exit 1
fi

# Generate environment configuration based on component locations
generate_env_config() {
    local config_file="$1"
    local env_type="$2"  # "api", "web", or "db"
    
    case "$env_type" in
        "api")
            # API always connects to localhost (SSH tunnel handles remote DB)
            echo "DATABASE_URL=postgresql://${POSTGRES_USER:-dev}:${POSTGRES_PASSWORD:-dev}@localhost:${DB_PORT:-5432}/techni_zlecenia"
            ;;
        "web")
            # Web needs to know where the API is
            if [[ "$API_LOCATION" == "remote" ]]; then
                if [[ "$MODE" == "prod" ]]; then
                    echo "NEXT_PUBLIC_API_URL=https://${PROD_API_DOMAIN}"
                else
                    echo "NEXT_PUBLIC_API_URL=http://${VPS_IP}:${API_PORT}"
                fi
            else
                echo "NEXT_PUBLIC_API_URL=http://localhost:${API_PORT}"
            fi
            ;;
        "db")
            # Database configuration
            echo "POSTGRES_USER=${POSTGRES_USER:-dev}"
            echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-dev}"
            echo "POSTGRES_DB=${POSTGRES_DB:-techni-zlecenia}"
            ;;
    esac
}

# Component management functions
manage_component() {
    local component="$1"
    local action="$2"
    local location="$3"
    
    echo -e "${BLUE}[$component:$location] $action${NC}"
    
    if [[ "$location" == "local" ]]; then
        "$SCRIPT_DIR/components/${component}.sh" "$action" "local" "$MODE"
    else
        "$SCRIPT_DIR/components/${component}.sh" "$action" "remote" "$MODE"
    fi
}

# Status display
show_status() {
    echo -e "${CYAN}=== TechniZlecenia Component Status ===${NC}"
    echo ""
    echo -e "${YELLOW}Configuration:${NC}"
    echo "  API: $API_LOCATION ($MODE mode)"
    echo "  DB:  $DB_LOCATION ($MODE mode)"
    echo "  Web: $WEB_LOCATION ($MODE mode)"
    echo ""
    
    # Check each component
    check_component_status "api" "$API_LOCATION"
    check_component_status "db" "$DB_LOCATION"
    check_component_status "web" "$WEB_LOCATION"
    
    echo ""
    echo -e "${YELLOW}Environment URLs:${NC}"
    if [[ "$API_LOCATION" == "remote" ]]; then
        if [[ "$MODE" == "prod" ]]; then
            echo "  API: https://${PROD_API_DOMAIN}"
        else
            echo "  API: http://${VPS_IP}:${API_PORT}"
        fi
    else
        echo "  API: http://localhost:${API_PORT}"
    fi
    
    if [[ "$WEB_LOCATION" == "remote" ]]; then
        if [[ "$MODE" == "prod" ]]; then
            echo "  Web: https://${PROD_WEB_DOMAIN}"
        else
            echo "  Web: http://${VPS_IP}:${WEB_PORT}"
        fi
    else
        echo "  Web: http://localhost:${WEB_PORT}"
    fi
}

# Configuration display
show_config() {
    echo -e "${CYAN}=== Current Configuration ===${NC}"
    echo ""
    echo "API Location: $API_LOCATION"
    echo "DB Location: $DB_LOCATION"
    echo "Web Location: $WEB_LOCATION"
    echo "Mode: $MODE"
    echo ""
    echo -e "${YELLOW}Generated Environment Variables:${NC}"
    echo ""
    echo -e "${PURPLE}API Environment:${NC}"
    generate_env_config "" "api"
    echo ""
    echo -e "${PURPLE}Web Environment:${NC}"
    generate_env_config "" "web"
    echo ""
    echo -e "${PURPLE}DB Environment:${NC}"
    generate_env_config "" "db"
}

# Validate configuration
validate_config() {
    local errors=()
    
    # Validate VPS host format
    if [[ ! "$VPS_HOST" =~ ^[^@]+@[^@]+$ ]]; then
        errors+=("Invalid VPS_HOST format: $VPS_HOST (should be user@hostname)")
    fi
    
    # Validate ports are numbers
    if ! [[ "$API_PORT" =~ ^[0-9]+$ ]] || [[ "$API_PORT" -lt 1 || "$API_PORT" -gt 65535 ]]; then
        errors+=("Invalid API_PORT: $API_PORT (should be 1-65535)")
    fi
    
    if ! [[ "$WEB_PORT" =~ ^[0-9]+$ ]] || [[ "$WEB_PORT" -lt 1 || "$WEB_PORT" -gt 65535 ]]; then
        errors+=("Invalid WEB_PORT: $WEB_PORT (should be 1-65535)")
    fi
    
    if ! [[ "$DB_PORT" =~ ^[0-9]+$ ]] || [[ "$DB_PORT" -lt 1 || "$DB_PORT" -gt 65535 ]]; then
        errors+=("Invalid DB_PORT: $DB_PORT (should be 1-65535)")
    fi
    
    # Validate domains for production
    if [[ "$MODE" == "prod" ]]; then
        if [[ ! "$PROD_API_DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]]; then
            errors+=("Invalid PROD_API_DOMAIN: $PROD_API_DOMAIN")
        fi
        
        if [[ ! "$PROD_WEB_DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]]; then
            errors+=("Invalid PROD_WEB_DOMAIN: $PROD_WEB_DOMAIN")
        fi
    fi
    
    if [[ ${#errors[@]} -gt 0 ]]; then
        echo -e "${RED}Configuration errors found:${NC}"
        for error in "${errors[@]}"; do
            echo -e "  ${RED}✗${NC} $error"
        done
        echo ""
        echo "Please check your deploy/config.env file."
        exit 1
    fi
}

# Main execution
main() {
    # Check prerequisites first
    check_prerequisites
    
    # Validate configuration
    validate_config
    
    echo -e "${CYAN}TechniZlecenia Hybrid Deployment${NC}"
    echo -e "${YELLOW}API:${NC} $API_LOCATION | ${YELLOW}DB:${NC} $DB_LOCATION | ${YELLOW}Web:${NC} $WEB_LOCATION | ${YELLOW}Mode:${NC} $MODE"
    echo ""
    
    case "$ACTION" in
        "status")
            show_status
            ;;
        "config")
            show_config
            ;;
        "start"|"stop"|"restart"|"rebuild")
            if [[ "$COMPONENTS" == "all" ]]; then
                COMPONENTS="db api web"
            fi
            
            for component in $COMPONENTS; do
                case "$component" in
                    "api")
                        manage_component "api" "$ACTION" "$API_LOCATION"
                        ;;
                    "db")
                        manage_component "db" "$ACTION" "$DB_LOCATION"
                        ;;
                    "web")
                        manage_component "web" "$ACTION" "$WEB_LOCATION"
                        ;;
                    *)
                        echo -e "${RED}Unknown component: $component${NC}"
                        ;;
                esac
            done
            ;;
        "migrate")
            echo -e "${BLUE}Running database migrations...${NC}"
            manage_component "db" "migrate" "$DB_LOCATION"
            ;;
        "tunnel")
            echo -e "${BLUE}Managing SSH tunnel to database...${NC}"
            if [[ "$DB_LOCATION" == "remote" ]]; then
                if is_ssh_tunnel_active "${DB_PORT:-5432}"; then
                    echo -e "${GREEN}SSH tunnel is active${NC}"
                    echo "Database accessible at: localhost:${DB_PORT:-5432}"
                    echo ""
                    echo "To close tunnel: pkill -f 'ssh.*${DB_PORT:-5432}:localhost:${DB_PORT:-5432}'"
                else
                    echo -e "${YELLOW}Creating SSH tunnel...${NC}"
                    if create_ssh_tunnel "remote"; then
                        echo -e "${GREEN}SSH tunnel established${NC}"
                        echo "Database now accessible at: localhost:${DB_PORT:-5432}"
                    else
                        echo -e "${RED}Failed to create SSH tunnel${NC}"
                        exit 1
                    fi
                fi
            else
                echo -e "${YELLOW}Database is local, no tunnel needed${NC}"
            fi
            ;;
        "logs")
            if [[ -z "$COMPONENTS" || "$COMPONENTS" == "all" ]]; then
                echo -e "${RED}Please specify a component for logs${NC}"
                exit 1
            fi
            
            case "$COMPONENTS" in
                "api")
                    manage_component "api" "logs" "$API_LOCATION"
                    ;;
                "db")
                    manage_component "db" "logs" "$DB_LOCATION"
                    ;;
                "web")
                    manage_component "web" "logs" "$WEB_LOCATION"
                    ;;
                *)
                    echo -e "${RED}Unknown component: $COMPONENTS${NC}"
                    ;;
            esac
            ;;
        *)
            echo -e "${RED}Unknown action: $ACTION${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Save current configuration for component scripts
export DEPLOY_API_LOCATION="$API_LOCATION"
export DEPLOY_DB_LOCATION="$DB_LOCATION"
export DEPLOY_WEB_LOCATION="$WEB_LOCATION"
export DEPLOY_MODE="$MODE"
export DEPLOY_VPS_HOST="$VPS_HOST"

# Create config directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/config"

# Generate environment files
generate_env_config "$SCRIPT_DIR/config/current-api.env" "api" > "$SCRIPT_DIR/config/current-api.env"
generate_env_config "$SCRIPT_DIR/config/current-web.env" "web" > "$SCRIPT_DIR/config/current-web.env"
generate_env_config "$SCRIPT_DIR/config/current-db.env" "db" > "$SCRIPT_DIR/config/current-db.env"

# Execute main function
main

