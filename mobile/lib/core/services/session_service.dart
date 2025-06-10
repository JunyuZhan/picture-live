import 'package:dio/dio.dart';
import '../network/api_client.dart';
import '../config/app_config.dart';
import '../models/session.dart';
import '../models/api_response.dart';

class SessionService {
  final ApiClient _apiClient;
  
  SessionService(this._apiClient);
  
  /// 获取相册列表
  Future<ApiResponse<List<Session>>> getSessions({
    int page = 1,
    int limit = AppConfig.defaultPageSize,
    String? search,
    String? status,
  }) async {
    try {
      final queryParams = {
        'page': page,
        'limit': limit,
        if (search != null && search.isNotEmpty) 'search': search,
        if (status != null && status.isNotEmpty) 'status': status,
      };
      
      final response = await _apiClient.get(
        AppConfig.sessionsEndpoint,
        queryParameters: queryParams,
      );
      
      final sessions = (response.data['data'] as List)
          .map((json) => Session.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        data: sessions,
        message: response.data['message'],
        pagination: response.data['pagination'] != null
            ? Pagination.fromJson(response.data['pagination'])
            : null,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '获取相册列表失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '获取相册列表失败: $e');
    }
  }
  
  /// 获取单个相册详情
  Future<ApiResponse<Session>> getSession(String sessionId) async {
    try {
      final response = await _apiClient.get(
        '${AppConfig.sessionsEndpoint}/$sessionId',
      );
      
      final session = Session.fromJson(response.data['data']);
      
      return ApiResponse.success(
        data: session,
        message: response.data['message'],
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '获取相册详情失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '获取相册详情失败: $e');
    }
  }
  
  /// 创建新相册
  Future<ApiResponse<Session>> createSession({
    required String name,
    String? description,
    bool isPublic = false,
    String? password,
    DateTime? expiresAt,
    int? maxPhotos,
    List<String>? allowedUsers,
  }) async {
    try {
      final data = {
        'name': name,
        if (description != null) 'description': description,
        'is_public': isPublic,
        if (password != null) 'password': password,
        if (expiresAt != null) 'expires_at': expiresAt.toIso8601String(),
        if (maxPhotos != null) 'max_photos': maxPhotos,
        if (allowedUsers != null) 'allowed_users': allowedUsers,
      };
      
      final response = await _apiClient.post(
        AppConfig.sessionsEndpoint,
        data: data,
      );
      
      final session = Session.fromJson(response.data['data']);
      
      return ApiResponse.success(
        data: session,
        message: response.data['message'] ?? '相册创建成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '创建相册失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '创建相册失败: $e');
    }
  }
  
  /// 更新相册
  Future<ApiResponse<Session>> updateSession(
    String sessionId, {
    String? name,
    String? description,
    bool? isPublic,
    String? password,
    DateTime? expiresAt,
    int? maxPhotos,
    List<String>? allowedUsers,
    String? status,
  }) async {
    try {
      final data = <String, dynamic>{};
      
      if (name != null) data['name'] = name;
      if (description != null) data['description'] = description;
      if (isPublic != null) data['is_public'] = isPublic;
      if (password != null) data['password'] = password;
      if (expiresAt != null) data['expires_at'] = expiresAt.toIso8601String();
      if (maxPhotos != null) data['max_photos'] = maxPhotos;
      if (allowedUsers != null) data['allowed_users'] = allowedUsers;
      if (status != null) data['status'] = status;
      
      final response = await _apiClient.put(
        '${AppConfig.sessionsEndpoint}/$sessionId',
        data: data,
      );
      
      final session = Session.fromJson(response.data['data']);
      
      return ApiResponse.success(
        data: session,
        message: response.data['message'] ?? '相册更新成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '更新相册失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '更新相册失败: $e');
    }
  }
  
  /// 删除相册
  Future<ApiResponse<void>> deleteSession(String sessionId) async {
    try {
      final response = await _apiClient.delete(
        '${AppConfig.sessionsEndpoint}/$sessionId',
      );
      
      return ApiResponse.success(
        message: response.data['message'] ?? '相册删除成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '删除相册失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '删除相册失败: $e');
    }
  }
  
  /// 加入相册
  Future<ApiResponse<Session>> joinSession(
    String sessionId, {
    String? password,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (password != null) data['password'] = password;
      
      final response = await _apiClient.post(
        '${AppConfig.sessionsEndpoint}/$sessionId/join',
        data: data,
      );
      
      final session = Session.fromJson(response.data['data']);
      
      return ApiResponse.success(
        data: session,
        message: response.data['message'] ?? '加入相册成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '加入相册失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '加入相册失败: $e');
    }
  }
  
  /// 离开相册
  Future<ApiResponse<void>> leaveSession(String sessionId) async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.sessionsEndpoint}/$sessionId/leave',
      );
      
      return ApiResponse.success(
        message: response.data['message'] ?? '离开相册成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '离开相册失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '离开相册失败: $e');
    }
  }
  
  /// 获取相册成员
  Future<ApiResponse<List<SessionMember>>> getSessionMembers(
    String sessionId, {
    int page = 1,
    int limit = AppConfig.defaultPageSize,
  }) async {
    try {
      final queryParams = {
        'page': page,
        'limit': limit,
      };
      
      final response = await _apiClient.get(
        '${AppConfig.sessionsEndpoint}/$sessionId/members',
        queryParameters: queryParams,
      );
      
      final members = (response.data['data'] as List)
          .map((json) => SessionMember.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        data: members,
        message: response.data['message'],
        pagination: response.data['pagination'] != null
            ? Pagination.fromJson(response.data['pagination'])
            : null,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '获取相册成员失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '获取相册成员失败: $e');
    }
  }
  
  /// 邀请用户加入相册
  Future<ApiResponse<void>> inviteUser(
    String sessionId,
    String userId,
  ) async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.sessionsEndpoint}/$sessionId/invite',
        data: {'user_id': userId},
      );
      
      return ApiResponse.success(
        message: response.data['message'] ?? '邀请发送成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '邀请用户失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '邀请用户失败: $e');
    }
  }
  
  /// 移除相册成员
  Future<ApiResponse<void>> removeMember(
    String sessionId,
    String userId,
  ) async {
    try {
      final response = await _apiClient.delete(
        '${AppConfig.sessionsEndpoint}/$sessionId/members/$userId',
      );
      
      return ApiResponse.success(
        message: response.data['message'] ?? '成员移除成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '移除成员失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '移除成员失败: $e');
    }
  }
}