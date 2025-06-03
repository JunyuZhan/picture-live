import 'package:json_annotation/json_annotation.dart';

part 'api_response.g.dart';

@JsonSerializable(genericArgumentFactories: true)
class ApiResponse<T> {
  final bool success;
  final String? message;
  final T? data;
  final String? error;
  @JsonKey(name: 'error_code')
  final String? errorCode;
  @JsonKey(name: 'status_code')
  final int? statusCode;
  final Pagination? pagination;
  final Map<String, dynamic>? meta;
  final DateTime timestamp;
  
  const ApiResponse({
    required this.success,
    this.message,
    this.data,
    this.error,
    this.errorCode,
    this.statusCode,
    this.pagination,
    this.meta,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? const DateTime.now();
  
  factory ApiResponse.success({
    T? data,
    String? message,
    Pagination? pagination,
    Map<String, dynamic>? meta,
  }) {
    return ApiResponse<T>(
      success: true,
      data: data,
      message: message,
      pagination: pagination,
      meta: meta,
      timestamp: DateTime.now(),
    );
  }
  
  factory ApiResponse.error({
    required String message,
    String? errorCode,
    int? statusCode,
    Map<String, dynamic>? meta,
  }) {
    return ApiResponse<T>(
      success: false,
      error: message,
      message: message,
      errorCode: errorCode,
      statusCode: statusCode,
      meta: meta,
      timestamp: DateTime.now(),
    );
  }
  
  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) {
    return _$ApiResponseFromJson(json, fromJsonT);
  }
  
  Map<String, dynamic> toJson(Object? Function(T value) toJsonT) {
    return _$ApiResponseToJson(this, toJsonT);
  }
  
  bool get isSuccess => success;
  bool get isError => !success;
  bool get hasData => data != null;
  bool get hasPagination => pagination != null;
  
  String get displayMessage => message ?? error ?? '未知错误';
  
  /// 将响应转换为另一种类型
  ApiResponse<R> map<R>(R Function(T data) mapper) {
    if (isError || data == null) {
      return ApiResponse<R>(
        success: success,
        message: message,
        error: error,
        errorCode: errorCode,
        statusCode: statusCode,
        pagination: pagination,
        meta: meta,
        timestamp: timestamp,
      );
    }
    
    try {
      final mappedData = mapper(data!);
      return ApiResponse<R>(
        success: true,
        data: mappedData,
        message: message,
        pagination: pagination,
        meta: meta,
        timestamp: timestamp,
      );
    } catch (e) {
      return ApiResponse<R>(
        success: false,
        error: '数据转换失败: $e',
        message: '数据转换失败: $e',
        timestamp: timestamp,
      );
    }
  }
  
  /// 异步映射
  Future<ApiResponse<R>> mapAsync<R>(Future<R> Function(T data) mapper) async {
    if (isError || data == null) {
      return ApiResponse<R>(
        success: success,
        message: message,
        error: error,
        errorCode: errorCode,
        statusCode: statusCode,
        pagination: pagination,
        meta: meta,
        timestamp: timestamp,
      );
    }
    
    try {
      final mappedData = await mapper(data!);
      return ApiResponse<R>(
        success: true,
        data: mappedData,
        message: message,
        pagination: pagination,
        meta: meta,
        timestamp: timestamp,
      );
    } catch (e) {
      return ApiResponse<R>(
        success: false,
        error: '数据转换失败: $e',
        message: '数据转换失败: $e',
        timestamp: timestamp,
      );
    }
  }
  
  /// 折叠操作：成功时返回数据，失败时返回默认值
  R fold<R>(R Function(T data) onSuccess, R Function(String error) onError) {
    if (isSuccess && data != null) {
      return onSuccess(data!);
    } else {
      return onError(displayMessage);
    }
  }
  
  /// 异步折叠操作
  Future<R> foldAsync<R>(
    Future<R> Function(T data) onSuccess,
    Future<R> Function(String error) onError,
  ) async {
    if (isSuccess && data != null) {
      return await onSuccess(data!);
    } else {
      return await onError(displayMessage);
    }
  }
}

@JsonSerializable()
class Pagination {
  @JsonKey(name: 'current_page')
  final int currentPage;
  @JsonKey(name: 'per_page')
  final int perPage;
  @JsonKey(name: 'total_items')
  final int totalItems;
  @JsonKey(name: 'total_pages')
  final int totalPages;
  @JsonKey(name: 'has_next_page')
  final bool hasNextPage;
  @JsonKey(name: 'has_prev_page')
  final bool hasPrevPage;
  @JsonKey(name: 'next_page')
  final int? nextPage;
  @JsonKey(name: 'prev_page')
  final int? prevPage;
  @JsonKey(name: 'from')
  final int? from;
  @JsonKey(name: 'to')
  final int? to;
  
  const Pagination({
    required this.currentPage,
    required this.perPage,
    required this.totalItems,
    required this.totalPages,
    required this.hasNextPage,
    required this.hasPrevPage,
    this.nextPage,
    this.prevPage,
    this.from,
    this.to,
  });
  
  factory Pagination.fromJson(Map<String, dynamic> json) => _$PaginationFromJson(json);
  Map<String, dynamic> toJson() => _$PaginationToJson(this);
  
  bool get isFirstPage => currentPage == 1;
  bool get isLastPage => currentPage == totalPages;
  bool get isEmpty => totalItems == 0;
  
  String get displayInfo {
    if (isEmpty) return '暂无数据';
    final start = from ?? ((currentPage - 1) * perPage + 1);
    final end = to ?? (currentPage * perPage).clamp(0, totalItems);
    return '第 $start-$end 项，共 $totalItems 项';
  }
  
  String get pageInfo => '第 $currentPage 页，共 $totalPages 页';
  
  double get progress => totalPages > 0 ? currentPage / totalPages : 0.0;
}

@JsonSerializable()
class ApiError {
  final String message;
  final String? code;
  final String? field;
  final Map<String, dynamic>? details;
  final List<String>? suggestions;
  
  const ApiError({
    required this.message,
    this.code,
    this.field,
    this.details,
    this.suggestions,
  });
  
  factory ApiError.fromJson(Map<String, dynamic> json) => _$ApiErrorFromJson(json);
  Map<String, dynamic> toJson() => _$ApiErrorToJson(this);
  
  bool get hasField => field != null;
  bool get hasDetails => details != null && details!.isNotEmpty;
  bool get hasSuggestions => suggestions != null && suggestions!.isNotEmpty;
  
  String get displayMessage {
    if (hasField) {
      return '$field: $message';
    }
    return message;
  }
}

@JsonSerializable()
class ValidationError {
  final Map<String, List<String>> errors;
  final String? message;
  
  const ValidationError({
    required this.errors,
    this.message,
  });
  
  factory ValidationError.fromJson(Map<String, dynamic> json) => _$ValidationErrorFromJson(json);
  Map<String, dynamic> toJson() => _$ValidationErrorToJson(this);
  
  bool get hasErrors => errors.isNotEmpty;
  
  List<String> getFieldErrors(String field) {
    return errors[field] ?? [];
  }
  
  String? getFirstFieldError(String field) {
    final fieldErrors = getFieldErrors(field);
    return fieldErrors.isNotEmpty ? fieldErrors.first : null;
  }
  
  List<String> get allErrors {
    final allErrors = <String>[];
    errors.forEach((field, fieldErrors) {
      allErrors.addAll(fieldErrors.map((error) => '$field: $error'));
    });
    return allErrors;
  }
  
  String get displayMessage {
    if (message != null) return message!;
    if (hasErrors) {
      return allErrors.join('\n');
    }
    return '验证失败';
  }
}

/// 网络状态枚举
enum NetworkStatus {
  unknown,
  connected,
  disconnected,
  connecting,
}

/// 加载状态枚举
enum LoadingState {
  idle,
  loading,
  success,
  error,
  refreshing,
  loadingMore,
}

extension LoadingStateExtension on LoadingState {
  bool get isLoading => this == LoadingState.loading;
  bool get isSuccess => this == LoadingState.success;
  bool get isError => this == LoadingState.error;
  bool get isRefreshing => this == LoadingState.refreshing;
  bool get isLoadingMore => this == LoadingState.loadingMore;
  bool get isIdle => this == LoadingState.idle;
  bool get isBusy => isLoading || isRefreshing || isLoadingMore;
}