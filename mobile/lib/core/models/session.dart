import 'package:json_annotation/json_annotation.dart';
import 'user.dart';

part 'session.g.dart';

@JsonSerializable()
class Session {
  final String id;
  final String name;
  final String? description;
  @JsonKey(name: 'is_public')
  final bool isPublic;
  @JsonKey(name: 'has_password')
  final bool hasPassword;
  @JsonKey(name: 'created_by')
  final String createdBy;
  final User? creator;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;
  @JsonKey(name: 'expires_at')
  final DateTime? expiresAt;
  final SessionStatus status;
  @JsonKey(name: 'max_photos')
  final int? maxPhotos;
  @JsonKey(name: 'photo_count')
  final int photoCount;
  @JsonKey(name: 'member_count')
  final int memberCount;
  @JsonKey(name: 'allowed_users')
  final List<String>? allowedUsers;
  final SessionSettings? settings;
  final SessionStats? stats;
  @JsonKey(name: 'user_role')
  final SessionMemberRole? userRole;
  @JsonKey(name: 'joined_at')
  final DateTime? joinedAt;
  
  const Session({
    required this.id,
    required this.name,
    this.description,
    this.isPublic = false,
    this.hasPassword = false,
    required this.createdBy,
    this.creator,
    required this.createdAt,
    required this.updatedAt,
    this.expiresAt,
    this.status = SessionStatus.active,
    this.maxPhotos,
    this.photoCount = 0,
    this.memberCount = 0,
    this.allowedUsers,
    this.settings,
    this.stats,
    this.userRole,
    this.joinedAt,
  });
  
  factory Session.fromJson(Map<String, dynamic> json) => _$SessionFromJson(json);
  Map<String, dynamic> toJson() => _$SessionToJson(this);
  
  Session copyWith({
    String? id,
    String? name,
    String? description,
    bool? isPublic,
    bool? hasPassword,
    String? createdBy,
    User? creator,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? expiresAt,
    SessionStatus? status,
    int? maxPhotos,
    int? photoCount,
    int? memberCount,
    List<String>? allowedUsers,
    SessionSettings? settings,
    SessionStats? stats,
    SessionMemberRole? userRole,
    DateTime? joinedAt,
  }) {
    return Session(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      isPublic: isPublic ?? this.isPublic,
      hasPassword: hasPassword ?? this.hasPassword,
      createdBy: createdBy ?? this.createdBy,
      creator: creator ?? this.creator,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      expiresAt: expiresAt ?? this.expiresAt,
      status: status ?? this.status,
      maxPhotos: maxPhotos ?? this.maxPhotos,
      photoCount: photoCount ?? this.photoCount,
      memberCount: memberCount ?? this.memberCount,
      allowedUsers: allowedUsers ?? this.allowedUsers,
      settings: settings ?? this.settings,
      stats: stats ?? this.stats,
      userRole: userRole ?? this.userRole,
      joinedAt: joinedAt ?? this.joinedAt,
    );
  }
  
  bool get isExpired => expiresAt != null && DateTime.now().isAfter(expiresAt!);
  bool get isActive => status == SessionStatus.active && !isExpired;
  bool get isFull => maxPhotos != null && photoCount >= maxPhotos!;
  bool get canUpload => isActive && !isFull && (userRole?.canUpload ?? false);
  bool get canManage => userRole?.canManage ?? false;
  bool get isOwner => userRole == SessionMemberRole.owner;
  bool get isMember => userRole != null;
  
  String get statusText {
    if (isExpired) return '已过期';
    switch (status) {
      case SessionStatus.active:
        return '活跃';
      case SessionStatus.paused:
        return '暂停';
      case SessionStatus.ended:
        return '已结束';
      case SessionStatus.archived:
        return '已归档';
    }
  }
}

enum SessionStatus {
  @JsonValue('active')
  active,
  @JsonValue('paused')
  paused,
  @JsonValue('ended')
  ended,
  @JsonValue('archived')
  archived,
}

enum SessionMemberRole {
  @JsonValue('owner')
  owner,
  @JsonValue('admin')
  admin,
  @JsonValue('member')
  member,
  @JsonValue('viewer')
  viewer,
}

extension SessionMemberRoleExtension on SessionMemberRole {
  bool get canUpload {
    switch (this) {
      case SessionMemberRole.owner:
      case SessionMemberRole.admin:
      case SessionMemberRole.member:
        return true;
      case SessionMemberRole.viewer:
        return false;
    }
  }
  
  bool get canManage {
    switch (this) {
      case SessionMemberRole.owner:
      case SessionMemberRole.admin:
        return true;
      case SessionMemberRole.member:
      case SessionMemberRole.viewer:
        return false;
    }
  }
  
  String get displayName {
    switch (this) {
      case SessionMemberRole.owner:
        return '所有者';
      case SessionMemberRole.admin:
        return '管理员';
      case SessionMemberRole.member:
        return '成员';
      case SessionMemberRole.viewer:
        return '观看者';
    }
  }
}

@JsonSerializable()
class SessionSettings {
  @JsonKey(name: 'auto_approve_photos')
  final bool autoApprovePhotos;
  @JsonKey(name: 'allow_comments')
  final bool allowComments;
  @JsonKey(name: 'allow_likes')
  final bool allowLikes;
  @JsonKey(name: 'allow_downloads')
  final bool allowDownloads;
  @JsonKey(name: 'watermark_enabled')
  final bool watermarkEnabled;
  @JsonKey(name: 'quality_limit')
  final String qualityLimit;
  @JsonKey(name: 'file_size_limit')
  final int fileSizeLimit;
  @JsonKey(name: 'allowed_formats')
  final List<String> allowedFormats;
  
  const SessionSettings({
    this.autoApprovePhotos = true,
    this.allowComments = true,
    this.allowLikes = true,
    this.allowDownloads = true,
    this.watermarkEnabled = false,
    this.qualityLimit = 'high',
    this.fileSizeLimit = 10485760, // 10MB
    this.allowedFormats = const ['jpg', 'jpeg', 'png', 'webp'],
  });
  
  factory SessionSettings.fromJson(Map<String, dynamic> json) => _$SessionSettingsFromJson(json);
  Map<String, dynamic> toJson() => _$SessionSettingsToJson(this);
  
  String get formattedFileSizeLimit {
    if (fileSizeLimit < 1024 * 1024) {
      return '${(fileSizeLimit / 1024).toStringAsFixed(0)}KB';
    } else {
      return '${(fileSizeLimit / (1024 * 1024)).toStringAsFixed(0)}MB';
    }
  }
}

@JsonSerializable()
class SessionStats {
  @JsonKey(name: 'total_photos')
  final int totalPhotos;
  @JsonKey(name: 'total_views')
  final int totalViews;
  @JsonKey(name: 'total_likes')
  final int totalLikes;
  @JsonKey(name: 'total_downloads')
  final int totalDownloads;
  @JsonKey(name: 'storage_used')
  final int storageUsed;
  @JsonKey(name: 'last_activity_at')
  final DateTime? lastActivityAt;
  @JsonKey(name: 'most_active_user')
  final String? mostActiveUser;
  
  const SessionStats({
    this.totalPhotos = 0,
    this.totalViews = 0,
    this.totalLikes = 0,
    this.totalDownloads = 0,
    this.storageUsed = 0,
    this.lastActivityAt,
    this.mostActiveUser,
  });
  
  factory SessionStats.fromJson(Map<String, dynamic> json) => _$SessionStatsFromJson(json);
  Map<String, dynamic> toJson() => _$SessionStatsToJson(this);
  
  String get formattedStorageUsed {
    if (storageUsed < 1024 * 1024) {
      return '${(storageUsed / 1024).toStringAsFixed(1)}KB';
    } else if (storageUsed < 1024 * 1024 * 1024) {
      return '${(storageUsed / (1024 * 1024)).toStringAsFixed(1)}MB';
    } else {
      return '${(storageUsed / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
    }
  }
}

@JsonSerializable()
class SessionMember {
  final String id;
  @JsonKey(name: 'session_id')
  final String sessionId;
  @JsonKey(name: 'user_id')
  final String userId;
  final User? user;
  final SessionMemberRole role;
  @JsonKey(name: 'joined_at')
  final DateTime joinedAt;
  @JsonKey(name: 'last_seen_at')
  final DateTime? lastSeenAt;
  @JsonKey(name: 'photo_count')
  final int photoCount;
  @JsonKey(name: 'is_online')
  final bool isOnline;
  
  const SessionMember({
    required this.id,
    required this.sessionId,
    required this.userId,
    this.user,
    required this.role,
    required this.joinedAt,
    this.lastSeenAt,
    this.photoCount = 0,
    this.isOnline = false,
  });
  
  factory SessionMember.fromJson(Map<String, dynamic> json) => _$SessionMemberFromJson(json);
  Map<String, dynamic> toJson() => _$SessionMemberToJson(this);
  
  String get displayName => user?.displayNameOrUsername ?? userId;
  String get avatar => user?.avatar ?? '';
}