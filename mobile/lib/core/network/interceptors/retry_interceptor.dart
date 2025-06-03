import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class RetryInterceptor extends Interceptor {
  final int maxRetries;
  final Duration retryDelay;
  final List<DioExceptionType> retryableTypes;
  final List<int> retryableStatusCodes;
  
  RetryInterceptor({
    this.maxRetries = 3,
    this.retryDelay = const Duration(seconds: 1),
    this.retryableTypes = const [
      DioExceptionType.connectionTimeout,
      DioExceptionType.sendTimeout,
      DioExceptionType.receiveTimeout,
      DioExceptionType.connectionError,
    ],
    this.retryableStatusCodes = const [408, 429, 500, 502, 503, 504],
  });
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final requestOptions = err.requestOptions;
    
    // 检查是否应该重试
    if (!_shouldRetry(err, requestOptions)) {
      handler.next(err);
      return;
    }
    
    // 获取当前重试次数
    final retryCount = requestOptions.extra['retry_count'] as int? ?? 0;
    
    if (retryCount >= maxRetries) {
      if (kDebugMode) {
        print('Max retries reached for ${requestOptions.path}');
      }
      handler.next(err);
      return;
    }
    
    // 增加重试次数
    requestOptions.extra['retry_count'] = retryCount + 1;
    
    if (kDebugMode) {
      print('Retrying request ${requestOptions.path} (${retryCount + 1}/$maxRetries)');
    }
    
    // 等待重试延迟
    await Future.delayed(_calculateRetryDelay(retryCount));
    
    try {
      // 重新发起请求
      final response = await Dio().fetch(requestOptions);
      handler.resolve(response);
    } catch (e) {
      if (e is DioException) {
        handler.next(e);
      } else {
        handler.next(DioException(
          requestOptions: requestOptions,
          error: e,
          type: DioExceptionType.unknown,
        ));
      }
    }
  }
  
  bool _shouldRetry(DioException err, RequestOptions requestOptions) {
    // 不重试POST、PUT、PATCH等可能有副作用的请求
    if (!['GET', 'HEAD', 'OPTIONS'].contains(requestOptions.method.toUpperCase())) {
      return false;
    }
    
    // 检查错误类型是否可重试
    if (retryableTypes.contains(err.type)) {
      return true;
    }
    
    // 检查状态码是否可重试
    if (err.response?.statusCode != null &&
        retryableStatusCodes.contains(err.response!.statusCode)) {
      return true;
    }
    
    return false;
  }
  
  Duration _calculateRetryDelay(int retryCount) {
    // 指数退避算法：每次重试延迟时间翻倍
    final multiplier = (1 << retryCount).clamp(1, 8); // 最大8倍延迟
    return Duration(milliseconds: retryDelay.inMilliseconds * multiplier);
  }
}