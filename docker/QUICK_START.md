# Picture Live Docker 快速启动指南

## 🚀 5分钟快速部署

### 步骤 1: 准备环境

确保已安装：
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac)
- 或 Docker + Docker Compose (Linux)

### 步骤 2: 克隆项目

```bash
git clone <your-repository-url>
cd picture-live/docker
```

### 步骤 3: 选择部署模式

#### 🔧 开发环境（推荐新手）

**Windows:**
```powershell
.\deploy.ps1 dev
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh dev
```

**访问地址:**
- 前端: http://localhost:3000
- 后端: http://localhost:3002
- 数据库: localhost:5433

#### 🏭 生产环境

**Windows:**
```powershell
# 1. 配置环境变量
cp .env .env.local
# 2. 编辑 .env.local 文件（重要！）
notepad .env.local
# 3. 启动
.\deploy.ps1 prod
```

**Linux/Mac:**
```bash
# 1. 配置环境变量
cp .env .env.local
# 2. 编辑配置文件
nano .env.local
# 3. 启动
./deploy.sh prod
```

**访问地址:**
- 应用: http://localhost
- API: http://localhost/api

### 步骤 4: 验证部署

```bash
# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs
```

## 🔑 默认账户

- **管理员账户:**
  - 用户名: `admin`
  - 密码: `admin123`
  - 邮箱: `admin@example.com`

## 📋 常用操作

```bash
# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看日志
./deploy.sh logs

# 备份数据
./deploy.sh backup

# 清理资源
./deploy.sh cleanup
```

## ⚠️ 重要提醒

### 生产环境必须修改的配置：

1. **数据库密码**
   ```env
   DB_PASSWORD=your_secure_password
   ```

2. **JWT 密钥**
   ```env
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
   ```

3. **域名配置**
   ```env
   CORS_ORIGINS=https://yourdomain.com
   ```

## 🆘 遇到问题？

### 常见解决方案：

1. **端口被占用**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   # Linux/Mac
   lsof -i :3000
   ```

2. **权限问题 (Linux/Mac)**
   ```bash
   chmod +x deploy.sh
   ```

3. **Docker 服务未启动**
   ```bash
   # 启动 Docker Desktop 或
   sudo systemctl start docker
   ```

4. **清理并重新开始**
   ```bash
   ./deploy.sh cleanup
   ./deploy.sh dev
   ```

### 查看详细日志：
```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务
docker-compose logs api
docker-compose logs postgres
```

---

**需要更多帮助？** 查看完整的 [README.md](./README.md) 文档。