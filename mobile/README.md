# Picture Live Mobile App

个人照片直播应用移动端 - 专为摄影师设计的实时照片上传应用

## 项目简介

Picture Live 是一款专为摄影师设计的实时照片分享应用，允许摄影师在拍摄过程中实时上传照片到直播相册中，客户可以实时查看拍摄进度和照片效果。

## 功能特性

### 核心功能
- 📸 **实时照片上传** - 支持相机拍摄和相册选择
- 🔴 **直播相册管理** - 创建、管理和参与照片直播相册
- 👥 **用户认证系统** - 注册、登录、密码重置
- 🖼️ **照片浏览** - 高质量照片查看和缩放
- 👤 **用户资料管理** - 个人信息和偏好设置
- ⚙️ **应用设置** - 主题、通知、隐私等设置

### 技术特性
- 🚀 **高性能网络** - 基于 Dio 的网络请求框架
- 🔄 **状态管理** - 使用 Riverpod 进行状态管理
- 📱 **响应式设计** - 适配不同屏幕尺寸
- 🎨 **Material Design 3** - 现代化 UI 设计
- 🌐 **国际化支持** - 多语言支持
- 💾 **本地缓存** - 智能缓存策略
- 🔐 **权限管理** - 完善的权限请求和管理

## 项目结构

```
lib/
├── core/                    # 核心功能层
│   ├── config/             # 应用配置
│   ├── models/             # 数据模型
│   ├── network/            # 网络层
│   ├── providers/          # 状态提供者
│   ├── router/             # 路由配置
│   ├── services/           # 业务服务
│   ├── theme/              # 主题配置
│   └── utils/              # 工具类
├── features/               # 功能模块
│   ├── auth/               # 认证模块
│   ├── home/               # 主页模块
│   ├── photos/             # 照片模块
│   ├── profile/            # 用户资料模块
│   ├── sessions/           # 相册模块
│   ├── settings/           # 设置模块
│   ├── splash/             # 启动页模块
│   └── widgets/            # 通用组件
└── main.dart               # 应用入口
```

## 环境要求

- Flutter SDK: >=3.10.0
- Dart SDK: >=3.0.0 <4.0.0
- Android: API 21+ (Android 5.0+)
- iOS: 12.0+

## 安装和运行

### 1. 克隆项目
```bash
git clone <repository-url>
cd picture-live/mobile
```

### 2. 安装依赖
```bash
flutter pub get
```

### 3. 配置环境变量
复制 `.env.example` 到 `.env` 并配置相应的环境变量：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下关键参数：
- `API_BASE_URL`: 后端 API 地址
- `WS_BASE_URL`: WebSocket 服务地址
- 其他配置参数

### 4. 生成代码
```bash
flutter packages pub run build_runner build
```

### 5. 运行应用
```bash
# 调试模式
flutter run

# 发布模式
flutter run --release
```

## 主要依赖

### 核心依赖
- **flutter_riverpod**: 状态管理
- **go_router**: 路由导航
- **dio**: HTTP 网络请求
- **hive**: 本地数据存储
- **camera**: 相机功能
- **image_picker**: 图片选择

### UI 组件
- **material_design_icons_flutter**: Material Design 图标
- **cached_network_image**: 网络图片缓存
- **photo_view**: 图片查看器
- **flutter_staggered_grid_view**: 瀑布流布局

### 工具库
- **permission_handler**: 权限管理
- **path_provider**: 路径获取
- **connectivity_plus**: 网络状态检测
- **device_info_plus**: 设备信息获取

## 开发指南

### 代码规范
- 遵循 Dart 官方代码规范
- 使用 `very_good_analysis` 进行代码分析
- 所有公共方法和类都需要添加文档注释

### 状态管理
项目使用 Riverpod 进行状态管理：
```dart
// Provider 定义
final userProvider = StateNotifierProvider<UserNotifier, UserState>(
  (ref) => UserNotifier(),
);

// 在 Widget 中使用
class MyWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProvider);
    return Text(user.name);
  }
}
```

### 网络请求
使用统一的 ApiClient 进行网络请求：
```dart
final apiClient = ApiClient();
final response = await apiClient.get('/api/users');
```

### 路由导航
使用 go_router 进行页面导航：
```dart
// 导航到指定页面
context.go('/photos/123');

// 带参数导航
context.goNamed(
  'photoDetail',
  pathParameters: {'id': '123'},
);
```

## 构建和发布

### Android
```bash
# 构建 APK
flutter build apk --release

# 构建 App Bundle
flutter build appbundle --release
```

### iOS
```bash
# 构建 iOS 应用
flutter build ios --release
```

## 测试

```bash
# 运行单元测试
flutter test

# 运行集成测试
flutter test integration_test/

# 代码覆盖率
flutter test --coverage
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：
- 邮箱: [your-email@example.com]
- 项目地址: [repository-url]

## 更新日志

### v1.0.0 (2024-01-01)
- 🎉 初始版本发布
- ✨ 实现核心功能模块
- 🎨 完成 UI 设计和交互
- 🔧 配置开发环境和构建流程