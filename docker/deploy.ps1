# Picture Live Docker 部署脚本 (PowerShell)
# 用于在 Windows 环境下快速部署和管理 Picture Live 应用

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    [Parameter(Position=1)]
    [string]$Parameter
)

# 颜色定义
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# 日志函数
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    switch ($Level) {
        "Info" { Write-Host "[$timestamp] [INFO] $Message" -ForegroundColor $Colors.Blue }
        "Success" { Write-Host "[$timestamp] [SUCCESS] $Message" -ForegroundColor $Colors.Green }
        "Warning" { Write-Host "[$timestamp] [WARNING] $Message" -ForegroundColor $Colors.Yellow }
        "Error" { Write-Host "[$timestamp] [ERROR] $Message" -ForegroundColor $Colors.Red }
    }
}

# 检查依赖
function Test-Dependencies {
    Write-Log "检查依赖..." "Info"
    
    try {
        $null = Get-Command docker -ErrorAction Stop
        Write-Log "Docker 已安装" "Success"
    }
    catch {
        Write-Log "Docker 未安装，请先安装 Docker Desktop" "Error"
        exit 1
    }
    
    try {
        $null = Get-Command docker-compose -ErrorAction Stop
        Write-Log "Docker Compose 已安装" "Success"
    }
    catch {
        Write-Log "Docker Compose 未安装，请先安装 Docker Compose" "Error"
        exit 1
    }
    
    Write-Log "依赖检查通过" "Success"
}

# 创建环境变量文件
function Initialize-Environment {
    if (-not (Test-Path ".env.local")) {
        Write-Log "创建环境变量文件..." "Info"
        Copy-Item ".env" ".env.local"
        Write-Log "请编辑 .env.local 文件配置生产环境参数" "Warning"
    }
}

# 构建镜像
function Build-Images {
    Write-Log "构建 Docker 镜像..." "Info"
    try {
        docker-compose build --no-cache
        Write-Log "镜像构建完成" "Success"
    }
    catch {
        Write-Log "镜像构建失败: $($_.Exception.Message)" "Error"
        exit 1
    }
}

# 启动服务
function Start-Services {
    param([string]$EnvFile = ".env.local")
    
    Write-Log "启动服务 (使用配置文件: $EnvFile)..." "Info"
    try {
        docker-compose --env-file $EnvFile up -d
        Write-Log "服务启动完成" "Success"
    }
    catch {
        Write-Log "服务启动失败: $($_.Exception.Message)" "Error"
        exit 1
    }
}

# 停止服务
function Stop-Services {
    Write-Log "停止服务..." "Info"
    try {
        docker-compose down
        Write-Log "服务已停止" "Success"
    }
    catch {
        Write-Log "停止服务失败: $($_.Exception.Message)" "Error"
    }
}

# 重启服务
function Restart-Services {
    Write-Log "重启服务..." "Info"
    try {
        docker-compose restart
        Write-Log "服务重启完成" "Success"
    }
    catch {
        Write-Log "重启服务失败: $($_.Exception.Message)" "Error"
    }
}

# 查看日志
function Show-Logs {
    param([string]$Service)
    
    if ([string]::IsNullOrEmpty($Service)) {
        docker-compose logs -f
    } else {
        docker-compose logs -f $Service
    }
}

# 查看状态
function Show-Status {
    Write-Log "服务状态:" "Info"
    docker-compose ps
}

# 清理资源
function Clear-Resources {
    Write-Log "清理 Docker 资源..." "Info"
    try {
        docker-compose down -v --remove-orphans
        docker system prune -f
        Write-Log "清理完成" "Success"
    }
    catch {
        Write-Log "清理失败: $($_.Exception.Message)" "Error"
    }
}

# 开发环境
function Start-DevMode {
    Write-Log "启动开发环境..." "Info"
    try {
        docker-compose -f docker-compose.dev.yml up -d
        Write-Log "开发环境启动完成" "Success"
        Write-Log "访问地址:" "Info"
        Write-Host "  - 前端: http://localhost:3000" -ForegroundColor $Colors.White
        Write-Host "  - 后端: http://localhost:3002" -ForegroundColor $Colors.White
        Write-Host "  - 数据库: localhost:5433" -ForegroundColor $Colors.White
        Write-Host "  - Redis: localhost:6380" -ForegroundColor $Colors.White
    }
    catch {
        Write-Log "开发环境启动失败: $($_.Exception.Message)" "Error"
        exit 1
    }
}

# 生产环境
function Start-ProdMode {
    Initialize-Environment
    Build-Images
    Start-Services
    Write-Log "生产环境启动完成" "Success"
    Write-Log "访问地址:" "Info"
    Write-Host "  - 应用: http://localhost" -ForegroundColor $Colors.White
    Write-Host "  - API: http://localhost/api" -ForegroundColor $Colors.White
}

# 数据库备份
function Backup-Database {
    $backupFile = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    Write-Log "备份数据库到 $backupFile..." "Info"
    try {
        docker-compose exec postgres pg_dump -U postgres picture_live | Out-File -FilePath $backupFile -Encoding UTF8
        Write-Log "数据库备份完成: $backupFile" "Success"
    }
    catch {
        Write-Log "数据库备份失败: $($_.Exception.Message)" "Error"
    }
}

# 数据库恢复
function Restore-Database {
    param([string]$BackupFile)
    
    if ([string]::IsNullOrEmpty($BackupFile)) {
        Write-Log "请指定备份文件" "Error"
        return
    }
    
    if (-not (Test-Path $BackupFile)) {
        Write-Log "备份文件不存在: $BackupFile" "Error"
        return
    }
    
    Write-Log "从 $BackupFile 恢复数据库..." "Info"
    try {
        Get-Content $BackupFile | docker-compose exec -T postgres psql -U postgres picture_live
        Write-Log "数据库恢复完成" "Success"
    }
    catch {
        Write-Log "数据库恢复失败: $($_.Exception.Message)" "Error"
    }
}

# 显示帮助信息
function Show-Help {
    Write-Host "Picture Live Docker 部署脚本 (PowerShell)" -ForegroundColor $Colors.Blue
    Write-Host ""
    Write-Host "用法: .\deploy.ps1 [命令] [参数]" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "命令:" -ForegroundColor $Colors.Yellow
    Write-Host "  dev                    启动开发环境" -ForegroundColor $Colors.White
    Write-Host "  prod                   启动生产环境" -ForegroundColor $Colors.White
    Write-Host "  build                  构建镜像" -ForegroundColor $Colors.White
    Write-Host "  start [env_file]       启动服务" -ForegroundColor $Colors.White
    Write-Host "  stop                   停止服务" -ForegroundColor $Colors.White
    Write-Host "  restart                重启服务" -ForegroundColor $Colors.White
    Write-Host "  status                 查看服务状态" -ForegroundColor $Colors.White
    Write-Host "  logs [service]         查看日志" -ForegroundColor $Colors.White
    Write-Host "  cleanup                清理 Docker 资源" -ForegroundColor $Colors.White
    Write-Host "  backup                 备份数据库" -ForegroundColor $Colors.White
    Write-Host "  restore <backup_file>  恢复数据库" -ForegroundColor $Colors.White
    Write-Host "  help                   显示帮助信息" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "示例:" -ForegroundColor $Colors.Yellow
    Write-Host "  .\deploy.ps1 dev                 # 启动开发环境" -ForegroundColor $Colors.White
    Write-Host "  .\deploy.ps1 prod                # 启动生产环境" -ForegroundColor $Colors.White
    Write-Host "  .\deploy.ps1 logs api            # 查看 API 服务日志" -ForegroundColor $Colors.White
    Write-Host "  .\deploy.ps1 backup              # 备份数据库" -ForegroundColor $Colors.White
    Write-Host "  .\deploy.ps1 restore backup.sql  # 恢复数据库" -ForegroundColor $Colors.White
}

# 主函数
function Main {
    Test-Dependencies
    
    switch ($Command.ToLower()) {
        "dev" {
            Start-DevMode
        }
        "prod" {
            Start-ProdMode
        }
        "build" {
            Build-Images
        }
        "start" {
            Start-Services $Parameter
        }
        "stop" {
            Stop-Services
        }
        "restart" {
            Restart-Services
        }
        "status" {
            Show-Status
        }
        "logs" {
            Show-Logs $Parameter
        }
        "cleanup" {
            Clear-Resources
        }
        "backup" {
            Backup-Database
        }
        "restore" {
            Restore-Database $Parameter
        }
        "help" {
            Show-Help
        }
        default {
            Write-Log "未知命令: $Command" "Error"
            Show-Help
            exit 1
        }
    }
}

# 执行主函数
Main