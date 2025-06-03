import 'package:shared_preferences/shared_preferences.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'dart:convert';

import '../../features/auth/domain/models/user_model.dart';
import '../config/app_config.dart';

class StorageService {
  static late SharedPreferences _prefs;
  static late Box _userBox;
  static late Box _settingsBox;
  static late Box _cacheBox;
  
  // 初始化存储服务
  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    
    // 注册Hive适配器
    if (!Hive.isAdapterRegistered(0)) {
      Hive.registerAdapter(UserModelAdapter());
    }
    
    // 打开Hive盒子
    _userBox = await Hive.openBox('user_data');
    _settingsBox = await Hive.openBox('app_settings');
    _cacheBox = await Hive.openBox('cache_data');
  }
  
  // 认证相关
  Future<void> saveToken(String token) async {
    await _prefs.setString(AppConfig.tokenKey, token);
  }
  
  Future<String?> getToken() async {
    return _prefs.getString(AppConfig.tokenKey);
  }
  
  Future<void> saveUser(UserModel user) async {
    await _userBox.put(AppConfig.userKey, user);
  }
  
  Future<UserModel?> getUser() async {
    return _userBox.get(AppConfig.userKey);
  }
  
  Future<void> clearAuth() async {
    await _prefs.remove(AppConfig.tokenKey);
    await _userBox.delete(AppConfig.userKey);
  }
  
  // 应用设置
  Future<void> saveSetting(String key, dynamic value) async {
    await _settingsBox.put(key, value);
  }
  
  Future<T?> getSetting<T>(String key, {T? defaultValue}) async {
    return _settingsBox.get(key, defaultValue: defaultValue) as T?;
  }
  
  Future<void> removeSetting(String key) async {
    await _settingsBox.delete(key);
  }
  
  // 主题设置
  Future<void> saveThemeMode(String themeMode) async {
    await saveSetting('theme_mode', themeMode);
  }
  
  Future<String> getThemeMode() async {
    return await getSetting('theme_mode', defaultValue: 'system') ?? 'system';
  }
  
  // 语言设置
  Future<void> saveLanguage(String languageCode) async {
    await saveSetting('language', languageCode);
  }
  
  Future<String> getLanguage() async {
    return await getSetting('language', defaultValue: 'zh') ?? 'zh';
  }
  
  // 相机设置
  Future<void> saveCameraSettings(Map<String, dynamic> settings) async {
    await saveSetting('camera_settings', settings);
  }
  
  Future<Map<String, dynamic>> getCameraSettings() async {
    return await getSetting('camera_settings', defaultValue: <String, dynamic>{}) ?? <String, dynamic>{};
  }
  
  // 上传设置
  Future<void> saveUploadSettings(Map<String, dynamic> settings) async {
    await saveSetting('upload_settings', settings);
  }
  
  Future<Map<String, dynamic>> getUploadSettings() async {
    return await getSetting('upload_settings', defaultValue: <String, dynamic>{}) ?? <String, dynamic>{};
  }
  
  // 缓存管理
  Future<void> saveCache(String key, dynamic data, {Duration? expiry}) async {
    final cacheData = {
      'data': data,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'expiry': expiry?.inMilliseconds,
    };
    await _cacheBox.put(key, cacheData);
  }
  
  Future<T?> getCache<T>(String key) async {
    final cacheData = _cacheBox.get(key);
    if (cacheData == null) return null;
    
    final timestamp = cacheData['timestamp'] as int;
    final expiry = cacheData['expiry'] as int?;
    
    if (expiry != null) {
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - timestamp > expiry) {
        await _cacheBox.delete(key);
        return null;
      }
    }
    
    return cacheData['data'] as T?;
  }
  
  Future<void> removeCache(String key) async {
    await _cacheBox.delete(key);
  }
  
  Future<void> clearCache() async {
    await _cacheBox.clear();
  }
  
  // 清理过期缓存
  Future<void> cleanExpiredCache() async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final keysToDelete = <String>[];
    
    for (final key in _cacheBox.keys) {
      final cacheData = _cacheBox.get(key);
      if (cacheData != null && cacheData is Map) {
        final timestamp = cacheData['timestamp'] as int?;
        final expiry = cacheData['expiry'] as int?;
        
        if (timestamp != null && expiry != null) {
          if (now - timestamp > expiry) {
            keysToDelete.add(key.toString());
          }
        }
      }
    }
    
    for (final key in keysToDelete) {
      await _cacheBox.delete(key);
    }
  }
  
  // 获取缓存大小
  Future<int> getCacheSize() async {
    int size = 0;
    for (final key in _cacheBox.keys) {
      final value = _cacheBox.get(key);
      if (value != null) {
        final jsonString = jsonEncode(value);
        size += jsonString.length;
      }
    }
    return size;
  }
  
  // 首次启动标记
  Future<void> setFirstLaunch(bool isFirst) async {
    await _prefs.setBool('first_launch', isFirst);
  }
  
  Future<bool> isFirstLaunch() async {
    return _prefs.getBool('first_launch') ?? true;
  }
  
  // 最后同步时间
  Future<void> setLastSyncTime(DateTime time) async {
    await _prefs.setInt('last_sync_time', time.millisecondsSinceEpoch);
  }
  
  Future<DateTime?> getLastSyncTime() async {
    final timestamp = _prefs.getInt('last_sync_time');
    return timestamp != null ? DateTime.fromMillisecondsSinceEpoch(timestamp) : null;
  }
  
  // 离线数据
  Future<void> saveOfflineData(String key, Map<String, dynamic> data) async {
    await _cacheBox.put('offline_$key', data);
  }
  
  Future<Map<String, dynamic>?> getOfflineData(String key) async {
    final data = _cacheBox.get('offline_$key');
    return data != null ? Map<String, dynamic>.from(data) : null;
  }
  
  Future<void> removeOfflineData(String key) async {
    await _cacheBox.delete('offline_$key');
  }
  
  // 获取所有离线数据键
  List<String> getOfflineDataKeys() {
    return _cacheBox.keys
        .where((key) => key.toString().startsWith('offline_'))
        .map((key) => key.toString().substring(8))
        .toList();
  }
  
  // 清除所有数据
  Future<void> clearAll() async {
    await _prefs.clear();
    await _userBox.clear();
    await _settingsBox.clear();
    await _cacheBox.clear();
  }
  
  // 导出设置
  Future<Map<String, dynamic>> exportSettings() async {
    final settings = <String, dynamic>{};
    
    // 导出应用设置
    for (final key in _settingsBox.keys) {
      settings[key.toString()] = _settingsBox.get(key);
    }
    
    return settings;
  }
  
  // 导入设置
  Future<void> importSettings(Map<String, dynamic> settings) async {
    for (final entry in settings.entries) {
      await _settingsBox.put(entry.key, entry.value);
    }
  }
}