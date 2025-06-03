import 'package:dio/dio.dart';
import '../../services/storage_service.dart';

class AuthInterceptor extends Interceptor {
  final StorageService _storageService;
  
  AuthInterceptor(this._storageService);
  
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // 获取存储的token
    final token = await _storageService.getToken();
    
    if (token != null && token.isNotEmpty) {
      // 添加Authorization头
      options.headers['Authorization'] = 'Bearer $token';
    }
    
    handler.next(options);
  }
  
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // 如果是401错误，可能是token过期
    if (err.response?.statusCode == 401) {
      // 清除无效的token
      await _storageService.clearAuth();
      
      // 可以在这里触发重新登录的逻辑
      // 例如发送事件到全局状态管理器
    }
    
    handler.next(err);
  }
}