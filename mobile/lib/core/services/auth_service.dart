import 'package:dio/dio.dart';
import 'dart:convert';

import '../config/app_config.dart';
import '../network/api_client.dart';
import '../../features/auth/domain/models/user_model.dart';
import '../../features/auth/domain/models/auth_response_model.dart';

class AuthService {
  final ApiClient _apiClient;
  
  AuthService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();
  
  // 登录
  Future<AuthResponseModel?> login(String email, String password) async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.apiPrefix}${AppConfig.authEndpoint}/login',
        data: {
          'email': email,
          'password': password,
        },
      );
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return AuthResponseModel.fromJson(response.data['data']);
      }
      
      throw Exception(response.data['message'] ?? '登录失败');
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('邮箱或密码错误');
      } else if (e.response?.statusCode == 429) {
        throw Exception('登录尝试过于频繁，请稍后再试');
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('登录失败：$e');
    }
  }
  
  // 注册
  Future<AuthResponseModel?> register(String email, String password, String name) async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.apiPrefix}${AppConfig.authEndpoint}/register',
        data: {
          'email': email,
          'password': password,
          'name': name,
        },
      );
      
      if (response.statusCode == 201 && response.data['success'] == true) {
        return AuthResponseModel.fromJson(response.data['data']);
      }
      
      throw Exception(response.data['message'] ?? '注册失败');
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        throw Exception('该邮箱已被注册');
      } else if (e.response?.statusCode == 422) {
        final errors = e.response?.data['errors'] as Map<String, dynamic>?;
        if (errors != null) {
          final errorMessages = errors.values.map((e) => e.toString()).join('\n');
          throw Exception(errorMessages);
        }
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('注册失败：$e');
    }
  }
  
  // 登出
  Future<void> logout() async {
    try {
      await _apiClient.post(
        '${AppConfig.apiPrefix}${AppConfig.authEndpoint}/logout',
      );
    } on DioException catch (e) {
      // 登出失败不抛出异常，因为本地清理更重要
      print('Logout API call failed: ${_getErrorMessage(e)}');
    }
  }
  
  // 获取当前用户信息
  Future<UserModel?> getCurrentUser(String token) async {
    try {
      final response = await _apiClient.get(
        '${AppConfig.apiPrefix}${AppConfig.authEndpoint}/me',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return UserModel.fromJson(response.data['data']);
      }
      
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        // Token无效或过期
        return null;
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('获取用户信息失败：$e');
    }
  }
  
  // 更新用户信息
  Future<UserModel?> updateUser(UserModel user) async {
    try {
      final response = await _apiClient.put(
        '${AppConfig.apiPrefix}${AppConfig.usersEndpoint}/profile',
        data: user.toJson(),
      );
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return UserModel.fromJson(response.data['data']);
      }
      
      throw Exception(response.data['message'] ?? '更新用户信息失败');
    } on DioException catch (e) {
      if (e.response?.statusCode == 422) {
        final errors = e.response?.data['errors'] as Map<String, dynamic>?;
        if (errors != null) {
          final errorMessages = errors.values.map((e) => e.toString()).join('\n');
          throw Exception(errorMessages);
        }
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('更新用户信息失败：$e');
    }
  }
  
  // 修改密码
  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.apiPrefix}${AppConfig.authEndpoint}/change-password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
      
      return response.statusCode == 200 && response.data['success'] == true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 400) {
        throw Exception('当前密码错误');
      } else if (e.response?.statusCode == 422) {
        throw Exception('新密码格式不正确');
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('修改密码失败：$e');
    }
  }
  
  // 忘记密码
  Future<bool> forgotPassword(String email) async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.apiPrefix}${AppConfig.authEndpoint}/forgot-password',
        data: {'email': email},
      );
      
      return response.statusCode == 200 && response.data['success'] == true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('该邮箱未注册');
      } else if (e.response?.statusCode == 429) {
        throw Exception('请求过于频繁，请稍后再试');
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('发送重置邮件失败：$e');
    }
  }
  
  // 重置密码
  Future<bool> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.apiPrefix}${AppConfig.authEndpoint}/reset-password',
        data: {
          'token': token,
          'password': newPassword,
        },
      );
      
      return response.statusCode == 200 && response.data['success'] == true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 400) {
        throw Exception('重置令牌无效或已过期');
      } else if (e.response?.statusCode == 422) {
        throw Exception('密码格式不正确');
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('重置密码失败：$e');
    }
  }
  
  // 刷新令牌
  Future<String?> refreshToken(String token) async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.apiPrefix}${AppConfig.authEndpoint}/refresh',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        return response.data['data']['token'] as String?;
      }
      
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        // Token无效，无法刷新
        return null;
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('刷新令牌失败：$e');
    }
  }
  
  // 验证邮箱
  Future<bool> verifyEmail(String token) async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.apiPrefix}${AppConfig.authEndpoint}/verify-email',
        data: {'token': token},
      );
      
      return response.statusCode == 200 && response.data['success'] == true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 400) {
        throw Exception('验证令牌无效或已过期');
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('邮箱验证失败：$e');
    }
  }
  
  // 重新发送验证邮件
  Future<bool> resendVerificationEmail() async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.apiPrefix}${AppConfig.authEndpoint}/resend-verification',
      );
      
      return response.statusCode == 200 && response.data['success'] == true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 429) {
        throw Exception('请求过于频繁，请稍后再试');
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('发送验证邮件失败：$e');
    }
  }
  
  // 删除账户
  Future<bool> deleteAccount(String password) async {
    try {
      final response = await _apiClient.delete(
        '${AppConfig.apiPrefix}${AppConfig.usersEndpoint}/account',
        data: {'password': password},
      );
      
      return response.statusCode == 200 && response.data['success'] == true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 400) {
        throw Exception('密码错误');
      }
      throw Exception(_getErrorMessage(e));
    } catch (e) {
      throw Exception('删除账户失败：$e');
    }
  }
  
  // 获取错误信息
  String _getErrorMessage(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return '网络连接超时，请检查网络设置';
      case DioExceptionType.connectionError:
        return '网络连接失败，请检查网络设置';
      case DioExceptionType.badResponse:
        final message = e.response?.data?['message'];
        return message ?? '服务器错误';
      case DioExceptionType.cancel:
        return '请求已取消';
      default:
        return '网络错误，请稍后重试';
    }
  }
}