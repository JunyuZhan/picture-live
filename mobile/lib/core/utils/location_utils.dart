import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'dart:math' as math;

class LocationUtils {
  /// 获取当前位置
  static Future<Position?> getCurrentLocation({
    LocationAccuracy accuracy = LocationAccuracy.high,
    Duration? timeLimit,
  }) async {
    try {
      // 检查位置服务是否启用
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw LocationServiceDisabledException();
      }

      // 检查位置权限
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw LocationPermissionDeniedException();
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw LocationPermissionDeniedForeverException();
      }

      // 获取当前位置
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: accuracy,
        timeLimit: timeLimit,
      );
    } catch (e) {
      print('获取位置失败: $e');
      return null;
    }
  }

  /// 获取最后已知位置
  static Future<Position?> getLastKnownLocation() async {
    try {
      return await Geolocator.getLastKnownPosition();
    } catch (e) {
      print('获取最后已知位置失败: $e');
      return null;
    }
  }

  /// 监听位置变化
  static Stream<Position> getPositionStream({
    LocationSettings? locationSettings,
  }) {
    return Geolocator.getPositionStream(
      locationSettings: locationSettings ??
          const LocationSettings(
            accuracy: LocationAccuracy.high,
            distanceFilter: 10,
          ),
    );
  }

  /// 根据坐标获取地址信息
  static Future<List<Placemark>?> getAddressFromCoordinates(
    double latitude,
    double longitude, {
    String? localeIdentifier,
  }) async {
    try {
      return await placemarkFromCoordinates(
        latitude,
        longitude,
        localeIdentifier: localeIdentifier,
      );
    } catch (e) {
      print('获取地址信息失败: $e');
      return null;
    }
  }

  /// 根据地址获取坐标信息
  static Future<List<Location>?> getCoordinatesFromAddress(
    String address, {
    String? localeIdentifier,
  }) async {
    try {
      return await locationFromAddress(
        address,
        localeIdentifier: localeIdentifier,
      );
    } catch (e) {
      print('获取坐标信息失败: $e');
      return null;
    }
  }

  /// 计算两点之间的距离（米）
  static double calculateDistance(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }

  /// 计算两点之间的方位角（度）
  static double calculateBearing(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    return Geolocator.bearingBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }

  /// 格式化距离显示
  static String formatDistance(double distanceInMeters) {
    if (distanceInMeters < 1000) {
      return '${distanceInMeters.round()}m';
    } else if (distanceInMeters < 10000) {
      return '${(distanceInMeters / 1000).toStringAsFixed(1)}km';
    } else {
      return '${(distanceInMeters / 1000).round()}km';
    }
  }

  /// 格式化地址显示
  static String formatAddress(Placemark placemark) {
    final parts = <String>[];
    
    if (placemark.name?.isNotEmpty == true) {
      parts.add(placemark.name!);
    }
    
    if (placemark.street?.isNotEmpty == true) {
      parts.add(placemark.street!);
    }
    
    if (placemark.subLocality?.isNotEmpty == true) {
      parts.add(placemark.subLocality!);
    }
    
    if (placemark.locality?.isNotEmpty == true) {
      parts.add(placemark.locality!);
    }
    
    if (placemark.administrativeArea?.isNotEmpty == true) {
      parts.add(placemark.administrativeArea!);
    }
    
    if (placemark.country?.isNotEmpty == true) {
      parts.add(placemark.country!);
    }
    
    return parts.join(', ');
  }

  /// 格式化简短地址显示
  static String formatShortAddress(Placemark placemark) {
    final parts = <String>[];
    
    if (placemark.locality?.isNotEmpty == true) {
      parts.add(placemark.locality!);
    } else if (placemark.subLocality?.isNotEmpty == true) {
      parts.add(placemark.subLocality!);
    }
    
    if (placemark.administrativeArea?.isNotEmpty == true) {
      parts.add(placemark.administrativeArea!);
    }
    
    return parts.join(', ');
  }

  /// 检查位置服务是否可用
  static Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  /// 检查位置权限状态
  static Future<LocationPermission> checkLocationPermission() async {
    return await Geolocator.checkPermission();
  }

  /// 请求位置权限
  static Future<LocationPermission> requestLocationPermission() async {
    return await Geolocator.requestPermission();
  }

  /// 打开位置设置页面
  static Future<bool> openLocationSettings() async {
    return await Geolocator.openLocationSettings();
  }

  /// 打开应用设置页面
  static Future<bool> openAppSettings() async {
    return await Geolocator.openAppSettings();
  }

  /// 获取位置权限状态描述
  static String getLocationPermissionDescription(LocationPermission permission) {
    switch (permission) {
      case LocationPermission.denied:
        return '位置权限被拒绝';
      case LocationPermission.deniedForever:
        return '位置权限被永久拒绝';
      case LocationPermission.whileInUse:
        return '仅在使用应用时允许位置访问';
      case LocationPermission.always:
        return '始终允许位置访问';
      case LocationPermission.unableToDetermine:
        return '无法确定位置权限状态';
    }
  }

  /// 验证坐标是否有效
  static bool isValidCoordinates(double latitude, double longitude) {
    return latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;
  }

  /// 将度转换为弧度
  static double degreesToRadians(double degrees) {
    return degrees * (math.pi / 180.0);
  }

  /// 将弧度转换为度
  static double radiansToDegrees(double radians) {
    return radians * (180.0 / math.pi);
  }

  /// 计算地理中心点
  static Map<String, double> calculateCenter(List<Position> positions) {
    if (positions.isEmpty) {
      return {'latitude': 0.0, 'longitude': 0.0};
    }

    double x = 0.0;
    double y = 0.0;
    double z = 0.0;

    for (final position in positions) {
      final lat = degreesToRadians(position.latitude);
      final lng = degreesToRadians(position.longitude);

      x += math.cos(lat) * math.cos(lng);
      y += math.cos(lat) * math.sin(lng);
      z += math.sin(lat);
    }

    final total = positions.length;
    x = x / total;
    y = y / total;
    z = z / total;

    final centralLongitude = math.atan2(y, x);
    final centralSquareRoot = math.sqrt(x * x + y * y);
    final centralLatitude = math.atan2(z, centralSquareRoot);

    return {
      'latitude': radiansToDegrees(centralLatitude),
      'longitude': radiansToDegrees(centralLongitude),
    };
  }

  /// 检查点是否在圆形区域内
  static bool isPointInCircle(
    double pointLat,
    double pointLng,
    double centerLat,
    double centerLng,
    double radiusInMeters,
  ) {
    final distance = calculateDistance(pointLat, pointLng, centerLat, centerLng);
    return distance <= radiusInMeters;
  }

  /// 生成随机位置（用于测试）
  static Position generateRandomPosition({
    double centerLat = 39.9042,
    double centerLng = 116.4074,
    double radiusInKm = 10.0,
  }) {
    final random = math.Random();
    
    // 生成随机距离和角度
    final distance = random.nextDouble() * radiusInKm * 1000; // 转换为米
    final bearing = random.nextDouble() * 360; // 0-360度
    
    // 计算新的坐标
    final lat1 = degreesToRadians(centerLat);
    final lng1 = degreesToRadians(centerLng);
    final angularDistance = distance / 6371000; // 地球半径
    final bearingRad = degreesToRadians(bearing);
    
    final lat2 = math.asin(
      math.sin(lat1) * math.cos(angularDistance) +
      math.cos(lat1) * math.sin(angularDistance) * math.cos(bearingRad)
    );
    
    final lng2 = lng1 + math.atan2(
      math.sin(bearingRad) * math.sin(angularDistance) * math.cos(lat1),
      math.cos(angularDistance) - math.sin(lat1) * math.sin(lat2)
    );
    
    return Position(
      latitude: radiansToDegrees(lat2),
      longitude: radiansToDegrees(lng2),
      timestamp: DateTime.now(),
      accuracy: 5.0,
      altitude: 0.0,
      heading: 0.0,
      speed: 0.0,
      speedAccuracy: 0.0,
      altitudeAccuracy: 0.0,
      headingAccuracy: 0.0,
    );
  }

  /// 格式化坐标显示
  static String formatCoordinates(
    double latitude,
    double longitude, {
    int precision = 6,
  }) {
    return '${latitude.toStringAsFixed(precision)}, ${longitude.toStringAsFixed(precision)}';
  }

  /// 获取位置精度描述
  static String getAccuracyDescription(double accuracy) {
    if (accuracy <= 5) {
      return '高精度';
    } else if (accuracy <= 20) {
      return '中等精度';
    } else if (accuracy <= 100) {
      return '低精度';
    } else {
      return '很低精度';
    }
  }

  /// 创建位置设置
  static LocationSettings createLocationSettings({
    LocationAccuracy accuracy = LocationAccuracy.high,
    int distanceFilter = 10,
    Duration? timeLimit,
  }) {
    return LocationSettings(
      accuracy: accuracy,
      distanceFilter: distanceFilter,
      timeLimit: timeLimit,
    );
  }
}

/// 位置信息模型
class LocationInfo {
  final double latitude;
  final double longitude;
  final double? accuracy;
  final String? address;
  final String? shortAddress;
  final DateTime timestamp;

  const LocationInfo({
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.address,
    this.shortAddress,
    required this.timestamp,
  });

  factory LocationInfo.fromPosition(
    Position position, {
    String? address,
    String? shortAddress,
  }) {
    return LocationInfo(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      address: address,
      shortAddress: shortAddress,
      timestamp: position.timestamp ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'address': address,
      'shortAddress': shortAddress,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory LocationInfo.fromJson(Map<String, dynamic> json) {
    return LocationInfo(
      latitude: json['latitude']?.toDouble() ?? 0.0,
      longitude: json['longitude']?.toDouble() ?? 0.0,
      accuracy: json['accuracy']?.toDouble(),
      address: json['address'],
      shortAddress: json['shortAddress'],
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
    );
  }

  @override
  String toString() {
    return 'LocationInfo(lat: $latitude, lng: $longitude, accuracy: $accuracy, address: $address)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is LocationInfo &&
        other.latitude == latitude &&
        other.longitude == longitude &&
        other.accuracy == accuracy &&
        other.address == address &&
        other.shortAddress == shortAddress &&
        other.timestamp == timestamp;
  }

  @override
  int get hashCode {
    return Object.hash(
      latitude,
      longitude,
      accuracy,
      address,
      shortAddress,
      timestamp,
    );
  }
}