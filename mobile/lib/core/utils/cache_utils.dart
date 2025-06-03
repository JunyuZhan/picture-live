import 'package:hive_flutter/hive_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

class CacheUtils {
  static const String _defaultBoxName = 'app_cache';
  static const String _imageBoxName = 'image_cache';
  static const String _dataBoxName = 'data_cache';
  static const String _settingsBoxName = 'settings_cache';
  
  static Box? _defaultBox;
  static Box? _imageBox;
  static Box? _dataBox;
  static Box? _settingsBox;
  static SharedPreferences? _prefs;

  /// 初始化缓存
  static Future<void> initialize() async {
    try {
      // 初始化 Hive
      await Hive.initFlutter();
      
      // 打开缓存盒子
      _defaultBox = await Hive.openBox(_defaultBoxName);
      _imageBox = await Hive.openBox(_imageBoxName);
      _dataBox = await Hive.openBox(_dataBoxName);
      _settingsBox = await Hive.openBox(_settingsBoxName);
      
      // 初始化 SharedPreferences
      _prefs = await SharedPreferences.getInstance();
      
      print('缓存初始化成功');
    } catch (e) {
      print('缓存初始化失败: $e');
    }
  }

  /// 关闭缓存
  static Future<void> dispose() async {
    try {
      await _defaultBox?.close();
      await _imageBox?.close();
      await _dataBox?.close();
      await _settingsBox?.close();
      await Hive.close();
      print('缓存已关闭');
    } catch (e) {
      print('关闭缓存失败: $e');
    }
  }

  /// 存储字符串数据
  static Future<bool> setString(String key, String value, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      await box.put(key, value);
      return true;
    } catch (e) {
      print('存储字符串失败: $e');
      return false;
    }
  }

  /// 获取字符串数据
  static Future<String?> getString(String key, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      return box.get(key);
    } catch (e) {
      print('获取字符串失败: $e');
      return null;
    }
  }

  /// 存储整数数据
  static Future<bool> setInt(String key, int value, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      await box.put(key, value);
      return true;
    } catch (e) {
      print('存储整数失败: $e');
      return false;
    }
  }

  /// 获取整数数据
  static Future<int?> getInt(String key, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      return box.get(key);
    } catch (e) {
      print('获取整数失败: $e');
      return null;
    }
  }

  /// 存储双精度数据
  static Future<bool> setDouble(String key, double value, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      await box.put(key, value);
      return true;
    } catch (e) {
      print('存储双精度数失败: $e');
      return false;
    }
  }

  /// 获取双精度数据
  static Future<double?> getDouble(String key, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      return box.get(key);
    } catch (e) {
      print('获取双精度数失败: $e');
      return null;
    }
  }

  /// 存储布尔数据
  static Future<bool> setBool(String key, bool value, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      await box.put(key, value);
      return true;
    } catch (e) {
      print('存储布尔值失败: $e');
      return false;
    }
  }

  /// 获取布尔数据
  static Future<bool?> getBool(String key, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      return box.get(key);
    } catch (e) {
      print('获取布尔值失败: $e');
      return null;
    }
  }

  /// 存储列表数据
  static Future<bool> setList(String key, List<dynamic> value, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      await box.put(key, value);
      return true;
    } catch (e) {
      print('存储列表失败: $e');
      return false;
    }
  }

  /// 获取列表数据
  static Future<List<dynamic>?> getList(String key, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      return box.get(key)?.cast<dynamic>();
    } catch (e) {
      print('获取列表失败: $e');
      return null;
    }
  }

  /// 存储Map数据
  static Future<bool> setMap(String key, Map<String, dynamic> value, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      await box.put(key, value);
      return true;
    } catch (e) {
      print('存储Map失败: $e');
      return false;
    }
  }

  /// 获取Map数据
  static Future<Map<String, dynamic>?> getMap(String key, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      final data = box.get(key);
      if (data is Map) {
        return Map<String, dynamic>.from(data);
      }
      return null;
    } catch (e) {
      print('获取Map失败: $e');
      return null;
    }
  }

  /// 存储JSON数据
  static Future<bool> setJson(String key, Map<String, dynamic> value, {String? boxName}) async {
    try {
      final jsonString = jsonEncode(value);
      return await setString(key, jsonString, boxName: boxName);
    } catch (e) {
      print('存储JSON失败: $e');
      return false;
    }
  }

  /// 获取JSON数据
  static Future<Map<String, dynamic>?> getJson(String key, {String? boxName}) async {
    try {
      final jsonString = await getString(key, boxName: boxName);
      if (jsonString != null) {
        return jsonDecode(jsonString);
      }
      return null;
    } catch (e) {
      print('获取JSON失败: $e');
      return null;
    }
  }

  /// 存储字节数据
  static Future<bool> setBytes(String key, Uint8List value, {String? boxName}) async {
    try {
      final box = await _getBox(boxName ?? _imageBoxName);
      await box.put(key, value);
      return true;
    } catch (e) {
      print('存储字节数据失败: $e');
      return false;
    }
  }

  /// 获取字节数据
  static Future<Uint8List?> getBytes(String key, {String? boxName}) async {
    try {
      final box = await _getBox(boxName ?? _imageBoxName);
      return box.get(key);
    } catch (e) {
      print('获取字节数据失败: $e');
      return null;
    }
  }

  /// 存储带过期时间的数据
  static Future<bool> setWithExpiry(
    String key,
    dynamic value,
    Duration expiry, {
    String? boxName,
  }) async {
    try {
      final expiryTime = DateTime.now().add(expiry).millisecondsSinceEpoch;
      final cacheData = {
        'value': value,
        'expiry': expiryTime,
      };
      final box = await _getBox(boxName);
      await box.put(key, cacheData);
      return true;
    } catch (e) {
      print('存储带过期时间的数据失败: $e');
      return false;
    }
  }

  /// 获取带过期时间的数据
  static Future<T?> getWithExpiry<T>(String key, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      final cacheData = box.get(key);
      
      if (cacheData is Map) {
        final expiry = cacheData['expiry'] as int?;
        if (expiry != null && DateTime.now().millisecondsSinceEpoch > expiry) {
          // 数据已过期，删除并返回null
          await box.delete(key);
          return null;
        }
        return cacheData['value'] as T?;
      }
      
      return null;
    } catch (e) {
      print('获取带过期时间的数据失败: $e');
      return null;
    }
  }

  /// 检查键是否存在
  static Future<bool> containsKey(String key, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      return box.containsKey(key);
    } catch (e) {
      print('检查键是否存在失败: $e');
      return false;
    }
  }

  /// 删除指定键的数据
  static Future<bool> remove(String key, {String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      await box.delete(key);
      return true;
    } catch (e) {
      print('删除数据失败: $e');
      return false;
    }
  }

  /// 清空指定盒子的所有数据
  static Future<bool> clear({String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      await box.clear();
      return true;
    } catch (e) {
      print('清空缓存失败: $e');
      return false;
    }
  }

  /// 清空所有缓存
  static Future<bool> clearAll() async {
    try {
      await _defaultBox?.clear();
      await _imageBox?.clear();
      await _dataBox?.clear();
      await _settingsBox?.clear();
      await _prefs?.clear();
      return true;
    } catch (e) {
      print('清空所有缓存失败: $e');
      return false;
    }
  }

  /// 获取指定盒子的所有键
  static Future<List<String>> getKeys({String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      return box.keys.cast<String>().toList();
    } catch (e) {
      print('获取键列表失败: $e');
      return [];
    }
  }

  /// 获取指定盒子的数据数量
  static Future<int> getLength({String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      return box.length;
    } catch (e) {
      print('获取数据数量失败: $e');
      return 0;
    }
  }

  /// 获取缓存大小（字节）
  static Future<int> getCacheSize() async {
    try {
      int totalSize = 0;
      
      // 计算 Hive 缓存大小
      final hiveDir = Directory('${Directory.current.path}/hive');
      if (await hiveDir.exists()) {
        await for (final entity in hiveDir.list(recursive: true)) {
          if (entity is File) {
            totalSize += await entity.length();
          }
        }
      }
      
      return totalSize;
    } catch (e) {
      print('获取缓存大小失败: $e');
      return 0;
    }
  }

  /// 清理过期数据
  static Future<int> cleanExpiredData({String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      final keys = box.keys.toList();
      int cleanedCount = 0;
      
      for (final key in keys) {
        final data = box.get(key);
        if (data is Map && data.containsKey('expiry')) {
          final expiry = data['expiry'] as int?;
          if (expiry != null && DateTime.now().millisecondsSinceEpoch > expiry) {
            await box.delete(key);
            cleanedCount++;
          }
        }
      }
      
      return cleanedCount;
    } catch (e) {
      print('清理过期数据失败: $e');
      return 0;
    }
  }

  /// 压缩缓存
  static Future<bool> compactCache({String? boxName}) async {
    try {
      final box = await _getBox(boxName);
      await box.compact();
      return true;
    } catch (e) {
      print('压缩缓存失败: $e');
      return false;
    }
  }

  /// 获取缓存统计信息
  static Future<CacheStats> getCacheStats() async {
    try {
      final defaultLength = await getLength(boxName: _defaultBoxName);
      final imageLength = await getLength(boxName: _imageBoxName);
      final dataLength = await getLength(boxName: _dataBoxName);
      final settingsLength = await getLength(boxName: _settingsBoxName);
      final totalSize = await getCacheSize();
      
      return CacheStats(
        defaultCacheCount: defaultLength,
        imageCacheCount: imageLength,
        dataCacheCount: dataLength,
        settingsCacheCount: settingsLength,
        totalCount: defaultLength + imageLength + dataLength + settingsLength,
        totalSize: totalSize,
      );
    } catch (e) {
      print('获取缓存统计信息失败: $e');
      return CacheStats.empty();
    }
  }

  /// 使用 SharedPreferences 存储简单数据
  static Future<bool> setPreference(String key, dynamic value) async {
    try {
      _prefs ??= await SharedPreferences.getInstance();
      
      if (value is String) {
        return await _prefs!.setString(key, value);
      } else if (value is int) {
        return await _prefs!.setInt(key, value);
      } else if (value is double) {
        return await _prefs!.setDouble(key, value);
      } else if (value is bool) {
        return await _prefs!.setBool(key, value);
      } else if (value is List<String>) {
        return await _prefs!.setStringList(key, value);
      } else {
        return await _prefs!.setString(key, jsonEncode(value));
      }
    } catch (e) {
      print('存储偏好设置失败: $e');
      return false;
    }
  }

  /// 使用 SharedPreferences 获取简单数据
  static Future<T?> getPreference<T>(String key) async {
    try {
      _prefs ??= await SharedPreferences.getInstance();
      return _prefs!.get(key) as T?;
    } catch (e) {
      print('获取偏好设置失败: $e');
      return null;
    }
  }

  /// 获取指定盒子
  static Future<Box> _getBox(String? boxName) async {
    switch (boxName) {
      case _imageBoxName:
        return _imageBox ??= await Hive.openBox(_imageBoxName);
      case _dataBoxName:
        return _dataBox ??= await Hive.openBox(_dataBoxName);
      case _settingsBoxName:
        return _settingsBox ??= await Hive.openBox(_settingsBoxName);
      default:
        return _defaultBox ??= await Hive.openBox(_defaultBoxName);
    }
  }

  /// 缓存盒子名称常量
  static const String defaultBox = _defaultBoxName;
  static const String imageBox = _imageBoxName;
  static const String dataBox = _dataBoxName;
  static const String settingsBox = _settingsBoxName;
}

/// 缓存统计信息
class CacheStats {
  final int defaultCacheCount;
  final int imageCacheCount;
  final int dataCacheCount;
  final int settingsCacheCount;
  final int totalCount;
  final int totalSize;

  const CacheStats({
    required this.defaultCacheCount,
    required this.imageCacheCount,
    required this.dataCacheCount,
    required this.settingsCacheCount,
    required this.totalCount,
    required this.totalSize,
  });

  factory CacheStats.empty() {
    return const CacheStats(
      defaultCacheCount: 0,
      imageCacheCount: 0,
      dataCacheCount: 0,
      settingsCacheCount: 0,
      totalCount: 0,
      totalSize: 0,
    );
  }

  String get formattedSize {
    if (totalSize < 1024) {
      return '${totalSize}B';
    } else if (totalSize < 1024 * 1024) {
      return '${(totalSize / 1024).toStringAsFixed(1)}KB';
    } else if (totalSize < 1024 * 1024 * 1024) {
      return '${(totalSize / (1024 * 1024)).toStringAsFixed(1)}MB';
    } else {
      return '${(totalSize / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'defaultCacheCount': defaultCacheCount,
      'imageCacheCount': imageCacheCount,
      'dataCacheCount': dataCacheCount,
      'settingsCacheCount': settingsCacheCount,
      'totalCount': totalCount,
      'totalSize': totalSize,
      'formattedSize': formattedSize,
    };
  }

  @override
  String toString() {
    return 'CacheStats(total: $totalCount items, size: $formattedSize)';
  }
}