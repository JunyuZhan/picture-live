import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'dart:io';

import '../services/photo_service.dart';
import '../../features/photos/domain/models/photo_model.dart';
import 'auth_provider.dart';

part 'photo_provider.freezed.dart';

// 照片列表状态
@freezed
class PhotosState with _$PhotosState {
  const factory PhotosState({
    @Default(false) bool isLoading,
    @Default([]) List<PhotoModel> photos,
    @Default(false) bool hasMore,
    @Default(1) int currentPage,
    String? error,
  }) = _PhotosState;
}

// 照片上传状态
@freezed
class PhotoUploadState with _$PhotoUploadState {
  const factory PhotoUploadState({
    @Default(false) bool isUploading,
    @Default(0.0) double progress,
    @Default([]) List<String> uploadingFiles,
    @Default([]) List<PhotoModel> uploadedPhotos,
    String? error,
  }) = _PhotoUploadState;
}

// 照片详情状态
@freezed
class PhotoDetailState with _$PhotoDetailState {
  const factory PhotoDetailState({
    @Default(false) bool isLoading,
    PhotoModel? photo,
    String? error,
  }) = _PhotoDetailState;
}

// 照片列表管理器
class PhotosNotifier extends StateNotifier<PhotosState> {
  final PhotoService _photoService;
  
  PhotosNotifier(this._photoService) : super(const PhotosState());
  
  // 加载照片列表
  Future<void> loadPhotos({
    String? sessionId,
    bool refresh = false,
    String? status,
  }) async {
    if (refresh) {
      state = state.copyWith(
        isLoading: true,
        currentPage: 1,
        photos: [],
        hasMore: true,
        error: null,
      );
    } else if (state.isLoading || !state.hasMore) {
      return;
    } else {
      state = state.copyWith(isLoading: true, error: null);
    }
    
    try {
      final result = await _photoService.getPhotos(
        sessionId: sessionId,
        page: state.currentPage,
        limit: 20,
        status: status,
      );
      
      final newPhotos = refresh ? result.photos : [...state.photos, ...result.photos];
      
      state = state.copyWith(
        isLoading: false,
        photos: newPhotos,
        hasMore: result.hasMore,
        currentPage: state.currentPage + 1,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
  
  // 删除照片
  Future<bool> deletePhoto(String photoId) async {
    try {
      final success = await _photoService.deletePhoto(photoId);
      if (success) {
        state = state.copyWith(
          photos: state.photos.where((p) => p.id != photoId).toList(),
        );
      }
      return success;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }
  
  // 更新照片状态
  Future<bool> updatePhotoStatus(String photoId, String status) async {
    try {
      final updatedPhoto = await _photoService.updatePhotoStatus(photoId, status);
      if (updatedPhoto != null) {
        final index = state.photos.indexWhere((p) => p.id == photoId);
        if (index != -1) {
          final newPhotos = [...state.photos];
          newPhotos[index] = updatedPhoto;
          state = state.copyWith(photos: newPhotos);
        }
        return true;
      }
      return false;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }
  
  // 批量更新照片状态
  Future<bool> batchUpdatePhotoStatus(List<String> photoIds, String status) async {
    try {
      final success = await _photoService.batchUpdatePhotoStatus(photoIds, status);
      if (success) {
        final newPhotos = state.photos.map((photo) {
          if (photoIds.contains(photo.id)) {
            return photo.copyWith(status: status);
          }
          return photo;
        }).toList();
        
        state = state.copyWith(photos: newPhotos);
      }
      return success;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }
  
  // 添加新照片到列表
  void addPhoto(PhotoModel photo) {
    state = state.copyWith(
      photos: [photo, ...state.photos],
    );
  }
  
  // 清除错误
  void clearError() {
    state = state.copyWith(error: null);
  }
}

// 照片上传管理器
class PhotoUploadNotifier extends StateNotifier<PhotoUploadState> {
  final PhotoService _photoService;
  
  PhotoUploadNotifier(this._photoService) : super(const PhotoUploadState());
  
  // 上传单张照片
  Future<PhotoModel?> uploadPhoto({
    required File file,
    required String sessionId,
    String? description,
    List<String>? tags,
  }) async {
    final fileName = file.path.split('/').last;
    
    state = state.copyWith(
      isUploading: true,
      uploadingFiles: [...state.uploadingFiles, fileName],
      error: null,
    );
    
    try {
      final photo = await _photoService.uploadPhoto(
        file: file,
        sessionId: sessionId,
        description: description,
        tags: tags,
        onProgress: (progress) {
          state = state.copyWith(progress: progress);
        },
      );
      
      if (photo != null) {
        state = state.copyWith(
          uploadedPhotos: [...state.uploadedPhotos, photo],
        );
      }
      
      state = state.copyWith(
        isUploading: false,
        uploadingFiles: state.uploadingFiles.where((f) => f != fileName).toList(),
        progress: 0.0,
      );
      
      return photo;
    } catch (e) {
      state = state.copyWith(
        isUploading: false,
        uploadingFiles: state.uploadingFiles.where((f) => f != fileName).toList(),
        progress: 0.0,
        error: e.toString(),
      );
      return null;
    }
  }
  
  // 批量上传照片
  Future<List<PhotoModel>> uploadPhotos({
    required List<File> files,
    required String sessionId,
    String? description,
    List<String>? tags,
  }) async {
    final fileNames = files.map((f) => f.path.split('/').last).toList();
    
    state = state.copyWith(
      isUploading: true,
      uploadingFiles: [...state.uploadingFiles, ...fileNames],
      error: null,
    );
    
    final uploadedPhotos = <PhotoModel>[];
    
    try {
      for (int i = 0; i < files.length; i++) {
        final file = files[i];
        final fileName = fileNames[i];
        
        final photo = await _photoService.uploadPhoto(
          file: file,
          sessionId: sessionId,
          description: description,
          tags: tags,
          onProgress: (progress) {
            final totalProgress = (i + progress) / files.length;
            state = state.copyWith(progress: totalProgress);
          },
        );
        
        if (photo != null) {
          uploadedPhotos.add(photo);
          state = state.copyWith(
            uploadedPhotos: [...state.uploadedPhotos, photo],
          );
        }
        
        state = state.copyWith(
          uploadingFiles: state.uploadingFiles.where((f) => f != fileName).toList(),
        );
      }
      
      state = state.copyWith(
        isUploading: false,
        progress: 0.0,
      );
      
      return uploadedPhotos;
    } catch (e) {
      state = state.copyWith(
        isUploading: false,
        uploadingFiles: [],
        progress: 0.0,
        error: e.toString(),
      );
      return uploadedPhotos;
    }
  }
  
  // 清除上传历史
  void clearUploadHistory() {
    state = state.copyWith(
      uploadedPhotos: [],
      error: null,
    );
  }
  
  // 清除错误
  void clearError() {
    state = state.copyWith(error: null);
  }
}

// 照片详情管理器
class PhotoDetailNotifier extends StateNotifier<PhotoDetailState> {
  final PhotoService _photoService;
  
  PhotoDetailNotifier(this._photoService) : super(const PhotoDetailState());
  
  // 加载照片详情
  Future<void> loadPhoto(String photoId) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final photo = await _photoService.getPhoto(photoId);
      state = state.copyWith(
        isLoading: false,
        photo: photo,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
  
  // 更新照片
  Future<bool> updatePhoto(PhotoModel photo) async {
    try {
      final updatedPhoto = await _photoService.updatePhoto(photo);
      if (updatedPhoto != null) {
        state = state.copyWith(photo: updatedPhoto);
        return true;
      }
      return false;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }
  
  // 清除错误
  void clearError() {
    state = state.copyWith(error: null);
  }
}

// 提供者定义
final photoServiceProvider = Provider<PhotoService>((ref) {
  final token = ref.watch(authTokenProvider);
  return PhotoService(token: token);
});

final photosProvider = StateNotifierProvider<PhotosNotifier, PhotosState>((ref) {
  final photoService = ref.watch(photoServiceProvider);
  return PhotosNotifier(photoService);
});

final photoUploadProvider = StateNotifierProvider<PhotoUploadNotifier, PhotoUploadState>((ref) {
  final photoService = ref.watch(photoServiceProvider);
  return PhotoUploadNotifier(photoService);
});

final photoDetailProvider = StateNotifierProvider.family<PhotoDetailNotifier, PhotoDetailState, String>(
  (ref, photoId) {
    final photoService = ref.watch(photoServiceProvider);
    final notifier = PhotoDetailNotifier(photoService);
    notifier.loadPhoto(photoId);
    return notifier;
  },
);

// 会话照片提供者
final sessionPhotosProvider = StateNotifierProvider.family<PhotosNotifier, PhotosState, String>(
  (ref, sessionId) {
    final photoService = ref.watch(photoServiceProvider);
    final notifier = PhotosNotifier(photoService);
    notifier.loadPhotos(sessionId: sessionId, refresh: true);
    return notifier;
  },
);

// 待审核照片提供者
final pendingPhotosProvider = StateNotifierProvider<PhotosNotifier, PhotosState>((ref) {
  final photoService = ref.watch(photoServiceProvider);
  final notifier = PhotosNotifier(photoService);
  notifier.loadPhotos(status: 'pending', refresh: true);
  return notifier;
});