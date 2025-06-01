# Picture Live Backend

实时照片分享平台后端服务 - 为摄影师和客户提供实时照片分享体验。

## 🚀 项目概述

Picture Live Backend 是一个基于 Node.js 的高性能后端服务，专为实时照片分享场景设计。支持摄影师实时上传照片，客户端实时查看和互动，提供完整的会话管理、用户认证、文件处理和实时通信功能。

### 核心特性

- 🔐 **完整的用户认证系统** - JWT + Redis 会话管理
- 📸 **智能照片处理** - 多分辨率生成、水印添加、EXIF处理
- ⚡ **实时通信** - WebSocket 支持实时消息和状态更新
- 🎯 **会话管理** - 灵活的拍摄会话创建和访问控制
- 🛡️ **安全防护** - 速率限制、输入验证、SQL注入防护
- 📊 **性能监控** - 详细的日志记录和性能指标
- 🔄 **数据库迁移** - 自动化的数据库版本管理
- 🐳 **容器化部署** - Docker 支持

## 🏗️ 技术架构

### 核心技术栈

- **运行时**: Node.js 16+
- **框架**: Express.js
- **数据库**: PostgreSQL 13+
- **缓存**: Redis 6+
- **实时通信**: Socket.IO
- **图片处理**: Sharp + Jimp
- **认证**: JWT + bcryptjs
- **日志**: Winston
- **测试**: Jest + Supertest

### 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.js  # 数据库配置
│   │   └── redis.js     # Redis配置
│   ├── database/        # 数据库相关
│   │   ├── init/        # 初始化脚本
│   │   ├── migrations/  # 迁移文件
│   │   ├── seeds/       # 种子数据
│   │   └── migrator.js  # 迁移管理器
│   ├── middleware/      # 中间件
│   │   ├── auth.js      # 认证中间件
│   │   └── errorHandler.js # 错误处理
│   ├── routes/          # 路由定义
│   │   ├── auth.js      # 认证路由
│   │   ├── users.js     # 用户管理
│   │   ├── sessions.js  # 会话管理
│   │   └── photos.js    # 照片管理
│   ├── utils/           # 工具函数
│   │   ├── logger.js    # 日志工具
│   │   └── fileHandler.js # 文件处理
│   ├── websocket/       # WebSocket处理
│   │   └── socketHandler.js
│   ├── app.js           # 应用主文件
│   └── server.js        # 服务器启动文件
├── uploads/             # 文件上传目录
├── logs/                # 日志文件
├── tests/               # 测试文件
├── scripts/             # 脚本文件
├── docker/              # Docker配置
├── docs/                # 文档
├── .env.example         # 环境变量示例
├── package.json         # 项目配置
└── README.md           # 项目说明
```

## 🚀 快速开始

### 环境要求

- Node.js 16.0.0+
- PostgreSQL 13.0+
- Redis 6.0+
- npm 8.0.0+

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-org/picture-live-backend.git
cd picture-live-backend
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，填入实际配置
```

4. **设置数据库**
```bash
# 创建数据库
createdb picture_live

# 运行迁移
npm run migrate

# 加载种子数据（可选）
npm run seed
```

5. **启动服务**
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### Docker 部署

1. **使用 Docker Compose**
```bash
docker-compose up -d
```

2. **单独构建**
```bash
npm run docker:build
npm run docker:run
```

## 📚 API 文档

### 基础信息

- **Base URL**: `http://localhost:3001/api`
- **认证方式**: Bearer Token (JWT)
- **响应格式**: JSON

### 主要端点

#### 认证相关
```
POST /api/auth/register     # 用户注册
POST /api/auth/login        # 用户登录
POST /api/auth/refresh      # 刷新令牌
POST /api/auth/logout       # 用户登出
GET  /api/auth/profile      # 获取用户信息
```

#### 会话管理
```
GET    /api/sessions        # 获取会话列表
POST   /api/sessions        # 创建新会话
GET    /api/sessions/:id    # 获取会话详情
PUT    /api/sessions/:id    # 更新会话信息
DELETE /api/sessions/:id    # 删除会话
POST   /api/sessions/:id/verify # 验证访问码
```

#### 照片管理
```
GET    /api/photos          # 获取照片列表
POST   /api/photos/upload   # 上传照片
GET    /api/photos/:id      # 获取照片详情
PUT    /api/photos/:id      # 更新照片信息
DELETE /api/photos/:id      # 删除照片
POST   /api/photos/batch    # 批量操作
```

#### 用户管理
```
GET    /api/users/profile   # 获取用户资料
PUT    /api/users/profile   # 更新用户资料
POST   /api/users/change-password # 修改密码
GET    /api/users/stats     # 获取用户统计
```

### WebSocket 事件

#### 客户端发送
```javascript
// 加入会话
socket.emit('join_session', { sessionId, accessCode });

// 离开会话
socket.emit('leave_session', { sessionId });

// 发送消息
socket.emit('send_message', { sessionId, message, type });
```

#### 服务端推送
```javascript
// 新照片上传
socket.on('new_photo', (data) => { /* 处理新照片 */ });

// 照片状态更新
socket.on('photo_status_updated', (data) => { /* 处理状态更新 */ });

// 上传进度
socket.on('upload_progress', (data) => { /* 处理上传进度 */ });

// 实时消息
socket.on('new_message', (data) => { /* 处理新消息 */ });
```

## 🛠️ 开发指南

### 代码规范

项目使用 ESLint + Prettier 进行代码格式化：

```bash
# 检查代码规范
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

### 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 数据库操作

```bash
# 创建新迁移
node scripts/create-migration.js migration_name

# 运行迁移
npm run migrate

# 回滚迁移
npm run migrate:rollback

# 重置数据库
npm run db:reset
```

### 日志查看

```bash
# 查看所有日志
npm run logs

# 查看错误日志
npm run logs:error

# 实时监控
tail -f logs/combined.log
```

## 🔧 配置说明

### 环境变量

主要配置项说明：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 服务端口 | `3001` |
| `DB_HOST` | 数据库主机 | `localhost` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_NAME` | 数据库名称 | `picture_live` |
| `REDIS_HOST` | Redis主机 | `localhost` |
| `REDIS_PORT` | Redis端口 | `6379` |
| `JWT_SECRET` | JWT密钥 | - |
| `UPLOAD_DIR` | 上传目录 | `uploads` |
| `MAX_FILE_SIZE` | 最大文件大小 | `10485760` (10MB) |

### 数据库配置

支持连接池配置：

```javascript
{
  max: 20,              // 最大连接数
  idleTimeoutMillis: 30000,  // 空闲超时
  connectionTimeoutMillis: 2000  // 连接超时
}
```

### Redis配置

支持集群和哨兵模式：

```javascript
{
  host: 'localhost',
  port: 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
}
```

## 📊 监控和运维

### 健康检查

```bash
# 检查服务状态
curl http://localhost:3001/health

# 检查WebSocket状态
curl http://localhost:3001/api/websocket/stats
```

### 性能监控

- **内存使用**: 自动监控内存使用情况
- **响应时间**: 记录API响应时间
- **错误率**: 统计错误发生频率
- **连接数**: 监控WebSocket连接数

### 日志管理

日志文件自动轮转：
- `error.log` - 错误日志
- `combined.log` - 综合日志
- `access.log` - 访问日志

### 备份策略

```bash
# 数据库备份
npm run backup

# 恢复数据
npm run restore
```

## 🚀 部署指南

### 生产环境部署

1. **环境准备**
```bash
# 安装 PM2
npm install -g pm2

# 设置环境变量
export NODE_ENV=production
```

2. **启动服务**
```bash
# 使用 PM2 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

3. **负载均衡**
```bash
# 启动多个实例
pm2 start ecosystem.config.js --instances max
```

### Docker 部署

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: picture_live
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
  
  redis:
    image: redis:6-alpine
```

### Nginx 配置

```nginx
server {
    listen 80;
    server_name api.picturelive.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 提交规范

使用 [Conventional Commits](https://conventionalcommits.org/) 规范：

```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建过程或辅助工具的变动
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

- 📧 邮箱: support@picturelive.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/your-org/picture-live-backend/issues)
- 📖 文档: [项目文档](https://docs.picturelive.com)
- 💬 讨论: [GitHub Discussions](https://github.com/your-org/picture-live-backend/discussions)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

**Picture Live Backend** - 让每一个瞬间都值得分享 ✨