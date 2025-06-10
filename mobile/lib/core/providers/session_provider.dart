import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../services/session_service.dart';
import '../../features/sessions/domain/models/session_model.dart';
import 'auth_provider.dart';

part 'session_provider.freezed.dart';

// 相册列表状态
@freezed
class SessionsState with _$SessionsState {
  const factory SessionsState({
    @Default(false) bool isLoading,
    @Default([]) List<SessionModel> sessions,
    @Default(false) bool hasMore,
    @Default(1) int currentPage,
    String? error,
  }) = _SessionsState;
}

// 单个相册状态
@freezed
class SessionDetailState with _$SessionDetailState {
  const factory SessionDetailState({
    @Default(false) bool isLoading,
    SessionModel? session,
    String? error,
  }) = _SessionDetailState;
}

// 相册列表管理器
class SessionsNotifier extends StateNotifier<SessionsState> {
  final SessionService _sessionService;
  
  SessionsNotifier(this._sessionService) : super(const SessionsState());
  
  // 加载相册列表
  Future<void> loadSessions({bool refresh = false}) async {
    if (refresh) {
      state = state.copyWith(
        isLoading: true,
        currentPage: 1,
        sessions: [],
        hasMore: true,
        error: null,
      );
    } else if (state.isLoading || !state.hasMore) {
      return;
    } else {
      state = state.copyWith(isLoading: true, error: null);
    }
    
    try {
      final result = await _sessionService.getSessions(
        page: state.currentPage,
        limit: 20,
      );
      
      final newSessions = refresh ? result.sessions : [...state.sessions, ...result.sessions];
      
      state = state.copyWith(
        isLoading: false,
        sessions: newSessions,
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
  
  // 创建相册
  Future<SessionModel?> createSession({
    required String title,
    required String description,
    String? location,
    DateTime? eventDate,
    bool isPublic = true,
    bool allowDownload = true,
    bool requireApproval = false,
  }) async {
    try {
      final session = await _sessionService.createSession(
        title: title,
        description: description,
        location: location,
        eventDate: eventDate,
        isPublic: isPublic,
        allowDownload: allowDownload,
        requireApproval: requireApproval,
      );
      
      if (session != null) {
        // 将新相册添加到列表顶部
        state = state.copyWith(
          sessions: [session, ...state.sessions],
        );
      }
      
      return session;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }
  
  // 更新相册
  Future<bool> updateSession(SessionModel session) async {
    try {
      final updatedSession = await _sessionService.updateSession(session);
      if (updatedSession != null) {
        final index = state.sessions.indexWhere((s) => s.id == session.id);
        if (index != -1) {
          final newSessions = [...state.sessions];
          newSessions[index] = updatedSession;
          state = state.copyWith(sessions: newSessions);
        }
        return true;
      }
      return false;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }
  
  // 删除相册
  Future<bool> deleteSession(String sessionId) async {
    try {
      final success = await _sessionService.deleteSession(sessionId);
      if (success) {
        state = state.copyWith(
          sessions: state.sessions.where((s) => s.id != sessionId).toList(),
        );
      }
      return success;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return false;
    }
  }
  
  // 搜索相册
  Future<void> searchSessions(String query) async {
    state = state.copyWith(
      isLoading: true,
      currentPage: 1,
      sessions: [],
      hasMore: true,
      error: null,
    );
    
    try {
      final result = await _sessionService.searchSessions(query);
      
      state = state.copyWith(
        isLoading: false,
        sessions: result.sessions,
        hasMore: false, // 搜索结果不分页
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
  
  // 清除错误
  void clearError() {
    state = state.copyWith(error: null);
  }
}

// 相册详情管理器
class SessionDetailNotifier extends StateNotifier<SessionDetailState> {
  final SessionService _sessionService;
  
  SessionDetailNotifier(this._sessionService) : super(const SessionDetailState());
  
  // 加载相册详情
  Future<void> loadSession(String sessionId) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final session = await _sessionService.getSession(sessionId);
      state = state.copyWith(
        isLoading: false,
        session: session,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
  
  // 更新相册
  Future<bool> updateSession(SessionModel session) async {
    try {
      final updatedSession = await _sessionService.updateSession(session);
      if (updatedSession != null) {
        state = state.copyWith(session: updatedSession);
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
final sessionServiceProvider = Provider<SessionService>((ref) {
  final token = ref.watch(authTokenProvider);
  return SessionService(token: token);
});

final sessionsProvider = StateNotifierProvider<SessionsNotifier, SessionsState>((ref) {
  final sessionService = ref.watch(sessionServiceProvider);
  return SessionsNotifier(sessionService);
});

final sessionDetailProvider = StateNotifierProvider.family<SessionDetailNotifier, SessionDetailState, String>(
  (ref, sessionId) {
    final sessionService = ref.watch(sessionServiceProvider);
    final notifier = SessionDetailNotifier(sessionService);
    notifier.loadSession(sessionId);
    return notifier;
  },
);

// 便捷访问器
final mySessionsProvider = Provider<List<SessionModel>>((ref) {
  final sessions = ref.watch(sessionsProvider).sessions;
  final currentUser = ref.watch(currentUserProvider);
  
  if (currentUser == null) return [];
  
  return sessions.where((session) => session.createdBy == currentUser.id).toList();
});

final publicSessionsProvider = Provider<List<SessionModel>>((ref) {
  final sessions = ref.watch(sessionsProvider).sessions;
  return sessions.where((session) => session.isPublic).toList();
});