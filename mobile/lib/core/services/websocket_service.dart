import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;
import 'package:flutter/foundation.dart';
import '../config/app_config.dart';
import 'storage_service.dart';

enum WebSocketState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  error,
}

class WebSocketMessage {
  final String type;
  final Map<String, dynamic> data;
  final String? id;
  final DateTime timestamp;
  
  WebSocketMessage({
    required this.type,
    required this.data,
    this.id,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
  
  factory WebSocketMessage.fromJson(Map<String, dynamic> json) {
    return WebSocketMessage(
      type: json['type'] as String,
      data: json['data'] as Map<String, dynamic>? ?? {},
      id: json['id'] as String?,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'data': data,
      if (id != null) 'id': id,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}

class WebSocketService {
  final StorageService _storageService;
  
  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Timer? _heartbeatTimer;
  Timer? _reconnectTimer;
  
  final StreamController<WebSocketMessage> _messageController =
      StreamController<WebSocketMessage>.broadcast();
  final StreamController<WebSocketState> _stateController =
      StreamController<WebSocketState>.broadcast();
  
  WebSocketState _currentState = WebSocketState.disconnected;
  int _reconnectAttempts = 0;
  final int _maxReconnectAttempts = 5;
  final Duration _reconnectDelay = const Duration(seconds: 2);
  final Duration _heartbeatInterval = const Duration(seconds: 30);
  
  // 消息类型常量
  static const String messageTypeHeartbeat = 'heartbeat';
  static const String messageTypeAuth = 'auth';
  static const String messageTypeJoinSession = 'join_session';
  static const String messageTypeLeaveSession = 'leave_session';
  static const String messageTypeNewPhoto = 'new_photo';
  static const String messageTypePhotoUpdate = 'photo_update';
  static const String messageTypePhotoDelete = 'photo_delete';
  static const String messageTypeSessionUpdate = 'session_update';
  static const String messageTypeUserJoined = 'user_joined';
  static const String messageTypeUserLeft = 'user_left';
  static const String messageTypeError = 'error';
  
  WebSocketService(this._storageService);
  
  // Getters
  Stream<WebSocketMessage> get messageStream => _messageController.stream;
  Stream<WebSocketState> get stateStream => _stateController.stream;
  WebSocketState get currentState => _currentState;
  bool get isConnected => _currentState == WebSocketState.connected;
  
  /// 连接WebSocket
  Future<void> connect() async {
    if (_currentState == WebSocketState.connecting ||
        _currentState == WebSocketState.connected) {
      return;
    }
    
    try {
      _updateState(WebSocketState.connecting);
      
      // 获取认证token
      final token = await _storageService.getToken();
      if (token == null || token.isEmpty) {
        throw Exception('No authentication token available');
      }
      
      // 构建WebSocket URL
      final uri = Uri.parse('${AppConfig.socketUrl}?token=$token');
      
      if (kDebugMode) {
        print('Connecting to WebSocket: $uri');
      }
      
      // 创建WebSocket连接
      _channel = WebSocketChannel.connect(uri);
      
      // 监听消息
      _subscription = _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDisconnected,
      );
      
      _updateState(WebSocketState.connected);
      _reconnectAttempts = 0;
      
      // 发送认证消息
      _sendAuthMessage(token);
      
      // 启动心跳
      _startHeartbeat();
      
      if (kDebugMode) {
        print('WebSocket connected successfully');
      }
    } catch (e) {
      if (kDebugMode) {
        print('WebSocket connection failed: $e');
      }
      _updateState(WebSocketState.error);
      _scheduleReconnect();
    }
  }
  
  /// 断开连接
  Future<void> disconnect() async {
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    
    await _subscription?.cancel();
    await _channel?.sink.close(status.goingAway);
    
    _channel = null;
    _subscription = null;
    _reconnectAttempts = 0;
    
    _updateState(WebSocketState.disconnected);
    
    if (kDebugMode) {
      print('WebSocket disconnected');
    }
  }
  
  /// 发送消息
  void sendMessage(WebSocketMessage message) {
    if (!isConnected) {
      if (kDebugMode) {
        print('Cannot send message: WebSocket not connected');
      }
      return;
    }
    
    try {
      final jsonString = jsonEncode(message.toJson());
      _channel?.sink.add(jsonString);
      
      if (kDebugMode) {
        print('Sent WebSocket message: ${message.type}');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Failed to send WebSocket message: $e');
      }
    }
  }
  
  /// 加入会话
  void joinSession(String sessionId) {
    sendMessage(WebSocketMessage(
      type: messageTypeJoinSession,
      data: {'session_id': sessionId},
    ));
  }
  
  /// 离开会话
  void leaveSession(String sessionId) {
    sendMessage(WebSocketMessage(
      type: messageTypeLeaveSession,
      data: {'session_id': sessionId},
    ));
  }
  
  /// 处理接收到的消息
  void _onMessage(dynamic data) {
    try {
      final Map<String, dynamic> json = jsonDecode(data);
      final message = WebSocketMessage.fromJson(json);
      
      if (kDebugMode) {
        print('Received WebSocket message: ${message.type}');
      }
      
      // 处理特殊消息类型
      switch (message.type) {
        case messageTypeHeartbeat:
          // 响应心跳
          _sendHeartbeatResponse();
          break;
        case messageTypeError:
          if (kDebugMode) {
            print('WebSocket error: ${message.data}');
          }
          break;
        default:
          // 广播消息给监听者
          _messageController.add(message);
      }
    } catch (e) {
      if (kDebugMode) {
        print('Failed to parse WebSocket message: $e');
      }
    }
  }
  
  /// 处理连接错误
  void _onError(error) {
    if (kDebugMode) {
      print('WebSocket error: $error');
    }
    _updateState(WebSocketState.error);
    _scheduleReconnect();
  }
  
  /// 处理连接断开
  void _onDisconnected() {
    if (kDebugMode) {
      print('WebSocket disconnected');
    }
    
    _heartbeatTimer?.cancel();
    
    if (_currentState != WebSocketState.disconnected) {
      _updateState(WebSocketState.disconnected);
      _scheduleReconnect();
    }
  }
  
  /// 发送认证消息
  void _sendAuthMessage(String token) {
    sendMessage(WebSocketMessage(
      type: messageTypeAuth,
      data: {'token': token},
    ));
  }
  
  /// 启动心跳
  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(_heartbeatInterval, (timer) {
      if (isConnected) {
        sendMessage(WebSocketMessage(
          type: messageTypeHeartbeat,
          data: {'timestamp': DateTime.now().toIso8601String()},
        ));
      }
    });
  }
  
  /// 发送心跳响应
  void _sendHeartbeatResponse() {
    sendMessage(WebSocketMessage(
      type: messageTypeHeartbeat,
      data: {
        'type': 'pong',
        'timestamp': DateTime.now().toIso8601String(),
      },
    ));
  }
  
  /// 安排重连
  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      if (kDebugMode) {
        print('Max reconnect attempts reached');
      }
      _updateState(WebSocketState.error);
      return;
    }
    
    _reconnectAttempts++;
    _updateState(WebSocketState.reconnecting);
    
    final delay = Duration(
      milliseconds: _reconnectDelay.inMilliseconds * _reconnectAttempts,
    );
    
    if (kDebugMode) {
      print('Scheduling reconnect in ${delay.inSeconds} seconds (attempt $_reconnectAttempts)');
    }
    
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, () {
      connect();
    });
  }
  
  /// 更新连接状态
  void _updateState(WebSocketState newState) {
    if (_currentState != newState) {
      _currentState = newState;
      _stateController.add(newState);
      
      if (kDebugMode) {
        print('WebSocket state changed to: $newState');
      }
    }
  }
  
  /// 释放资源
  void dispose() {
    disconnect();
    _messageController.close();
    _stateController.close();
  }
}