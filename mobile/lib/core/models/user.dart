import 'package:json_annotation/json_annotation.dart';

part 'user.g.dart';

@JsonSerializable()
class User {
  final String id;
  final String username;
  final String email;
  @JsonKey(name: 'display_name')
  final String? displayName;
  final String? avatar;
  final String? bio;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;
  @JsonKey(name: 'email_verified_at')
  final DateTime? emailVerifiedAt;
  @JsonKey(name: 'is_active')
  final bool isActive;
  final UserRole role;
  final UserSettings? settings;
  final UserStats? stats;
  
  const User({
    required this.id,
    required this.username,
    required this.email,
    this.displayName,
    this.avatar,
    this.bio,
    required this.createdAt,
    required this.updatedAt,
    this.emailVerifiedAt,
    this.isActive = true,
    this.role = UserRole.user,
    this.settings,
    this.stats,
  });
  
  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);
  
  User copyWith({
    String? id,
    String? username,
    String? email,
    String? displayName,
    String? avatar,
    String? bio,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? emailVerifiedAt,
    bool? isActive,
    UserRole? role,
    UserSettings? settings,
    UserStats? stats,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      avatar: avatar ?? this.avatar,
      bio: bio ?? this.bio,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      emailVerifiedAt: emailVerifiedAt ?? this.emailVerifiedAt,
      isActive: isActive ?? this.isActive,
      role: role ?? this.role,
      settings: settings ?? this.settings,
      stats: stats ?? this.stats,
    );
  }
  
  String get displayNameOrUsername => displayName ?? username;
  bool get isEmailVerified => emailVerifiedAt != null;
  bool get isAdmin => role == UserRole.admin;
  bool get isModerator => role == UserRole.moderator || isAdmin;
}

enum UserRole {
  @JsonValue('user')
  user,
  @JsonValue('moderator')
  moderator,
  @JsonValue('admin')
  admin,
}

@JsonSerializable()
class UserSettings {
  final String language;
  final String theme;
  @JsonKey(name: 'notification_enabled')
  final bool notificationEnabled;
  @JsonKey(name: 'email_notification')
  final bool emailNotification;
  @JsonKey(name: 'push_notification')
  final bool pushNotification;
  @JsonKey(name: 'auto_upload')
  final bool autoUpload;
  @JsonKey(name: 'upload_quality')
  final String uploadQuality;
  @JsonKey(name: 'privacy_level')
  final String privacyLevel;
  
  const UserSettings({
    this.language = 'zh',
    this.theme = 'system',
    this.notificationEnabled = true,
    this.emailNotification = true,
    this.pushNotification = true,
    this.autoUpload = false,
    this.uploadQuality = 'high',
    this.privacyLevel = 'public',
  });
  
  factory UserSettings.fromJson(Map<String, dynamic> json) => _$UserSettingsFromJson(json);
  Map<String, dynamic> toJson() => _$UserSettingsToJson(this);
  
  UserSettings copyWith({
    String? language,
    String? theme,
    bool? notificationEnabled,
    bool? emailNotification,
    bool? pushNotification,
    bool? autoUpload,
    String? uploadQuality,
    String? privacyLevel,
  }) {
    return UserSettings(
      language: language ?? this.language,
      theme: theme ?? this.theme,
      notificationEnabled: notificationEnabled ?? this.notificationEnabled,
      emailNotification: emailNotification ?? this.emailNotification,
      pushNotification: pushNotification ?? this.pushNotification,
      autoUpload: autoUpload ?? this.autoUpload,
      uploadQuality: uploadQuality ?? this.uploadQuality,
      privacyLevel: privacyLevel ?? this.privacyLevel,
    );
  }
}

@JsonSerializable()
class UserStats {
  @JsonKey(name: 'total_photos')
  final int totalPhotos;
  @JsonKey(name: 'total_sessions')
  final int totalSessions;
  @JsonKey(name: 'total_likes')
  final int totalLikes;
  @JsonKey(name: 'total_storage_used')
  final int totalStorageUsed;
  @JsonKey(name: 'last_login_at')
  final DateTime? lastLoginAt;
  @JsonKey(name: 'login_count')
  final int loginCount;
  
  const UserStats({
    this.totalPhotos = 0,
    this.totalSessions = 0,
    this.totalLikes = 0,
    this.totalStorageUsed = 0,
    this.lastLoginAt,
    this.loginCount = 0,
  });
  
  factory UserStats.fromJson(Map<String, dynamic> json) => _$UserStatsFromJson(json);
  Map<String, dynamic> toJson() => _$UserStatsToJson(this);
  
  String get formattedStorageUsed {
    if (totalStorageUsed < 1024) {
      return '${totalStorageUsed}B';
    } else if (totalStorageUsed < 1024 * 1024) {
      return '${(totalStorageUsed / 1024).toStringAsFixed(1)}KB';
    } else if (totalStorageUsed < 1024 * 1024 * 1024) {
      return '${(totalStorageUsed / (1024 * 1024)).toStringAsFixed(1)}MB';
    } else {
      return '${(totalStorageUsed / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
    }
  }
}

@JsonSerializable()
class AuthResponse {
  final User user;
  final String token;
  @JsonKey(name: 'refresh_token')
  final String? refreshToken;
  @JsonKey(name: 'expires_at')
  final DateTime expiresAt;
  
  const AuthResponse({
    required this.user,
    required this.token,
    this.refreshToken,
    required this.expiresAt,
  });
  
  factory AuthResponse.fromJson(Map<String, dynamic> json) => _$AuthResponseFromJson(json);
  Map<String, dynamic> toJson() => _$AuthResponseToJson(this);
  
  bool get isExpired => DateTime.now().isAfter(expiresAt);
  bool get isExpiringSoon => DateTime.now().add(const Duration(minutes: 5)).isAfter(expiresAt);
}