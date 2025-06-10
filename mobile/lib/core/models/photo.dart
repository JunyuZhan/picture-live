import 'package:json_annotation/json_annotation.dart';
import 'user.dart';
import 'session.dart';

part 'photo.g.dart';

@JsonSerializable()
class Photo {
  final String id;
  final String? title;
  final String? description;
  @JsonKey(name: 'original_filename')
  final String originalFilename;
  @JsonKey(name: 'file_size')
  final int fileSize;
  @JsonKey(name: 'mime_type')
  final String mimeType;
  final int width;
  final int height;
  @JsonKey(name: 'uploaded_by')
  final String uploadedBy;
  final User? uploader;
  @JsonKey(name: 'session_id')
  final String? sessionId;
  final Session? session;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;
  final PhotoStatus status;
  final List<String> tags;
  final PhotoUrls urls;
  final PhotoMetadata? metadata;
  final PhotoStats? stats;
  @JsonKey(name: 'is_liked')
  final bool isLiked;
  @JsonKey(name: 'like_count')
  final int likeCount;
  @JsonKey(name: 'view_count')
  final int viewCount;
  @JsonKey(name: 'download_count')
  final int downloadCount;
  
  const Photo({
    required this.id,
    this.title,
    this.description,
    required this.originalFilename,
    required this.fileSize,
    required this.mimeType,
    required this.width,
    required this.height,
    required this.uploadedBy,
    this.uploader,
    this.sessionId,
    this.session,
    required this.createdAt,
    required this.updatedAt,
    this.status = PhotoStatus.active,
    this.tags = const [],
    required this.urls,
    this.metadata,
    this.stats,
    this.isLiked = false,
    this.likeCount = 0,
    this.viewCount = 0,
    this.downloadCount = 0,
  });
  
  factory Photo.fromJson(Map<String, dynamic> json) => _$PhotoFromJson(json);
  Map<String, dynamic> toJson() => _$PhotoToJson(this);
  
  Photo copyWith({
    String? id,
    String? title,
    String? description,
    String? originalFilename,
    int? fileSize,
    String? mimeType,
    int? width,
    int? height,
    String? uploadedBy,
    User? uploader,
    String? sessionId,
    Session? session,
    DateTime? createdAt,
    DateTime? updatedAt,
    PhotoStatus? status,
    List<String>? tags,
    PhotoUrls? urls,
    PhotoMetadata? metadata,
    PhotoStats? stats,
    bool? isLiked,
    int? likeCount,
    int? viewCount,
    int? downloadCount,
  }) {
    return Photo(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      originalFilename: originalFilename ?? this.originalFilename,
      fileSize: fileSize ?? this.fileSize,
      mimeType: mimeType ?? this.mimeType,
      width: width ?? this.width,
      height: height ?? this.height,
      uploadedBy: uploadedBy ?? this.uploadedBy,
      uploader: uploader ?? this.uploader,
      sessionId: sessionId ?? this.sessionId,
      session: session ?? this.session,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      status: status ?? this.status,
      tags: tags ?? this.tags,
      urls: urls ?? this.urls,
      metadata: metadata ?? this.metadata,
      stats: stats ?? this.stats,
      isLiked: isLiked ?? this.isLiked,
      likeCount: likeCount ?? this.likeCount,
      viewCount: viewCount ?? this.viewCount,
      downloadCount: downloadCount ?? this.downloadCount,
    );
  }
  
  String get displayTitle => title ?? originalFilename;
  String get uploaderName => uploader?.displayNameOrUsername ?? uploadedBy;
  String get sessionName => session?.name ?? sessionId ?? '未知相册';
  double get aspectRatio => width / height;
  
  String get formattedFileSize {
    if (fileSize < 1024) {
      return '${fileSize}B';
    } else if (fileSize < 1024 * 1024) {
      return '${(fileSize / 1024).toStringAsFixed(1)}KB';
    } else {
      return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)}MB';
    }
  }
  
  String get resolution => '${width}x${height}';
  
  bool get isImage => mimeType.startsWith('image/');
  bool get isVideo => mimeType.startsWith('video/');
  
  String get fileExtension {
    final parts = originalFilename.split('.');
    return parts.isNotEmpty ? parts.last.toLowerCase() : '';
  }
}

enum PhotoStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('processing')
  processing,
  @JsonValue('active')
  active,
  @JsonValue('hidden')
  hidden,
  @JsonValue('deleted')
  deleted,
}

extension PhotoStatusExtension on PhotoStatus {
  String get displayName {
    switch (this) {
      case PhotoStatus.pending:
        return '待审核';
      case PhotoStatus.processing:
        return '处理中';
      case PhotoStatus.active:
        return '正常';
      case PhotoStatus.hidden:
        return '已隐藏';
      case PhotoStatus.deleted:
        return '已删除';
    }
  }
  
  bool get isVisible {
    return this == PhotoStatus.active;
  }
}

@JsonSerializable()
class PhotoUrls {
  final String original;
  final String? large;
  final String? medium;
  final String? small;
  final String thumbnail;
  
  const PhotoUrls({
    required this.original,
    this.large,
    this.medium,
    this.small,
    required this.thumbnail,
  });
  
  factory PhotoUrls.fromJson(Map<String, dynamic> json) => _$PhotoUrlsFromJson(json);
  Map<String, dynamic> toJson() => _$PhotoUrlsToJson(this);
  
  String getBestQualityUrl(PhotoQuality quality) {
    switch (quality) {
      case PhotoQuality.original:
        return original;
      case PhotoQuality.large:
        return large ?? original;
      case PhotoQuality.medium:
        return medium ?? large ?? original;
      case PhotoQuality.small:
        return small ?? medium ?? large ?? original;
      case PhotoQuality.thumbnail:
        return thumbnail;
    }
  }
}

enum PhotoQuality {
  original,
  large,
  medium,
  small,
  thumbnail,
}

@JsonSerializable()
class PhotoMetadata {
  @JsonKey(name: 'camera_make')
  final String? cameraMake;
  @JsonKey(name: 'camera_model')
  final String? cameraModel;
  @JsonKey(name: 'lens_model')
  final String? lensModel;
  @JsonKey(name: 'focal_length')
  final double? focalLength;
  @JsonKey(name: 'aperture')
  final double? aperture;
  @JsonKey(name: 'shutter_speed')
  final String? shutterSpeed;
  @JsonKey(name: 'iso')
  final int? iso;
  @JsonKey(name: 'flash')
  final bool? flash;
  @JsonKey(name: 'white_balance')
  final String? whiteBalance;
  @JsonKey(name: 'exposure_mode')
  final String? exposureMode;
  @JsonKey(name: 'metering_mode')
  final String? meteringMode;
  @JsonKey(name: 'taken_at')
  final DateTime? takenAt;
  @JsonKey(name: 'location')
  final PhotoLocation? location;
  @JsonKey(name: 'color_space')
  final String? colorSpace;
  @JsonKey(name: 'orientation')
  final int? orientation;
  
  const PhotoMetadata({
    this.cameraMake,
    this.cameraModel,
    this.lensModel,
    this.focalLength,
    this.aperture,
    this.shutterSpeed,
    this.iso,
    this.flash,
    this.whiteBalance,
    this.exposureMode,
    this.meteringMode,
    this.takenAt,
    this.location,
    this.colorSpace,
    this.orientation,
  });
  
  factory PhotoMetadata.fromJson(Map<String, dynamic> json) => _$PhotoMetadataFromJson(json);
  Map<String, dynamic> toJson() => _$PhotoMetadataToJson(this);
  
  String? get cameraInfo {
    if (cameraMake != null && cameraModel != null) {
      return '$cameraMake $cameraModel';
    } else if (cameraModel != null) {
      return cameraModel;
    } else if (cameraMake != null) {
      return cameraMake;
    }
    return null;
  }
  
  String? get exposureInfo {
    final parts = <String>[];
    if (aperture != null) parts.add('f/${aperture!.toStringAsFixed(1)}');
    if (shutterSpeed != null) parts.add(shutterSpeed!);
    if (iso != null) parts.add('ISO$iso');
    return parts.isNotEmpty ? parts.join(' ') : null;
  }
}

@JsonSerializable()
class PhotoLocation {
  final double latitude;
  final double longitude;
  final double? altitude;
  final String? address;
  final String? city;
  final String? country;
  
  const PhotoLocation({
    required this.latitude,
    required this.longitude,
    this.altitude,
    this.address,
    this.city,
    this.country,
  });
  
  factory PhotoLocation.fromJson(Map<String, dynamic> json) => _$PhotoLocationFromJson(json);
  Map<String, dynamic> toJson() => _$PhotoLocationToJson(this);
  
  String get displayLocation {
    if (address != null) return address!;
    if (city != null && country != null) return '$city, $country';
    if (city != null) return city!;
    if (country != null) return country!;
    return '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';
  }
}

@JsonSerializable()
class PhotoStats {
  @JsonKey(name: 'view_count')
  final int viewCount;
  @JsonKey(name: 'like_count')
  final int likeCount;
  @JsonKey(name: 'download_count')
  final int downloadCount;
  @JsonKey(name: 'share_count')
  final int shareCount;
  @JsonKey(name: 'comment_count')
  final int commentCount;
  @JsonKey(name: 'last_viewed_at')
  final DateTime? lastViewedAt;
  @JsonKey(name: 'most_viewed_by')
  final String? mostViewedBy;
  
  const PhotoStats({
    this.viewCount = 0,
    this.likeCount = 0,
    this.downloadCount = 0,
    this.shareCount = 0,
    this.commentCount = 0,
    this.lastViewedAt,
    this.mostViewedBy,
  });
  
  factory PhotoStats.fromJson(Map<String, dynamic> json) => _$PhotoStatsFromJson(json);
  Map<String, dynamic> toJson() => _$PhotoStatsToJson(this);
  
  int get totalInteractions => viewCount + likeCount + downloadCount + shareCount + commentCount;
}

@JsonSerializable()
class PhotoComment {
  final String id;
  @JsonKey(name: 'photo_id')
  final String photoId;
  @JsonKey(name: 'user_id')
  final String userId;
  final User? user;
  final String content;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;
  @JsonKey(name: 'is_edited')
  final bool isEdited;
  
  const PhotoComment({
    required this.id,
    required this.photoId,
    required this.userId,
    this.user,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
    this.isEdited = false,
  });
  
  factory PhotoComment.fromJson(Map<String, dynamic> json) => _$PhotoCommentFromJson(json);
  Map<String, dynamic> toJson() => _$PhotoCommentToJson(this);
  
  String get userName => user?.displayNameOrUsername ?? userId;
  String get userAvatar => user?.avatar ?? '';
}