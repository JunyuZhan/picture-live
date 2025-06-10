import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class NotificationService {
  static const MethodChannel _channel = MethodChannel('picture_live/notifications');
  
  static bool _initialized = false;
  static Function(Map<String, dynamic>)? _onNotificationReceived;
  static Function(Map<String, dynamic>)? _onNotificationTapped;
  
  // 初始化通知服务
  static Future<void> init() async {
    if (_initialized) return;
    
    try {
      // 请求通知权限
      await requestPermission();
      
      // 设置方法调用处理器
      _channel.setMethodCallHandler(_handleMethodCall);
      
      _initialized = true;
      
      if (kDebugMode) {
        print('NotificationService initialized successfully');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Failed to initialize NotificationService: $e');
      }
    }
  }
  
  // 处理原生方法调用
  static Future<dynamic> _handleMethodCall(MethodCall call) async {
    switch (call.method) {
      case 'onNotificationReceived':
        final data = Map<String, dynamic>.from(call.arguments);
        _onNotificationReceived?.call(data);
        break;
      case 'onNotificationTapped':
        final data = Map<String, dynamic>.from(call.arguments);
        _onNotificationTapped?.call(data);
        break;
      default:
        throw PlatformException(
          code: 'Unimplemented',
          details: 'Method ${call.method} is not implemented',
        );
    }
  }
  
  // 请求通知权限
  static Future<bool> requestPermission() async {
    try {
      final bool granted = await _channel.invokeMethod('requestPermission');
      return granted;
    } catch (e) {
      if (kDebugMode) {
        print('Failed to request notification permission: $e');
      }
      return false;
    }
  }
  
  // 检查通知权限
  static Future<bool> hasPermission() async {
    try {
      final bool hasPermission = await _channel.invokeMethod('hasPermission');
      return hasPermission;
    } catch (e) {
      if (kDebugMode) {
        print('Failed to check notification permission: $e');
      }
      return false;
    }
  }
  
  // 显示本地通知
  static Future<void> showNotification({
    required String title,
    required String body,
    String? imageUrl,
    Map<String, dynamic>? data,
    String? channelId,
    String? channelName,
    String? channelDescription,
    NotificationPriority priority = NotificationPriority.normal,
  }) async {
    try {
      await _channel.invokeMethod('showNotification', {
        'title': title,
        'body': body,
        'imageUrl': imageUrl,
        'data': data ?? {},
        'channelId': channelId ?? 'default',
        'channelName': channelName ?? 'Default',
        'channelDescription': channelDescription ?? 'Default notification channel',
        'priority': priority.index,
      });
    } catch (e) {
      if (kDebugMode) {
        print('Failed to show notification: $e');
      }
    }
  }
  
  // 显示进度通知
  static Future<void> showProgressNotification({
    required int id,
    required String title,
    required String body,
    required int progress,
    required int maxProgress,
    bool indeterminate = false,
  }) async {
    try {
      await _channel.invokeMethod('showProgressNotification', {
        'id': id,
        'title': title,
        'body': body,
        'progress': progress,
        'maxProgress': maxProgress,
        'indeterminate': indeterminate,
      });
    } catch (e) {
      if (kDebugMode) {
        print('Failed to show progress notification: $e');
      }
    }
  }
  
  // 更新进度通知
  static Future<void> updateProgressNotification({
    required int id,
    required int progress,
    String? body,
  }) async {
    try {
      await _channel.invokeMethod('updateProgressNotification', {
        'id': id,
        'progress': progress,
        'body': body,
      });
    } catch (e) {
      if (kDebugMode) {
        print('Failed to update progress notification: $e');
      }
    }
  }
  
  // 取消通知
  static Future<void> cancelNotification(int id) async {
    try {
      await _channel.invokeMethod('cancelNotification', {'id': id});
    } catch (e) {
      if (kDebugMode) {
        print('Failed to cancel notification: $e');
      }
    }
  }
  
  // 取消所有通知
  static Future<void> cancelAllNotifications() async {
    try {
      await _channel.invokeMethod('cancelAllNotifications');
    } catch (e) {
      if (kDebugMode) {
        print('Failed to cancel all notifications: $e');
      }
    }
  }
  
  // 设置通知接收回调
  static void setOnNotificationReceived(Function(Map<String, dynamic>) callback) {
    _onNotificationReceived = callback;
  }
  
  // 设置通知点击回调
  static void setOnNotificationTapped(Function(Map<String, dynamic>) callback) {
    _onNotificationTapped = callback;
  }
  
  // 创建通知渠道（Android）
  static Future<void> createNotificationChannel({
    required String channelId,
    required String channelName,
    required String channelDescription,
    NotificationPriority priority = NotificationPriority.normal,
    bool enableVibration = true,
    bool enableSound = true,
  }) async {
    try {
      await _channel.invokeMethod('createNotificationChannel', {
        'channelId': channelId,
        'channelName': channelName,
        'channelDescription': channelDescription,
        'priority': priority.index,
        'enableVibration': enableVibration,
        'enableSound': enableSound,
      });
    } catch (e) {
      if (kDebugMode) {
        print('Failed to create notification channel: $e');
      }
    }
  }
  
  // 获取FCM令牌
  static Future<String?> getFCMToken() async {
    try {
      final String? token = await _channel.invokeMethod('getFCMToken');
      return token;
    } catch (e) {
      if (kDebugMode) {
        print('Failed to get FCM token: $e');
      }
      return null;
    }
  }
  
  // 订阅主题
  static Future<void> subscribeToTopic(String topic) async {
    try {
      await _channel.invokeMethod('subscribeToTopic', {'topic': topic});
    } catch (e) {
      if (kDebugMode) {
        print('Failed to subscribe to topic: $e');
      }
    }
  }
  
  // 取消订阅主题
  static Future<void> unsubscribeFromTopic(String topic) async {
    try {
      await _channel.invokeMethod('unsubscribeFromTopic', {'topic': topic});
    } catch (e) {
      if (kDebugMode) {
        print('Failed to unsubscribe from topic: $e');
      }
    }
  }
  
  // 设置徽章数量（iOS）
  static Future<void> setBadgeCount(int count) async {
    try {
      await _channel.invokeMethod('setBadgeCount', {'count': count});
    } catch (e) {
      if (kDebugMode) {
        print('Failed to set badge count: $e');
      }
    }
  }
  
  // 清除徽章（iOS）
  static Future<void> clearBadge() async {
    await setBadgeCount(0);
  }
  
  // 预定义通知类型
  static Future<void> showPhotoUploadNotification({
    required String sessionName,
    required int photoCount,
  }) async {
    await showNotification(
      title: '照片上传完成',
      body: '已成功上传 $photoCount 张照片到「$sessionName」',
      channelId: 'photo_upload',
      channelName: '照片上传',
      channelDescription: '照片上传完成通知',
      priority: NotificationPriority.high,
    );
  }
  
  static Future<void> showNewPhotoNotification({
    required String sessionName,
    required String photographerName,
  }) async {
    await showNotification(
      title: '新照片',
      body: '$photographerName 在「$sessionName」中上传了新照片',
      channelId: 'new_photo',
      channelName: '新照片',
      channelDescription: '新照片通知',
      priority: NotificationPriority.normal,
    );
  }
  
  static Future<void> showSessionInviteNotification({
    required String sessionName,
    required String inviterName,
  }) async {
    await showNotification(
      title: '相册邀请',
      body: '$inviterName 邀请您加入「$sessionName」',
      channelId: 'session_invite',
      channelName: '相册邀请',
      channelDescription: '相册邀请通知',
      priority: NotificationPriority.high,
    );
  }
}

// 通知优先级枚举
enum NotificationPriority {
  min,
  low,
  normal,
  high,
  max,
}