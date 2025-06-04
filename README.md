# PictureLive 📸

一个专为摄影师和活动组织者设计的实时照片分享平台，让每个精彩瞬间都能即时分享。支持摄影师实时上传照片，观众可以通过访问码实时查看和下载照片。

## ✨ 核心功能

- 🔴 **实时照片直播** - 摄影师拍摄后即时上传，观众实时查看
- 🔐 **访问码保护** - 通过唯一访问码控制照片访问权限
- 📱 **多端支持** - Web端、移动端全平台覆盖
- 🎯 **智能分类** - 支持照片标签和分类管理
- 💾 **批量下载** - 观众可批量下载喜欢的照片
- 🎨 **精美界面** - 现代化UI设计，用户体验优秀
- ⚡ **高性能** - 优化的图片处理和传输机制

## 项目结构

```
picture-live/
├── backend/                 # 后端API服务
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── docker/
├── frontend/                # 前端Web应用
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── next.config.js
├── mobile/                  # Flutter移动端应用
│   ├── lib/
│   ├── android/
│   ├── ios/
│   └── pubspec.yaml
├── docs/                    # 文档
├── scripts/                 # 部署和工具脚本
└── docker-compose.yml       # 容器编排
```

## 🛠 技术栈

### 后端
- **框架**: Node.js + Express.js
- **数据库**: PostgreSQL + Redis
- **文件存储**: 本地存储 / 云存储
- **实时通信**: Socket.IO + WebSocket
- **图片处理**: Sharp + Multer
- **认证**: JWT + bcrypt
- **API文档**: 自动生成的RESTful API

### 前端
- **框架**: Next.js 14 + React 18
- **UI库**: Tailwind CSS + shadcn/ui
- **状态管理**: Zustand
- **HTTP客户端**: Axios
- **类型检查**: TypeScript
- **动画**: Framer Motion
- **表单**: React Hook Form + Zod

### 移动端
- **框架**: Flutter 3.x
- **相机**: camera插件
- **网络**: dio
- **状态管理**: Provider / Riverpod
- **本地存储**: SharedPreferences

## 🚀 开发进度

### ✅ 已完成功能
- [x] 项目框架搭建（前端 + 后端）
- [x] 用户认证系统（注册、登录、密码重置）
- [x] 会话管理系统（创建、加入、设置）
- [x] 实时照片上传和展示
- [x] WebSocket实时通信
- [x] 响应式UI界面
- [x] 照片批量上传
- [x] 访问码保护机制
- [x] 照片标签和分类
- [x] 用户权限管理

### 🔄 开发中功能
- [ ] 移动端应用开发
- [ ] 照片批量下载
- [ ] 图片压缩和多分辨率
- [ ] 性能优化
- [ ] 单元测试覆盖

### 📋 计划功能
- [ ] 图片水印功能
- [ ] 云存储集成
- [ ] AI自动标签
- [ ] 照片审核系统
- [ ] 断点续传
- [ ] 多语言支持
- [ ] 数据分析面板

## 🚀 快速开始

### 📋 环境要求
- **Node.js** >= 18.0.0
- **PostgreSQL** >= 13
- **Redis** >= 6.0
- **Flutter** >= 3.0.0 (移动端开发)
- **Git** 版本控制

### 📦 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/picture-live.git
cd picture-live
```

2. **安装依赖**
```bash
# 安装根目录依赖
npm install

# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install

# 移动端依赖（可选）
cd ../mobile
flutter pub get
```

3. **环境配置**
```bash
# 复制环境变量文件
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 编辑配置文件，设置数据库连接等信息
```

### 🔧 启动开发环境

```bash
# 方式1：使用Docker（推荐）
docker-compose up -d

# 方式2：手动启动各服务
# 启动数据库和Redis
docker-compose up -d postgres redis

# 启动后端API（新终端）
cd backend
npm run dev

# 启动前端（新终端）
cd frontend
npm run dev

# 启动移动端（新终端，可选）
cd mobile
flutter run
```

### 🌐 访问应用
- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:5000
- **API文档**: http://localhost:5000/api-docs

## 🤝 贡献指南

我们欢迎所有形式的贡献！无论是报告bug、提出新功能建议，还是提交代码改进。

### 📝 如何贡献

1. **Fork 项目**
   ```bash
   git clone https://github.com/your-username/picture-live.git
   ```

2. **创建功能分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **提交更改**
   ```bash
   git commit -m 'Add some amazing feature'
   ```

4. **推送到分支**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **创建 Pull Request**

### 🐛 报告问题
- 使用 [Issues](https://github.com/your-username/picture-live/issues) 报告bug
- 提供详细的复现步骤
- 包含系统环境信息

### 💡 功能建议
- 在 Issues 中提出新功能建议
- 详细描述功能需求和使用场景

### 📋 开发规范
- 遵循现有代码风格
- 添加必要的测试
- 更新相关文档
- 确保所有测试通过

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者们！

## 📞 联系我们

- 项目主页: [GitHub Repository](https://github.com/your-username/picture-live)
- 问题反馈: [Issues](https://github.com/your-username/picture-live/issues)
- 邮箱: junyuzhan@outlook.com

---

⭐ 如果这个项目对你有帮助，请给我们一个星标！