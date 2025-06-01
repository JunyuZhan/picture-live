# 个人照片直播应用

一个专为摄影师和活动组织者设计的实时照片分享平台，支持拍摄端实时上传和观看端实时查看。

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

## 技术栈

### 后端
- **框架**: Node.js + Express
- **数据库**: PostgreSQL + Redis
- **文件存储**: 本地存储 / 阿里云OSS
- **实时通信**: Socket.IO
- **图片处理**: Sharp

### 前端
- **框架**: Next.js + React
- **UI库**: Tailwind CSS
- **状态管理**: Zustand
- **HTTP客户端**: Axios

### 移动端
- **框架**: Flutter
- **相机**: camera插件
- **网络**: dio
- **状态管理**: Provider

## 开发阶段

### 第一阶段：MVP版本（4-6周）
- [x] 项目框架搭建
- [ ] 后端API基础架构
- [ ] 前端界面开发
- [ ] 移动端应用开发
- [ ] 集成测试

### 第二阶段：功能增强（6-8周）
- [ ] 访问码保护
- [ ] 图片水印
- [ ] 多分辨率支持
- [ ] 云存储集成
- [ ] 性能优化

### 第三阶段：高级功能（8-10周）
- [ ] AI自动标签
- [ ] 照片审核系统
- [ ] 断点续传
- [ ] 多语言支持
- [ ] 商业化功能

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- PostgreSQL >= 13
- Redis >= 6.0
- Flutter >= 3.0.0

### 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install

# 移动端
cd mobile
flutter pub get
```

### 启动开发环境

```bash
# 启动数据库和Redis（使用Docker）
docker-compose up -d postgres redis

# 启动后端API
cd backend
npm run dev

# 启动前端（新终端）
cd frontend
npm run dev

# 启动移动端（新终端）
cd mobile
flutter run
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件