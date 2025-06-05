#!/bin/bash

# Picture Live Docker 部署脚本
# 用于快速部署和管理 Picture Live 应用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查 Docker 和 Docker Compose
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 创建环境变量文件
setup_env() {
    if [ ! -f ".env.local" ]; then
        log_info "创建环境变量文件..."
        cp .env .env.local
        log_warning "请编辑 .env.local 文件配置生产环境参数"
    fi
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."
    docker-compose build --no-cache
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    local env_file="${1:-.env.local}"
    log_info "启动服务 (使用配置文件: $env_file)..."
    docker-compose --env-file "$env_file" up -d
    log_success "服务启动完成"
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    docker-compose down
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    docker-compose restart
    log_success "服务重启完成"
}

# 查看日志
view_logs() {
    local service="$1"
    if [ -z "$service" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$service"
    fi
}

# 查看状态
view_status() {
    log_info "服务状态:"
    docker-compose ps
}

# 清理资源
cleanup() {
    log_info "清理 Docker 资源..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    log_success "清理完成"
}

# 开发环境
dev_mode() {
    log_info "启动开发环境..."
    docker-compose -f docker-compose.dev.yml up -d
    log_success "开发环境启动完成"
    log_info "访问地址:"
    echo "  - 前端: http://localhost:3000"
    echo "  - 后端: http://localhost:3002"
    echo "  - 数据库: localhost:5433"
    echo "  - Redis: localhost:6380"
}

# 生产环境
prod_mode() {
    setup_env
    build_images
    start_services
    log_success "生产环境启动完成"
    log_info "访问地址:"
    echo "  - 应用: http://localhost"
    echo "  - API: http://localhost/api"
}

# 数据库备份
backup_db() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    log_info "备份数据库到 $backup_file..."
    docker-compose exec postgres pg_dump -U postgres picture_live > "$backup_file"
    log_success "数据库备份完成: $backup_file"
}

# 数据库恢复
restore_db() {
    local backup_file="$1"
    if [ -z "$backup_file" ]; then
        log_error "请指定备份文件"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    log_info "从 $backup_file 恢复数据库..."
    docker-compose exec -T postgres psql -U postgres picture_live < "$backup_file"
    log_success "数据库恢复完成"
}

# 显示帮助信息
show_help() {
    echo "Picture Live Docker 部署脚本"
    echo ""
    echo "用法: $0 [命令] [参数]"
    echo ""
    echo "命令:"
    echo "  dev                    启动开发环境"
    echo "  prod                   启动生产环境"
    echo "  build                  构建镜像"
    echo "  start [env_file]       启动服务"
    echo "  stop                   停止服务"
    echo "  restart                重启服务"
    echo "  status                 查看服务状态"
    echo "  logs [service]         查看日志"
    echo "  cleanup                清理 Docker 资源"
    echo "  backup                 备份数据库"
    echo "  restore <backup_file>  恢复数据库"
    echo "  help                   显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 dev                 # 启动开发环境"
    echo "  $0 prod                # 启动生产环境"
    echo "  $0 logs api            # 查看 API 服务日志"
    echo "  $0 backup              # 备份数据库"
    echo "  $0 restore backup.sql  # 恢复数据库"
}

# 主函数
main() {
    check_dependencies
    
    case "$1" in
        "dev")
            dev_mode
            ;;
        "prod")
            prod_mode
            ;;
        "build")
            build_images
            ;;
        "start")
            start_services "$2"
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            view_status
            ;;
        "logs")
            view_logs "$2"
            ;;
        "cleanup")
            cleanup
            ;;
        "backup")
            backup_db
            ;;
        "restore")
            restore_db "$2"
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"