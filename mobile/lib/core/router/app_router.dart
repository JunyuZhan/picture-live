import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/sessions/sessions_screen.dart';
import '../../features/sessions/session_detail_screen.dart';
import '../../features/sessions/create_session_screen.dart';
import '../../features/photos/photo_detail_screen.dart';
import '../../features/photos/upload_photo_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/widgets/error_widget.dart';

// 路由提供者
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  
  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isLoggingIn = state.location == '/login' || state.location == '/register';
      final isSplash = state.location == '/splash';
      
      // 如果在启动页，不重定向
      if (isSplash) return null;
      
      // 如果未登录且不在登录页面，重定向到登录页
      if (!isLoggedIn && !isLoggingIn) {
        return '/login';
      }
      
      // 如果已登录且在登录页面，重定向到首页
      if (isLoggedIn && isLoggingIn) {
        return '/home';
      }
      
      return null;
    },
    routes: [
      // 启动页
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),
      
      // 认证相关路由
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      
      // 主要功能路由
      GoRoute(
        path: '/home',
        name: 'home',
        builder: (context, state) => const HomeScreen(),
      ),
      
      // 会话相关路由
      GoRoute(
        path: '/sessions',
        name: 'sessions',
        builder: (context, state) => const SessionsScreen(),
        routes: [
          GoRoute(
            path: '/create',
            name: 'create-session',
            builder: (context, state) => const CreateSessionScreen(),
          ),
          GoRoute(
            path: '/:sessionId',
            name: 'session-detail',
            builder: (context, state) {
              final sessionId = state.pathParameters['sessionId']!;
              return SessionDetailScreen(sessionId: sessionId);
            },
          ),
        ],
      ),
      
      // 照片上传路由
      GoRoute(
        path: '/upload',
        name: 'upload-photo',
        builder: (context, state) {
          final sessionId = state.queryParameters['sessionId'];
          return UploadPhotoScreen(sessionId: sessionId);
        },
      ),
      
      // 照片详情路由
      GoRoute(
        path: '/photos/:photoId',
        name: 'photo-detail',
        builder: (context, state) {
          final photoId = state.pathParameters['photoId']!;
          return PhotoDetailScreen(photoId: photoId);
        },
      ),
      
      // 个人资料路由
      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      
      // 设置路由
      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
    
    // 错误页面
    errorBuilder: (context, state) => CustomErrorWidget(
      message: state.error.toString(),
    ),
  );
});

// 路由扩展方法
extension GoRouterExtension on GoRouter {
  void pushAndClearStack(String location) {
    while (canPop()) {
      pop();
    }
    pushReplacement(location);
  }
}

// 路由名称常量
class AppRoutes {
  static const String splash = '/splash';
  static const String login = '/login';
  static const String register = '/register';
  static const String home = '/home';
  static const String sessions = '/sessions';
  static const String createSession = '/sessions/create';
  static const String uploadPhoto = '/upload';
  static const String profile = '/profile';
  static const String settings = '/settings';
  
  static String sessionDetail(String sessionId) => '/sessions/$sessionId';
  static String photoDetail(String photoId) => '/photos/$photoId';
  static String uploadPhotoWithSession(String sessionId) => '/upload?sessionId=$sessionId';
}