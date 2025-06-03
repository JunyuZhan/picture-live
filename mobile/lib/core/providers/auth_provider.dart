import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../services/auth_service.dart';
import '../services/storage_service.dart';
import '../../features/auth/domain/models/user_model.dart';

part 'auth_provider.freezed.dart';

// 认证状态
@freezed
class AuthState with _$AuthState {
  const factory AuthState({
    @Default(false) bool isLoading,
    @Default(false) bool isAuthenticated,
    UserModel? user,
    String? token,
    String? error,
  }) = _AuthState;
}

// 认证状态管理器
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final StorageService _storageService;
  
  AuthNotifier(this._authService, this._storageService) : super(const AuthState()) {
    _initAuth();
  }
  
  // 初始化认证状态
  Future<void> _initAuth() async {
    state = state.copyWith(isLoading: true);
    
    try {
      final token = await _storageService.getToken();
      if (token != null) {
        final user = await _authService.getCurrentUser(token);
        if (user != null) {
          state = state.copyWith(
            isLoading: false,
            isAuthenticated: true,
            user: user,
            token: token,
          );
          return;
        }
      }
      
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: false,
        error: e.toString(),
      );
    }
  }
  
  // 登录
  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final result = await _authService.login(email, password);
      if (result != null) {
        await _storageService.saveToken(result.token);
        await _storageService.saveUser(result.user);
        
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: result.user,
          token: result.token,
        );
        return true;
      }
      
      state = state.copyWith(
        isLoading: false,
        error: '登录失败',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }
  
  // 注册
  Future<bool> register(String email, String password, String name) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final result = await _authService.register(email, password, name);
      if (result != null) {
        await _storageService.saveToken(result.token);
        await _storageService.saveUser(result.user);
        
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: result.user,
          token: result.token,
        );
        return true;
      }
      
      state = state.copyWith(
        isLoading: false,
        error: '注册失败',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }
  
  // 登出
  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    
    try {
      await _authService.logout();
      await _storageService.clearAuth();
      
      state = const AuthState(
        isLoading: false,
        isAuthenticated: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
  
  // 更新用户信息
  Future<void> updateUser(UserModel user) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final updatedUser = await _authService.updateUser(user);
      if (updatedUser != null) {
        await _storageService.saveUser(updatedUser);
        
        state = state.copyWith(
          isLoading: false,
          user: updatedUser,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: '更新用户信息失败',
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
  
  // 清除错误
  void clearError() {
    state = state.copyWith(error: null);
  }
  
  // 刷新令牌
  Future<bool> refreshToken() async {
    try {
      final newToken = await _authService.refreshToken(state.token!);
      if (newToken != null) {
        await _storageService.saveToken(newToken);
        state = state.copyWith(token: newToken);
        return true;
      }
      return false;
    } catch (e) {
      await logout();
      return false;
    }
  }
}

// 提供者定义
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});

final storageServiceProvider = Provider<StorageService>((ref) {
  return StorageService();
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  final storageService = ref.watch(storageServiceProvider);
  return AuthNotifier(authService, storageService);
});

// 便捷访问器
final currentUserProvider = Provider<UserModel?>((ref) {
  return ref.watch(authProvider).user;
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

final authTokenProvider = Provider<String?>((ref) {
  return ref.watch(authProvider).token;
});