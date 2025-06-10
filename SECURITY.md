# 安全配置指南

本文档描述了项目中的安全配置和已修复的安全问题。

## 已修复的安全问题

### 1. 敏感信息泄露

**问题描述：**
- 认证路由中的 `console.log` 输出包含JWT密钥、用户信息、token等敏感数据
- 密码修复脚本输出明文密码和哈希值
- 错误处理中间件在生产环境记录请求体，可能包含密码等敏感信息

**修复措施：**
- 移除认证路由中的敏感信息输出
- 只在开发环境记录非敏感的调试信息
- 错误处理中间件只在开发环境记录请求体
- 密码修复脚本不再输出敏感信息

### 2. 硬编码密码和密钥

**问题描述：**
- `docker-compose.yml` 中包含硬编码的数据库密码、Redis密码、JWT密钥

**修复措施：**
- 创建了 `docker-compose.secure.yml` 使用环境变量
- 提供了 `.env.docker.example` 配置示例
- 所有敏感配置通过环境变量管理

### 3. SQL查询参数错误

**问题描述：**
- 用户搜索功能中，同一个参数被用于多个ILIKE条件，但只传递了一个值

**修复措施：**
- 修正了SQL参数绑定，为每个ILIKE条件提供独立的参数值

## 安全最佳实践

### 1. 环境变量管理

```bash
# 生产环境必须设置的环境变量
JWT_SECRET=your_super_secure_jwt_secret_key_at_least_32_characters_long
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key_different_from_jwt_secret
POSTGRES_PASSWORD=your_secure_postgres_password_here
REDIS_PASSWORD=your_secure_redis_password_here
```

### 2. 密码策略

- 使用强密码，至少包含大小写字母、数字和特殊字符
- JWT_SECRET 和 JWT_REFRESH_SECRET 应该是不同的随机字符串
- 定期更换密码和密钥
- 密钥长度至少32字符

### 3. 日志安全

- 生产环境不记录敏感信息（密码、token、个人数据）
- 使用结构化日志，便于安全审计
- 定期清理和归档日志文件

### 4. 数据库安全

- 使用参数化查询防止SQL注入
- 限制数据库用户权限
- 定期备份数据库
- 启用数据库审计日志

### 5. 部署安全

**使用安全的Docker配置：**
```bash
# 使用安全的docker-compose配置
cp docker-compose.secure.yml docker-compose.yml
cp .env.docker.example .env
# 编辑.env文件，填入实际的安全配置
```

**生产环境检查清单：**
- [ ] 所有默认密码已更改
- [ ] JWT密钥已设置为强随机字符串
- [ ] 数据库密码已设置为强密码
- [ ] Redis密码已设置
- [ ] NODE_ENV设置为production
- [ ] 日志级别适当设置
- [ ] HTTPS已启用
- [ ] 防火墙规则已配置

### 6. 代码安全

- 不在代码中硬编码密码、密钥或其他敏感信息
- 使用环境变量管理配置
- 定期更新依赖包，修复安全漏洞
- 进行代码安全审查

### 7. 监控和审计

- 监控异常登录活动
- 记录重要操作的审计日志
- 设置安全告警
- 定期进行安全评估

## 安全联系方式

如果发现安全问题，请通过以下方式报告：
- 邮箱：security@yourcompany.com
- 创建私有issue

## 更新记录

- 2024-01-XX: 修复敏感信息泄露问题
- 2024-01-XX: 修复硬编码密码问题
- 2024-01-XX: 修复SQL查询参数错误