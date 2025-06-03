import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path/path.dart' as path;
import '../network/api_client.dart';
import '../config/app_config.dart';
import '../models/photo.dart';
import '../models/api_response.dart';

class PhotoService {
  final ApiClient _apiClient;
  
  PhotoService(this._apiClient);
  
  /// 获取照片列表
  Future<ApiResponse<List<Photo>>> getPhotos({
    String? sessionId,
    int page = 1,
    int limit = AppConfig.defaultPageSize,
    String? search,
    String? sortBy,
    String? sortOrder,
    List<String>? tags,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final queryParams = {
        'page': page,
        'limit': limit,
        if (sessionId != null) 'session_id': sessionId,
        if (search != null && search.isNotEmpty) 'search': search,
        if (sortBy != null) 'sort_by': sortBy,
        if (sortOrder != null) 'sort_order': sortOrder,
        if (tags != null && tags.isNotEmpty) 'tags': tags.join(','),
        if (startDate != null) 'start_date': startDate.toIso8601String(),
        if (endDate != null) 'end_date': endDate.toIso8601String(),
      };
      
      final response = await _apiClient.get(
        AppConfig.photosEndpoint,
        queryParameters: queryParams,
      );
      
      final photos = (response.data['data'] as List)
          .map((json) => Photo.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        data: photos,
        message: response.data['message'],
        pagination: response.data['pagination'] != null
            ? Pagination.fromJson(response.data['pagination'])
            : null,
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '获取照片列表失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '获取照片列表失败: $e');
    }
  }
  
  /// 获取单张照片详情
  Future<ApiResponse<Photo>> getPhoto(String photoId) async {
    try {
      final response = await _apiClient.get(
        '${AppConfig.photosEndpoint}/$photoId',
      );
      
      final photo = Photo.fromJson(response.data['data']);
      
      return ApiResponse.success(
        data: photo,
        message: response.data['message'],
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '获取照片详情失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '获取照片详情失败: $e');
    }
  }
  
  /// 上传照片
  Future<ApiResponse<Photo>> uploadPhoto(
    File imageFile, {
    String? sessionId,
    String? title,
    String? description,
    List<String>? tags,
    Map<String, dynamic>? metadata,
    void Function(int sent, int total)? onProgress,
  }) async {
    try {
      // 准备文件数据
      final fileName = path.basename(imageFile.path);
      final formData = FormData.fromMap({
        'image': await MultipartFile.fromFile(
          imageFile.path,
          filename: fileName,
        ),
        if (sessionId != null) 'session_id': sessionId,
        if (title != null) 'title': title,
        if (description != null) 'description': description,
        if (tags != null && tags.isNotEmpty) 'tags': tags.join(','),
        if (metadata != null) 'metadata': metadata,
      });
      
      final response = await _apiClient.post(
        AppConfig.photosEndpoint,
        data: formData,
        onSendProgress: onProgress,
      );
      
      final photo = Photo.fromJson(response.data['data']);
      
      return ApiResponse.success(
        data: photo,
        message: response.data['message'] ?? '照片上传成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '照片上传失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '照片上传失败: $e');
    }
  }
  
  /// 批量上传照片
  Future<ApiResponse<List<Photo>>> uploadPhotos(
    List<File> imageFiles, {
    String? sessionId,
    List<String>? titles,
    List<String>? descriptions,
    List<List<String>>? tags,
    void Function(int sent, int total)? onProgress,
  }) async {
    try {
      final formData = FormData();
      
      // 添加图片文件
      for (int i = 0; i < imageFiles.length; i++) {
        final file = imageFiles[i];
        final fileName = path.basename(file.path);
        formData.files.add(MapEntry(
          'images',
          await MultipartFile.fromFile(
            file.path,
            filename: fileName,
          ),
        ));
      }
      
      // 添加其他数据
      if (sessionId != null) {
        formData.fields.add(MapEntry('session_id', sessionId));
      }
      
      if (titles != null) {
        for (int i = 0; i < titles.length; i++) {
          formData.fields.add(MapEntry('titles[$i]', titles[i]));
        }
      }
      
      if (descriptions != null) {
        for (int i = 0; i < descriptions.length; i++) {
          formData.fields.add(MapEntry('descriptions[$i]', descriptions[i]));
        }
      }
      
      if (tags != null) {
        for (int i = 0; i < tags.length; i++) {
          formData.fields.add(MapEntry('tags[$i]', tags[i].join(',')));
        }
      }
      
      final response = await _apiClient.post(
        '${AppConfig.photosEndpoint}/batch',
        data: formData,
        onSendProgress: onProgress,
      );
      
      final photos = (response.data['data'] as List)
          .map((json) => Photo.fromJson(json))
          .toList();
      
      return ApiResponse.success(
        data: photos,
        message: response.data['message'] ?? '照片批量上传成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '照片批量上传失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '照片批量上传失败: $e');
    }
  }
  
  /// 更新照片信息
  Future<ApiResponse<Photo>> updatePhoto(
    String photoId, {
    String? title,
    String? description,
    List<String>? tags,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final data = <String, dynamic>{};
      
      if (title != null) data['title'] = title;
      if (description != null) data['description'] = description;
      if (tags != null) data['tags'] = tags;
      if (metadata != null) data['metadata'] = metadata;
      
      final response = await _apiClient.put(
        '${AppConfig.photosEndpoint}/$photoId',
        data: data,
      );
      
      final photo = Photo.fromJson(response.data['data']);
      
      return ApiResponse.success(
        data: photo,
        message: response.data['message'] ?? '照片更新成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '更新照片失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '更新照片失败: $e');
    }
  }
  
  /// 删除照片
  Future<ApiResponse<void>> deletePhoto(String photoId) async {
    try {
      final response = await _apiClient.delete(
        '${AppConfig.photosEndpoint}/$photoId',
      );
      
      return ApiResponse.success(
        message: response.data['message'] ?? '照片删除成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '删除照片失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '删除照片失败: $e');
    }
  }
  
  /// 批量删除照片
  Future<ApiResponse<void>> deletePhotos(List<String> photoIds) async {
    try {
      final response = await _apiClient.delete(
        '${AppConfig.photosEndpoint}/batch',
        data: {'photo_ids': photoIds},
      );
      
      return ApiResponse.success(
        message: response.data['message'] ?? '照片批量删除成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '批量删除照片失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '批量删除照片失败: $e');
    }
  }
  
  /// 点赞照片
  Future<ApiResponse<void>> likePhoto(String photoId) async {
    try {
      final response = await _apiClient.post(
        '${AppConfig.photosEndpoint}/$photoId/like',
      );
      
      return ApiResponse.success(
        message: response.data['message'] ?? '点赞成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '点赞失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '点赞失败: $e');
    }
  }
  
  /// 取消点赞照片
  Future<ApiResponse<void>> unlikePhoto(String photoId) async {
    try {
      final response = await _apiClient.delete(
        '${AppConfig.photosEndpoint}/$photoId/like',
      );
      
      return ApiResponse.success(
        message: response.data['message'] ?? '取消点赞成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '取消点赞失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '取消点赞失败: $e');
    }
  }
  
  /// 下载照片
  Future<ApiResponse<String>> downloadPhoto(
    String photoId,
    String savePath, {
    String? quality, // 'original', 'large', 'medium', 'small', 'thumbnail'
    void Function(int received, int total)? onProgress,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (quality != null) queryParams['quality'] = quality;
      
      await _apiClient.download(
        '${AppConfig.photosEndpoint}/$photoId/download',
        savePath,
        queryParameters: queryParams,
        onReceiveProgress: onProgress,
      );
      
      return ApiResponse.success(
        data: savePath,
        message: '照片下载成功',
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '下载照片失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '下载照片失败: $e');
    }
  }
  
  /// 获取照片统计信息
  Future<ApiResponse<PhotoStats>> getPhotoStats({
    String? sessionId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (sessionId != null) queryParams['session_id'] = sessionId;
      if (startDate != null) queryParams['start_date'] = startDate.toIso8601String();
      if (endDate != null) queryParams['end_date'] = endDate.toIso8601String();
      
      final response = await _apiClient.get(
        '${AppConfig.photosEndpoint}/stats',
        queryParameters: queryParams,
      );
      
      final stats = PhotoStats.fromJson(response.data['data']);
      
      return ApiResponse.success(
        data: stats,
        message: response.data['message'],
      );
    } on DioException catch (e) {
      return ApiResponse.error(
        message: e.message ?? '获取照片统计失败',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      return ApiResponse.error(message: '获取照片统计失败: $e');
    }
  }
}