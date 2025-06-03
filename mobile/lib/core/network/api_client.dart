import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../config/app_config.dart';
import '../services/storage_service.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/logging_interceptor.dart';
import 'interceptors/error_interceptor.dart';
import 'interceptors/retry_interceptor.dart';

class ApiClient {
  static ApiClient? _instance;
  late Dio _dio;
  final StorageService _storageService = StorageService();
  
  ApiClient._internal() {
    _dio = Dio();
    _setupInterceptors();
    _setupBaseOptions();
  }
  
  factory ApiClient() {
    return _instance ??= ApiClient._internal();
  }
  
  Dio get dio => _dio;
  
  // 设置基础配置
  void _setupBaseOptions() {
    _dio.options = BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: Duration(milliseconds: AppConfig.connectTimeout),
      receiveTimeout: Duration(milliseconds: AppConfig.receiveTimeout),
      sendTimeout: Duration(milliseconds: AppConfig.sendTimeout),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      validateStatus: (status) {
        // 接受200-299和304状态码
        return (status != null && status >= 200 && status < 300) || status == 304;
      },
    );
  }
  
  // 设置拦截器
  void _setupInterceptors() {
    // 认证拦截器
    _dio.interceptors.add(AuthInterceptor(_storageService));
    
    // 重试拦截器
    _dio.interceptors.add(RetryInterceptor());
    
    // 错误处理拦截器
    _dio.interceptors.add(ErrorInterceptor());
    
    // 日志拦截器（仅在调试模式下）
    if (kDebugMode) {
      _dio.interceptors.add(LoggingInterceptor());
    }
  }
  
  // 检查网络连接
  Future<bool> _checkConnectivity() async {
    final connectivityResult = await Connectivity().checkConnectivity();
    return connectivityResult != ConnectivityResult.none;
  }
  
  // GET请求
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onReceiveProgress,
  }) async {
    if (!await _checkConnectivity()) {
      throw DioException(
        requestOptions: RequestOptions(path: path),
        type: DioExceptionType.connectionError,
        message: '网络连接不可用',
      );
    }
    
    return _dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
      onReceiveProgress: onReceiveProgress,
    );
  }
  
  // POST请求
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    if (!await _checkConnectivity()) {
      throw DioException(
        requestOptions: RequestOptions(path: path),
        type: DioExceptionType.connectionError,
        message: '网络连接不可用',
      );
    }
    
    return _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );
  }
  
  // PUT请求
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    if (!await _checkConnectivity()) {
      throw DioException(
        requestOptions: RequestOptions(path: path),
        type: DioExceptionType.connectionError,
        message: '网络连接不可用',
      );
    }
    
    return _dio.put<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );
  }
  
  // DELETE请求
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    if (!await _checkConnectivity()) {
      throw DioException(
        requestOptions: RequestOptions(path: path),
        type: DioExceptionType.connectionError,
        message: '网络连接不可用',
      );
    }
    
    return _dio.delete<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }
  
  // PATCH请求
  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    if (!await _checkConnectivity()) {
      throw DioException(
        requestOptions: RequestOptions(path: path),
        type: DioExceptionType.connectionError,
        message: '网络连接不可用',
      );
    }
    
    return _dio.patch<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );
  }
  
  // 文件上传
  Future<Response<T>> upload<T>(
    String path,
    FormData formData, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
  }) async {
    if (!await _checkConnectivity()) {
      throw DioException(
        requestOptions: RequestOptions(path: path),
        type: DioExceptionType.connectionError,
        message: '网络连接不可用',
      );
    }
    
    return _dio.post<T>(
      path,
      data: formData,
      queryParameters: queryParameters,
      options: options?.copyWith(
        headers: {
          ...?options.headers,
          'Content-Type': 'multipart/form-data',
        },
      ) ?? Options(
        headers: {'Content-Type': 'multipart/form-data'},
      ),
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
    );
  }
  
  // 文件下载
  Future<Response> download(
    String urlPath,
    String savePath, {
    ProgressCallback? onReceiveProgress,
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
    bool deleteOnError = true,
    String lengthHeader = Headers.contentLengthHeader,
    Options? options,
  }) async {
    if (!await _checkConnectivity()) {
      throw DioException(
        requestOptions: RequestOptions(path: urlPath),
        type: DioExceptionType.connectionError,
        message: '网络连接不可用',
      );
    }
    
    return _dio.download(
      urlPath,
      savePath,
      onReceiveProgress: onReceiveProgress,
      queryParameters: queryParameters,
      cancelToken: cancelToken,
      deleteOnError: deleteOnError,
      lengthHeader: lengthHeader,
      options: options,
    );
  }
  
  // 更新基础URL
  void updateBaseUrl(String baseUrl) {
    _dio.options.baseUrl = baseUrl;
  }
  
  // 添加拦截器
  void addInterceptor(Interceptor interceptor) {
    _dio.interceptors.add(interceptor);
  }
  
  // 移除拦截器
  void removeInterceptor(Interceptor interceptor) {
    _dio.interceptors.remove(interceptor);
  }
  
  // 清除所有拦截器
  void clearInterceptors() {
    _dio.interceptors.clear();
    _setupInterceptors();
  }
  
  // 取消所有请求
  void cancelRequests([String? reason]) {
    _dio.close(force: true);
    // 重新创建Dio实例
    _dio = Dio();
    _setupInterceptors();
    _setupBaseOptions();
  }
}