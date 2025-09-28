#!/bin/bash

# Health check utilities for TechniZlecenia deployment system

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# Check component status
check_component_status() {
    local component="$1"
    local location="$2"
    
    case "$component" in
        "api")
            check_api_status "$location"
            ;;
        "db")
            check_db_status "$location"
            ;;
        "web")
            check_web_status "$location"
            ;;
        *)
            log_error "Unknown component: $component"
            return 1
            ;;
    esac
}

# Check API status
check_api_status() {
    local location="$1"
    local port="8080"
    local url
    
    echo -n -e "${YELLOW}API ($location):${NC} "
    
    if [[ "$location" == "local" ]]; then
        url="http://localhost:$port"
        if is_local_process_running "techni-zlecenia-api" "$port"; then
            # Try health check endpoint
            if command -v curl >/dev/null 2>&1; then
                if curl -s "$url/health" >/dev/null 2>&1; then
                    echo -e "${GREEN}✓ Running and healthy${NC}"
                    return 0
                else
                    echo -e "${YELLOW}⚠ Running but not responding${NC}"
                    return 1
                fi
            else
                echo -e "${GREEN}✓ Process running${NC}"
                return 0
            fi
        else
            echo -e "${RED}✗ Not running${NC}"
            return 1
        fi
    else
        # Remote API check
        if [[ "$DEPLOY_MODE" == "prod" ]]; then
            url="https://api.oxylize.com"
        else
            url="http://206.189.52.131:$port"
        fi
        
        if is_remote_process_running "techni-zlecenia-api" "$port"; then
            # Try health check endpoint
            if command -v curl >/dev/null 2>&1; then
                if curl -s "$url/health" >/dev/null 2>&1; then
                    echo -e "${GREEN}✓ Running and healthy${NC}"
                    return 0
                else
                    echo -e "${YELLOW}⚠ Running but not responding${NC}"
                    return 1
                fi
            else
                echo -e "${GREEN}✓ Process running${NC}"
                return 0
            fi
        else
            echo -e "${RED}✗ Not running${NC}"
            return 1
        fi
    fi
}

# Check database status
check_db_status() {
    local location="$1"
    local port="5432"
    
    echo -n -e "${YELLOW}Database ($location):${NC} "
    
    if [[ "$location" == "local" ]]; then
        if is_local_process_running "postgres" "$port"; then
            # Try to connect to database
            if command -v psql >/dev/null 2>&1; then
                if PGPASSWORD=dev psql -h localhost -U dev -d techni-zlecenia -c "SELECT 1;" >/dev/null 2>&1; then
                    echo -e "${GREEN}✓ Running and accessible${NC}"
                    return 0
                else
                    echo -e "${YELLOW}⚠ Running but connection failed${NC}"
                    return 1
                fi
            else
                echo -e "${GREEN}✓ Process running${NC}"
                return 0
            fi
        else
            # Check if Docker container is running
            if command -v docker >/dev/null 2>&1; then
                if docker ps --filter "name=dev-database" --filter "status=running" -q | grep -q .; then
                    echo -e "${GREEN}✓ Running (Docker)${NC}"
                    return 0
                fi
            fi
            echo -e "${RED}✗ Not running${NC}"
            return 1
        fi
    else
        # Remote database check
        if is_remote_process_running "postgres" "$port"; then
            echo -n -e " (remote service running)"
            
            # Check if SSH tunnel is active for local access
            if is_ssh_tunnel_active "$port"; then
                echo -n -e " (tunnel active)"
                
                # Try to connect via tunnel
                if command -v psql >/dev/null 2>&1; then
                    if PGPASSWORD=dev psql -h localhost -U dev -d techni-zlecenia -c "SELECT 1;" >/dev/null 2>&1; then
                        echo -e " ${GREEN}✓ Running and accessible via tunnel${NC}"
                        return 0
                    else
                        echo -e " ${YELLOW}⚠ Tunnel active but connection failed${NC}"
                        return 1
                    fi
                else
                    echo -e " ${GREEN}✓ Service and tunnel running${NC}"
                    return 0
                fi
            else
                echo -e " ${YELLOW}⚠ Service running but no tunnel${NC}"
                return 1
            fi
        else
            echo -e "${RED}✗ Not running${NC}"
            return 1
        fi
    fi
}

# Check web frontend status
check_web_status() {
    local location="$1"
    local port="3000"
    local url
    
    echo -n -e "${YELLOW}Web ($location):${NC} "
    
    if [[ "$location" == "local" ]]; then
        url="http://localhost:$port"
        if is_local_process_running "next" "$port" || is_local_process_running "node" "$port"; then
            # Try to access the frontend
            if command -v curl >/dev/null 2>&1; then
                if curl -s "$url" >/dev/null 2>&1; then
                    echo -e "${GREEN}✓ Running and accessible${NC}"
                    return 0
                else
                    echo -e "${YELLOW}⚠ Running but not responding${NC}"
                    return 1
                fi
            else
                echo -e "${GREEN}✓ Process running${NC}"
                return 0
            fi
        else
            echo -e "${RED}✗ Not running${NC}"
            return 1
        fi
    else
        # Remote web check
        if [[ "$DEPLOY_MODE" == "prod" ]]; then
            url="https://oxylize.com"
        else
            url="http://206.189.52.131:$port"
        fi
        
        if is_remote_process_running "next-server" "$port" || is_remote_process_running "node" "$port"; then
            # Try to access the remote frontend
            if command -v curl >/dev/null 2>&1; then
                if curl -s "$url" >/dev/null 2>&1; then
                    echo -e "${GREEN}✓ Running and accessible${NC}"
                    return 0
                else
                    echo -e "${YELLOW}⚠ Running but not responding${NC}"
                    return 1
                fi
            else
                echo -e "${GREEN}✓ Process running${NC}"
                return 0
            fi
        else
            echo -e "${RED}✗ Not running${NC}"
            return 1
        fi
    fi
}

# Comprehensive health check
health_check_all() {
    local api_location="$1"
    local db_location="$2"
    local web_location="$3"
    
    echo -e "${CYAN}=== Health Check Results ===${NC}"
    echo ""
    
    local api_status=0
    local db_status=0
    local web_status=0
    
    check_api_status "$api_location" || api_status=1
    check_db_status "$db_location" || db_status=1
    check_web_status "$web_location" || web_status=1
    
    echo ""
    
    local total_status=$((api_status + db_status + web_status))
    
    if [[ $total_status -eq 0 ]]; then
        echo -e "${GREEN}✓ All components are healthy${NC}"
        return 0
    elif [[ $total_status -eq 3 ]]; then
        echo -e "${RED}✗ All components are down${NC}"
        return 1
    else
        echo -e "${YELLOW}⚠ Some components have issues${NC}"
        return 1
    fi
}

# Check component connectivity
check_connectivity() {
    local api_location="$1"
    local db_location="$2"
    local web_location="$3"
    
    echo -e "${CYAN}=== Connectivity Check ===${NC}"
    echo ""
    
    # Check if web can reach API
    local api_url=$(get_component_url "api" "$api_location" "$DEPLOY_MODE")
    echo -n -e "${YELLOW}Web → API:${NC} "
    
    if command -v curl >/dev/null 2>&1; then
        if curl -s "$api_url/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Connected${NC}"
        else
            echo -e "${RED}✗ Cannot connect${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Cannot test (curl not available)${NC}"
    fi
    
    # Check if API can reach DB (always localhost due to SSH tunnel)
    echo -n -e "${YELLOW}API → Database:${NC} "
    
    # Database is always accessed via localhost (tunnel or local)
    local db_port="${DB_PORT:-5432}"
    
    if [[ "$db_location" == "remote" ]]; then
        # Check if SSH tunnel is active
        if is_ssh_tunnel_active "$db_port"; then
            echo -n -e "(via SSH tunnel) "
            if command -v nc >/dev/null 2>&1; then
                if nc -z localhost "$db_port" 2>/dev/null; then
                    echo -e "${GREEN}✓ Connected${NC}"
                else
                    echo -e "${RED}✗ Cannot connect${NC}"
                fi
            else
                echo -e "${YELLOW}⚠ Cannot test (nc not available)${NC}"
            fi
        else
            echo -e "${RED}✗ No SSH tunnel active${NC}"
        fi
    else
        # Local database
        if command -v nc >/dev/null 2>&1; then
            if nc -z localhost "$db_port" 2>/dev/null; then
                echo -e "${GREEN}✓ Connected${NC}"
            else
                echo -e "${RED}✗ Cannot connect${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ Cannot test (nc not available)${NC}"
        fi
    fi
}

# Check service logs for errors
check_service_logs() {
    local component="$1"
    local location="$2"
    local lines="${3:-20}"
    
    echo -e "${CYAN}=== Recent Logs for $component ($location) ===${NC}"
    echo ""
    
    case "$component" in
        "api")
            if [[ "$location" == "local" ]]; then
                if [[ -f "/tmp/techni-api.log" ]]; then
                    tail -n "$lines" "/tmp/techni-api.log"
                else
                    echo "No local API logs found"
                fi
            else
                remote_exec "journalctl -u techni-zlecenia-api --no-pager -n $lines" 2>/dev/null || echo "No remote API service logs found"
            fi
            ;;
        "web")
            if [[ "$location" == "local" ]]; then
                if [[ -f "/tmp/techni-web.log" ]]; then
                    tail -n "$lines" "/tmp/techni-web.log"
                else
                    echo "No local web logs found"
                fi
            else
                remote_exec "pm2 logs techni-zlecenia-web --lines $lines" 2>/dev/null || echo "No remote web logs found"
            fi
            ;;
        "db")
            if [[ "$location" == "local" ]]; then
                if command -v docker >/dev/null 2>&1; then
                    if docker ps --filter "name=dev-database" -q | grep -q .; then
                        docker logs --tail "$lines" dev-database 2>/dev/null
                    fi
                fi
            else
                remote_exec "journalctl -u postgresql --no-pager -n $lines" 2>/dev/null || echo "No remote database logs found"
            fi
            ;;
    esac
}
