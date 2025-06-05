# Picture Live Docker 部署指南

本目录包含了 Picture Live 应用的完整 Docker 部署配置，支持开发环境和生产环境的快速部署。

## 📁 目录结构

```
docker/
├── backend/                    # 后端 Docker 配置
│   ├── Dockerfile             # 生产环境 Dockerfile
│   └── Dockerfile.dev         # 开发环境 Dockerfile
├── frontend/                   # 前端 Docker 配置
│   ├── Dockerfile             # 生产环境 Dockerfile
│   └── Dockerfile.dev         # 开发环境 Dockerfile
├── nginx/                      # Nginx 配置
│   ├── nginx.conf             # 主配置文件
│   └── conf.d/
│       └── default.conf       # 站点配置
├── redis/                      # Redis 配置
│   └── redis.conf             # Redis 配置文件
├── docker-compose.yml          # 生产环境编排文件
├── docker-compose.dev.yml      # 开发环境编排文件
├── .env                        # 环境变量模板
├── deploy.sh                   # Linux/macOS 部署脚本
├── deploy.ps1                  # Windows PowerShell 部署脚本
└── README.md                   # 本文档
```

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- Git

### 1. 克隆项目

```bash
git clone <repository-url>
cd picture-live
```

### 2. 进入 Docker 目录

```bash
cd docker
```

### 3. 选择部署方式

#### 开发环境（推荐用于开发和测试）

**Linux/macOS:**
```bash
./deploy.sh dev
```

**Windows PowerShell:**
```powershell
.\deploy.ps1 dev
```

**手动启动:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

#### 生产环境

**Linux/macOS:**
```bash
./deploy.sh prod
```

**Windows PowerShell:**
```powershell
.\deploy.ps1 prod
```

**手动启动:**
```bash
# 1. 创建环境变量文件
cp .env .env.local
# 2. 编辑配置（重要！）
nano .env.local
# 3. 构建并启动
docker-compose build
docker-compose --env-file .env.local up -d
```

## 🔧 配置说明

### 环境变量配置

复制 `.env` 文件为 `.env.local` 并根据实际环境修改：

```bash
cp .env .env.local
```

重要配置项：

```env
# 数据库配置
DB_PASSWORD=your_secure_password

# JWT 密钥（必须修改）
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# CORS 配置
CORS_ORIGINS=https://yourdomain.com

# Redis 密码（生产环境推荐）
REDIS_PASSWORD=your_redis_password
```

### 服务端口说明

#### 开发环境
- 前端: http://localhost:3000
- 后端 API: http://localhost:3002
- PostgreSQL: localhost:5433
- Redis: localhost:6380

#### 生产环境
- 应用入口: http://localhost (Nginx)
- API 接口: http://localhost/api
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 📋 常用命令

### 使用部署脚本（推荐）

```bash
# 查看帮助
./deploy.sh help

# 启动开发环境
./deploy.sh dev

# 启动生产环境
./deploy.sh prod

# 查看服务状态
./deploy.sh status

# 查看日志
./deploy.sh logs
./deploy.sh logs api  # 查看特定服务日志

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 备份数据库
./deploy.sh backup

# 恢复数据库
./deploy.sh restore backup_20240101_120000.sql

# 清理资源
./deploy.sh cleanup
```

### 手动 Docker Compose 命令

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps

# 重启特定服务
docker-compose restart api

# 进入容器
docker-compose exec api bash
docker-compose exec postgres psql -U postgres picture_live
```

## 🔍 故障排除

### 常见问题

#### 1. 端口冲突
```bash
# 检查端口占用
netstat -tulpn | grep :3000
# 或者修改 docker-compose.yml 中的端口映射
```

#### 2. 数据库连接失败
```bash
# 检查数据库容器状态
docker-compose ps postgres
# 查看数据库日志
docker-compose logs postgres
```

#### 3. 镜像构建失败
```bash
# 清理 Docker 缓存
docker system prune -a
# 重新构建
docker-compose build --no-cache
```

#### 4. 权限问题（Linux/macOS）
```bash
# 给脚本执行权限
chmod +x deploy.sh
```

### 查看详细日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs api
docker-compose logs postgres
docker-compose logs redis

# 实时跟踪日志
docker-compose logs -f api
```

### 数据持久化

数据存储在 Docker volumes 中：
- `postgres_data`: PostgreSQL 数据
- `redis_data`: Redis 数据
- `uploads_data`: 上传的文件
- `logs_data`: 应用日志

```bash
# 查看 volumes
docker volume ls

# 备份 volume
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

## 🔒 安全建议

### 生产环境安全配置

1. **修改默认密码**
   ```env
   DB_PASSWORD=strong_database_password
   REDIS_PASSWORD=strong_redis_password
   ```

2. **更新 JWT 密钥**
   ```env
   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-different-from-jwt
   ```

3. **配置 HTTPS**
   - 获取 SSL 证书
   - 修改 `nginx/conf.d/default.conf`
   - 启用 HTTPS 服务器块

4. **限制网络访问**
   ```yaml
   # 在 docker-compose.yml 中移除不必要的端口暴露
   # 只保留 Nginx 的 80 和 443 端口
   ```

5. **定期更新**
   ```bash
   # 更新基础镜像
   docker-compose pull
   docker-compose up -d
   ```

## 📊 监控和维护

### 健康检查

所有服务都配置了健康检查：

```bash
# 查看健康状态
docker-compose ps

# 手动健康检查
curl http://localhost:3001/health  # API 健康检查
curl http://localhost:3000         # 前端健康检查
```

### 日志轮转

配置 Docker 日志轮转：

```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### 定期备份

建议设置定时任务进行数据备份：

```bash
# 添加到 crontab
0 2 * * * cd /path/to/picture-live/docker && ./deploy.sh backup
```

## 🆙 更新和升级

### 应用更新

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建镜像
docker-compose build

# 3. 重启服务
docker-compose up -d
```

### 数据库迁移

```bash
# 进入 API 容器执行迁移
docker-compose exec api npm run migrate
```

## 📞 支持

如果遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查服务日志：`docker-compose logs`
3. 提交 Issue 到项目仓库

---

**注意**: 生产环境部署前，请务必修改所有默认密码和密钥！