import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static String get baseUrl => dotenv.env['API_BASE_URL'] ?? 'http://localhost:3000';
  static String get socketUrl => dotenv.env['SOCKET_URL'] ?? 'http://localhost:3000';
  static String get appName => 'Picture Live';
  static String get version => '1.0.0';
  
  // API端点
  static const String apiPrefix = '/api';
  static const String authEndpoint = '/auth';
  static const String sessionsEndpoint = '/sessions';
  static const String photosEndpoint = '/photos';
  static const String usersEndpoint = '/users';
  
  // 存储配置
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
  static const String settingsKey = 'app_settings';
  
  // 上传配置
  static const int maxFileSize = 50 * 1024 * 1024; // 50MB
  static const List<String> allowedImageTypes = ['jpg', 'jpeg', 'png', 'webp'];
  static const int imageQuality = 85;
  static const int thumbnailSize = 300;
  
  // 缓存配置
  static const int cacheMaxAge = 7 * 24 * 60 * 60; // 7天
  static const int maxCacheSize = 100 * 1024 * 1024; // 100MB
  
  // 网络配置
  static const int connectTimeout = 30000; // 30秒
  static const int receiveTimeout = 30000; // 30秒
  static const int sendTimeout = 60000; // 60秒
  
  // 分页配置
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // 相机配置
  static const double defaultAspectRatio = 16.0 / 9.0;
  static const int defaultImageWidth = 1920;
  static const int defaultImageHeight = 1080;
  
  // 主题配置
  static const String primaryColorHex = '#2563EB';
  static const String secondaryColorHex = '#10B981';
  static const String errorColorHex = '#EF4444';
  static const String warningColorHex = '#F59E0B';
  
  // 动画配置
  static const Duration defaultAnimationDuration = Duration(milliseconds: 300);
  static const Duration shortAnimationDuration = Duration(milliseconds: 150);
  static const Duration longAnimationDuration = Duration(milliseconds: 500);
}