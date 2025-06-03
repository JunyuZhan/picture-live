import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/material.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io';

class PermissionUtils {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  /// 请求相机权限
  static Future<bool> requestCameraPermission() async {
    final status = await Permission.camera.request();
    return status.isGranted;
  }

  /// 请求相册权限
  static Future<bool> requestPhotosPermission() async {
    if (Platform.isAndroid) {
      final androidInfo = await _deviceInfo.androidInfo;
      if (androidInfo.version.sdkInt >= 33) {
        // Android 13+ 使用新的权限
        final status = await Permission.photos.request();
        return status.isGranted;
      } else {
        // Android 12 及以下使用存储权限
        final status = await Permission.storage.request();
        return status.isGranted;
      }
    } else if (Platform.isIOS) {
      final status = await Permission.photos.request();
      return status.isGranted;
    }
    return false;
  }

  /// 请求存储权限
  static Future<bool> requestStoragePermission() async {
    if (Platform.isAndroid) {
      final androidInfo = await _deviceInfo.androidInfo;
      if (androidInfo.version.sdkInt >= 30) {
        // Android 11+ 使用管理外部存储权限
        final status = await Permission.manageExternalStorage.request();
        return status.isGranted;
      } else {
        // Android 10 及以下使用存储权限
        final status = await Permission.storage.request();
        return status.isGranted;
      }
    }
    return true; // iOS 不需要存储权限
  }

  /// 请求位置权限
  static Future<bool> requestLocationPermission() async {
    final status = await Permission.location.request();
    return status.isGranted;
  }

  /// 请求精确位置权限
  static Future<bool> requestPreciseLocationPermission() async {
    final status = await Permission.locationWhenInUse.request();
    if (status.isGranted) {
      // 如果基本位置权限已授予，尝试请求精确位置
      final preciseStatus = await Permission.locationAlways.request();
      return preciseStatus.isGranted || status.isGranted;
    }
    return false;
  }

  /// 请求通知权限
  static Future<bool> requestNotificationPermission() async {
    final status = await Permission.notification.request();
    return status.isGranted;
  }

  /// 请求麦克风权限
  static Future<bool> requestMicrophonePermission() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  /// 请求联系人权限
  static Future<bool> requestContactsPermission() async {
    final status = await Permission.contacts.request();
    return status.isGranted;
  }

  /// 检查相机权限状态
  static Future<PermissionStatus> getCameraPermissionStatus() async {
    return await Permission.camera.status;
  }

  /// 检查相册权限状态
  static Future<PermissionStatus> getPhotosPermissionStatus() async {
    if (Platform.isAndroid) {
      final androidInfo = await _deviceInfo.androidInfo;
      if (androidInfo.version.sdkInt >= 33) {
        return await Permission.photos.status;
      } else {
        return await Permission.storage.status;
      }
    } else if (Platform.isIOS) {
      return await Permission.photos.status;
    }
    return PermissionStatus.granted;
  }

  /// 检查存储权限状态
  static Future<PermissionStatus> getStoragePermissionStatus() async {
    if (Platform.isAndroid) {
      final androidInfo = await _deviceInfo.androidInfo;
      if (androidInfo.version.sdkInt >= 30) {
        return await Permission.manageExternalStorage.status;
      } else {
        return await Permission.storage.status;
      }
    }
    return PermissionStatus.granted;
  }

  /// 检查位置权限状态
  static Future<PermissionStatus> getLocationPermissionStatus() async {
    return await Permission.location.status;
  }

  /// 检查通知权限状态
  static Future<PermissionStatus> getNotificationPermissionStatus() async {
    return await Permission.notification.status;
  }

  /// 检查麦克风权限状态
  static Future<PermissionStatus> getMicrophonePermissionStatus() async {
    return await Permission.microphone.status;
  }

  /// 检查联系人权限状态
  static Future<PermissionStatus> getContactsPermissionStatus() async {
    return await Permission.contacts.status;
  }

  /// 检查是否有相机权限
  static Future<bool> hasCameraPermission() async {
    final status = await getCameraPermissionStatus();
    return status.isGranted;
  }

  /// 检查是否有相册权限
  static Future<bool> hasPhotosPermission() async {
    final status = await getPhotosPermissionStatus();
    return status.isGranted;
  }

  /// 检查是否有存储权限
  static Future<bool> hasStoragePermission() async {
    final status = await getStoragePermissionStatus();
    return status.isGranted;
  }

  /// 检查是否有位置权限
  static Future<bool> hasLocationPermission() async {
    final status = await getLocationPermissionStatus();
    return status.isGranted;
  }

  /// 检查是否有通知权限
  static Future<bool> hasNotificationPermission() async {
    final status = await getNotificationPermissionStatus();
    return status.isGranted;
  }

  /// 检查是否有麦克风权限
  static Future<bool> hasMicrophonePermission() async {
    final status = await getMicrophonePermissionStatus();
    return status.isGranted;
  }

  /// 检查是否有联系人权限
  static Future<bool> hasContactsPermission() async {
    final status = await getContactsPermissionStatus();
    return status.isGranted;
  }

  /// 打开应用设置页面
  static Future<bool> openAppSettings() async {
    return await openAppSettings();
  }

  /// 显示权限说明对话框
  static Future<bool?> showPermissionDialog(
    BuildContext context, {
    required String title,
    required String message,
    String confirmText = '去设置',
    String cancelText = '取消',
  }) async {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(cancelText),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(confirmText),
          ),
        ],
      ),
    );
  }

  /// 请求相机和相册权限（用于拍照和选择照片）
  static Future<bool> requestCameraAndPhotosPermission(
    BuildContext context, {
    bool showDialog = true,
  }) async {
    // 检查相机权限
    final cameraStatus = await getCameraPermissionStatus();
    if (cameraStatus.isDenied) {
      if (showDialog) {
        final shouldRequest = await showPermissionDialog(
          context,
          title: '需要相机权限',
          message: '为了拍照功能，需要访问您的相机。请在设置中允许相机权限。',
        );
        
        if (shouldRequest != true) return false;
      }
      
      final granted = await requestCameraPermission();
      if (!granted) return false;
    } else if (cameraStatus.isPermanentlyDenied) {
      if (showDialog) {
        final shouldOpenSettings = await showPermissionDialog(
          context,
          title: '相机权限被拒绝',
          message: '相机权限已被永久拒绝，请在设置中手动开启。',
        );
        
        if (shouldOpenSettings == true) {
          await openAppSettings();
        }
      }
      return false;
    }

    // 检查相册权限
    final photosStatus = await getPhotosPermissionStatus();
    if (photosStatus.isDenied) {
      if (showDialog) {
        final shouldRequest = await showPermissionDialog(
          context,
          title: '需要相册权限',
          message: '为了选择照片功能，需要访问您的相册。请在设置中允许相册权限。',
        );
        
        if (shouldRequest != true) return false;
      }
      
      final granted = await requestPhotosPermission();
      if (!granted) return false;
    } else if (photosStatus.isPermanentlyDenied) {
      if (showDialog) {
        final shouldOpenSettings = await showPermissionDialog(
          context,
          title: '相册权限被拒绝',
          message: '相册权限已被永久拒绝，请在设置中手动开启。',
        );
        
        if (shouldOpenSettings == true) {
          await openAppSettings();
        }
      }
      return false;
    }

    return true;
  }

  /// 请求位置权限（带说明对话框）
  static Future<bool> requestLocationPermissionWithDialog(
    BuildContext context, {
    bool showDialog = true,
  }) async {
    final status = await getLocationPermissionStatus();
    
    if (status.isDenied) {
      if (showDialog) {
        final shouldRequest = await showPermissionDialog(
          context,
          title: '需要位置权限',
          message: '为了在照片中添加位置信息，需要访问您的位置。请在设置中允许位置权限。',
        );
        
        if (shouldRequest != true) return false;
      }
      
      return await requestLocationPermission();
    } else if (status.isPermanentlyDenied) {
      if (showDialog) {
        final shouldOpenSettings = await showPermissionDialog(
          context,
          title: '位置权限被拒绝',
          message: '位置权限已被永久拒绝，请在设置中手动开启。',
        );
        
        if (shouldOpenSettings == true) {
          await openAppSettings();
        }
      }
      return false;
    }
    
    return status.isGranted;
  }

  /// 请求通知权限（带说明对话框）
  static Future<bool> requestNotificationPermissionWithDialog(
    BuildContext context, {
    bool showDialog = true,
  }) async {
    final status = await getNotificationPermissionStatus();
    
    if (status.isDenied) {
      if (showDialog) {
        final shouldRequest = await showPermissionDialog(
          context,
          title: '需要通知权限',
          message: '为了及时通知您新的照片和消息，需要发送通知的权限。请在设置中允许通知权限。',
        );
        
        if (shouldRequest != true) return false;
      }
      
      return await requestNotificationPermission();
    } else if (status.isPermanentlyDenied) {
      if (showDialog) {
        final shouldOpenSettings = await showPermissionDialog(
          context,
          title: '通知权限被拒绝',
          message: '通知权限已被永久拒绝，请在设置中手动开启。',
        );
        
        if (shouldOpenSettings == true) {
          await openAppSettings();
        }
      }
      return false;
    }
    
    return status.isGranted;
  }

  /// 批量请求权限
  static Future<Map<Permission, PermissionStatus>> requestMultiplePermissions(
    List<Permission> permissions,
  ) async {
    return await permissions.request();
  }

  /// 检查多个权限状态
  static Future<Map<Permission, PermissionStatus>> checkMultiplePermissions(
    List<Permission> permissions,
  ) async {
    final Map<Permission, PermissionStatus> statuses = {};
    
    for (final permission in permissions) {
      statuses[permission] = await permission.status;
    }
    
    return statuses;
  }

  /// 获取权限状态描述
  static String getPermissionStatusDescription(PermissionStatus status) {
    switch (status) {
      case PermissionStatus.granted:
        return '已授权';
      case PermissionStatus.denied:
        return '已拒绝';
      case PermissionStatus.restricted:
        return '受限制';
      case PermissionStatus.limited:
        return '有限授权';
      case PermissionStatus.permanentlyDenied:
        return '永久拒绝';
      case PermissionStatus.provisional:
        return '临时授权';
    }
  }

  /// 获取权限名称
  static String getPermissionName(Permission permission) {
    switch (permission) {
      case Permission.camera:
        return '相机';
      case Permission.photos:
        return '相册';
      case Permission.storage:
        return '存储';
      case Permission.location:
        return '位置';
      case Permission.locationWhenInUse:
        return '使用时位置';
      case Permission.locationAlways:
        return '始终位置';
      case Permission.notification:
        return '通知';
      case Permission.microphone:
        return '麦克风';
      case Permission.contacts:
        return '联系人';
      case Permission.manageExternalStorage:
        return '管理外部存储';
      default:
        return permission.toString().split('.').last;
    }
  }

  /// 检查是否需要显示权限说明
  static Future<bool> shouldShowRequestPermissionRationale(
    Permission permission,
  ) async {
    if (Platform.isAndroid) {
      return await permission.shouldShowRequestRationale;
    }
    return false;
  }

  /// 获取设备信息
  static Future<Map<String, dynamic>> getDeviceInfo() async {
    if (Platform.isAndroid) {
      final androidInfo = await _deviceInfo.androidInfo;
      return {
        'platform': 'Android',
        'version': androidInfo.version.release,
        'sdkInt': androidInfo.version.sdkInt,
        'manufacturer': androidInfo.manufacturer,
        'model': androidInfo.model,
      };
    } else if (Platform.isIOS) {
      final iosInfo = await _deviceInfo.iosInfo;
      return {
        'platform': 'iOS',
        'version': iosInfo.systemVersion,
        'model': iosInfo.model,
        'name': iosInfo.name,
      };
    }
    return {'platform': 'Unknown'};
  }
}