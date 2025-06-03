import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // 统一处理网络错误
    final errorMessage = _getErrorMessage(err);
    
    // 创建新的错误对象，包含友好的错误信息
    final newError = DioException(
      requestOptions: err.requestOptions,
      response: err.response,
      type: err.type,
      error: err.error,
      message: errorMessage,
    );
    
    if (kDebugMode) {
      print('Network Error: $errorMessage');
    }
    
    handler.next(newError);
  }
  
  String _getErrorMessage(DioException err) {
    switch (err.type) {
      case DioExceptionType.connectionTimeout:
        return '连接超时，请检查网络设置';
      case DioExceptionType.sendTimeout:
        return '发送超时，请检查网络设置';
      case DioExceptionType.receiveTimeout:
        return '接收超时，请检查网络设置';
      case DioExceptionType.badResponse:
        return _handleResponseError(err.response);
      case DioExceptionType.cancel:
        return '请求已取消';
      case DioExceptionType.connectionError:
        return '网络连接失败，请检查网络设置';
      case DioExceptionType.badCertificate:
        return '证书验证失败';
      case DioExceptionType.unknown:
      default:
        return '网络错误，请稍后重试';
    }
  }
  
  String _handleResponseError(Response? response) {
    if (response == null) {
      return '服务器响应异常';
    }
    
    switch (response.statusCode) {
      case 400:
        return _extractErrorMessage(response.data) ?? '请求参数错误';
      case 401:
        return '未授权，请重新登录';
      case 403:
        return '权限不足，无法访问';
      case 404:
        return '请求的资源不存在';
      case 405:
        return '请求方法不被允许';
      case 408:
        return '请求超时';
      case 409:
        return _extractErrorMessage(response.data) ?? '请求冲突';
      case 422:
        return _extractValidationErrors(response.data) ?? '数据验证失败';
      case 429:
        return '请求过于频繁，请稍后再试';
      case 500:
        return '服务器内部错误';
      case 502:
        return '网关错误';
      case 503:
        return '服务暂时不可用';
      case 504:
        return '网关超时';
      default:
        return _extractErrorMessage(response.data) ?? '服务器错误 (${response.statusCode})';
    }
  }
  
  String? _extractErrorMessage(dynamic data) {
    if (data == null) return null;
    
    if (data is Map<String, dynamic>) {
      // 尝试从不同的字段中提取错误信息
      return data['message'] as String? ??
             data['error'] as String? ??
             data['msg'] as String?;
    }
    
    if (data is String) {
      return data;
    }
    
    return null;
  }
  
  String? _extractValidationErrors(dynamic data) {
    if (data == null) return null;
    
    if (data is Map<String, dynamic>) {
      final errors = data['errors'];
      if (errors is Map<String, dynamic>) {
        // 合并所有验证错误信息
        final errorMessages = <String>[];
        errors.forEach((key, value) {
          if (value is List) {
            errorMessages.addAll(value.map((e) => e.toString()));
          } else {
            errorMessages.add(value.toString());
          }
        });
        return errorMessages.join('\n');
      }
      
      // 如果没有errors字段，尝试提取message
      return _extractErrorMessage(data);
    }
    
    return null;
  }
}