import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'dart:io';
import 'dart:async';

class NetworkUtils {
  static final Connectivity _connectivity = Connectivity();
  static StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  static final List<Function(bool)> _listeners = [];
  static bool _isConnected = true;

  /// 初始化网络监听
  static Future<void> initialize() async {
    // 检查初始网络状态
    final result = await _connectivity.checkConnectivity();
    _isConnected = result != ConnectivityResult.none;

    // 监听网络状态变化
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
      (ConnectivityResult result) {
        final isConnected = result != ConnectivityResult.none;
        if (_isConnected != isConnected) {
          _isConnected = isConnected;
          _notifyListeners(isConnected);
        }
      },
    );
  }

  /// 销毁网络监听
  static void dispose() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
    _listeners.clear();
  }

  /// 添加网络状态监听器
  static void addListener(Function(bool) listener) {
    _listeners.add(listener);
  }

  /// 移除网络状态监听器
  static void removeListener(Function(bool) listener) {
    _listeners.remove(listener);
  }

  /// 通知所有监听器
  static void _notifyListeners(bool isConnected) {
    for (final listener in _listeners) {
      try {
        listener(isConnected);
      } catch (e) {
        print('网络状态监听器错误: $e');
      }
    }
  }

  /// 检查网络连接状态
  static Future<bool> isConnected() async {
    try {
      final result = await _connectivity.checkConnectivity();
      return result != ConnectivityResult.none;
    } catch (e) {
      print('检查网络连接失败: $e');
      return false;
    }
  }

  /// 获取当前网络连接类型
  static Future<ConnectivityResult> getConnectivityType() async {
    try {
      return await _connectivity.checkConnectivity();
    } catch (e) {
      print('获取网络类型失败: $e');
      return ConnectivityResult.none;
    }
  }

  /// 检查是否为WiFi连接
  static Future<bool> isWiFiConnected() async {
    final result = await getConnectivityType();
    return result == ConnectivityResult.wifi;
  }

  /// 检查是否为移动网络连接
  static Future<bool> isMobileConnected() async {
    final result = await getConnectivityType();
    return result == ConnectivityResult.mobile;
  }

  /// 检查是否为以太网连接
  static Future<bool> isEthernetConnected() async {
    final result = await getConnectivityType();
    return result == ConnectivityResult.ethernet;
  }

  /// 获取网络类型描述
  static String getConnectivityDescription(ConnectivityResult result) {
    switch (result) {
      case ConnectivityResult.wifi:
        return 'WiFi';
      case ConnectivityResult.mobile:
        return '移动网络';
      case ConnectivityResult.ethernet:
        return '以太网';
      case ConnectivityResult.bluetooth:
        return '蓝牙';
      case ConnectivityResult.vpn:
        return 'VPN';
      case ConnectivityResult.other:
        return '其他';
      case ConnectivityResult.none:
        return '无网络';
    }
  }

  /// 测试网络连通性（通过ping）
  static Future<bool> testConnectivity({
    String host = 'google.com',
    int port = 80,
    Duration timeout = const Duration(seconds: 5),
  }) async {
    try {
      final socket = await Socket.connect(host, port, timeout: timeout);
      socket.destroy();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// 测试HTTP连通性
  static Future<bool> testHttpConnectivity({
    String url = 'https://www.google.com',
    Duration timeout = const Duration(seconds: 5),
  }) async {
    try {
      final dio = Dio();
      dio.options.connectTimeout = timeout;
      dio.options.receiveTimeout = timeout;
      
      final response = await dio.head(url);
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// 获取网络延迟
  static Future<int?> getNetworkLatency({
    String host = 'google.com',
    int port = 80,
    Duration timeout = const Duration(seconds: 5),
  }) async {
    try {
      final stopwatch = Stopwatch()..start();
      final socket = await Socket.connect(host, port, timeout: timeout);
      stopwatch.stop();
      socket.destroy();
      return stopwatch.elapsedMilliseconds;
    } catch (e) {
      return null;
    }
  }

  /// 获取网络质量描述
  static String getNetworkQualityDescription(int? latency) {
    if (latency == null) return '无法检测';
    
    if (latency < 50) {
      return '优秀';
    } else if (latency < 100) {
      return '良好';
    } else if (latency < 200) {
      return '一般';
    } else if (latency < 500) {
      return '较差';
    } else {
      return '很差';
    }
  }

  /// 检查是否应该使用移动网络上传
  static Future<bool> shouldUploadOnMobile() async {
    final isMobile = await isMobileConnected();
    if (!isMobile) return true; // 非移动网络可以上传
    
    // 这里可以添加用户设置检查
    // 例如：从SharedPreferences读取用户是否允许移动网络上传
    return false; // 默认不允许移动网络上传大文件
  }

  /// 检查是否应该自动下载
  static Future<bool> shouldAutoDownload() async {
    final isWiFi = await isWiFiConnected();
    return isWiFi; // 只在WiFi下自动下载
  }

  /// 获取推荐的图片质量
  static Future<ImageQuality> getRecommendedImageQuality() async {
    final connectivityType = await getConnectivityType();
    
    switch (connectivityType) {
      case ConnectivityResult.wifi:
      case ConnectivityResult.ethernet:
        return ImageQuality.high;
      case ConnectivityResult.mobile:
        return ImageQuality.medium;
      default:
        return ImageQuality.low;
    }
  }

  /// 获取推荐的视频质量
  static Future<VideoQuality> getRecommendedVideoQuality() async {
    final connectivityType = await getConnectivityType();
    
    switch (connectivityType) {
      case ConnectivityResult.wifi:
      case ConnectivityResult.ethernet:
        return VideoQuality.hd;
      case ConnectivityResult.mobile:
        return VideoQuality.sd;
      default:
        return VideoQuality.low;
    }
  }

  /// 检查网络是否稳定
  static Future<bool> isNetworkStable({
    int testCount = 3,
    Duration interval = const Duration(seconds: 1),
  }) async {
    int successCount = 0;
    
    for (int i = 0; i < testCount; i++) {
      if (i > 0) {
        await Future.delayed(interval);
      }
      
      if (await testConnectivity()) {
        successCount++;
      }
    }
    
    return successCount >= (testCount * 0.8); // 80%成功率认为稳定
  }

  /// 获取网络状态信息
  static Future<NetworkStatus> getNetworkStatus() async {
    final connectivityType = await getConnectivityType();
    final isConnected = connectivityType != ConnectivityResult.none;
    final latency = isConnected ? await getNetworkLatency() : null;
    final isStable = isConnected ? await isNetworkStable() : false;
    
    return NetworkStatus(
      isConnected: isConnected,
      connectivityType: connectivityType,
      latency: latency,
      isStable: isStable,
      quality: getNetworkQualityDescription(latency),
    );
  }

  /// 等待网络连接
  static Future<bool> waitForConnection({
    Duration timeout = const Duration(seconds: 30),
    Duration checkInterval = const Duration(seconds: 1),
  }) async {
    final stopwatch = Stopwatch()..start();
    
    while (stopwatch.elapsed < timeout) {
      if (await isConnected()) {
        return true;
      }
      await Future.delayed(checkInterval);
    }
    
    return false;
  }

  /// 重试网络请求
  static Future<T> retryRequest<T>(
    Future<T> Function() request, {
    int maxRetries = 3,
    Duration delay = const Duration(seconds: 1),
    bool Function(dynamic error)? shouldRetry,
  }) async {
    int attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        return await request();
      } catch (e) {
        attempts++;
        
        if (attempts >= maxRetries) {
          rethrow;
        }
        
        if (shouldRetry != null && !shouldRetry(e)) {
          rethrow;
        }
        
        // 检查网络连接
        if (!await isConnected()) {
          await waitForConnection();
        }
        
        await Future.delayed(delay * attempts);
      }
    }
    
    throw Exception('重试次数已达上限');
  }

  /// 获取当前缓存的网络状态
  static bool get currentConnectionStatus => _isConnected;

  /// 监听网络状态变化流
  static Stream<ConnectivityResult> get connectivityStream {
    return _connectivity.onConnectivityChanged;
  }
}

/// 图片质量枚举
enum ImageQuality {
  low,
  medium,
  high,
}

/// 视频质量枚举
enum VideoQuality {
  low,
  sd,
  hd,
  fullHd,
}

/// 网络状态信息
class NetworkStatus {
  final bool isConnected;
  final ConnectivityResult connectivityType;
  final int? latency;
  final bool isStable;
  final String quality;

  const NetworkStatus({
    required this.isConnected,
    required this.connectivityType,
    this.latency,
    required this.isStable,
    required this.quality,
  });

  String get description {
    if (!isConnected) return '无网络连接';
    
    final type = NetworkUtils.getConnectivityDescription(connectivityType);
    final latencyText = latency != null ? '${latency}ms' : '未知';
    final stabilityText = isStable ? '稳定' : '不稳定';
    
    return '$type - $quality ($latencyText, $stabilityText)';
  }

  Map<String, dynamic> toJson() {
    return {
      'isConnected': isConnected,
      'connectivityType': connectivityType.toString(),
      'latency': latency,
      'isStable': isStable,
      'quality': quality,
    };
  }

  @override
  String toString() {
    return 'NetworkStatus(isConnected: $isConnected, type: $connectivityType, latency: $latency, stable: $isStable, quality: $quality)';
  }
}