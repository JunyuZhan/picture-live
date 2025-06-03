import 'package:flutter/material.dart';
import 'custom_button.dart';

class CustomErrorWidget extends StatelessWidget {
  final String message;
  final String? title;
  final VoidCallback? onRetry;
  final String? retryText;
  final IconData? icon;
  final Color? iconColor;
  final bool showDetails;
  final String? details;
  final EdgeInsetsGeometry? padding;
  final bool showBackground;
  
  const CustomErrorWidget({
    super.key,
    required this.message,
    this.title,
    this.onRetry,
    this.retryText,
    this.icon,
    this.iconColor,
    this.showDetails = false,
    this.details,
    this.padding,
    this.showBackground = true,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Container(
      width: double.infinity,
      padding: padding ?? const EdgeInsets.all(24),
      decoration: showBackground
          ? BoxDecoration(
              color: theme.colorScheme.errorContainer.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: theme.colorScheme.error.withOpacity(0.3),
              ),
            )
          : null,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon ?? Icons.error_outline,
            size: 64,
            color: iconColor ?? theme.colorScheme.error,
          ),
          
          const SizedBox(height: 16),
          
          if (title != null) ..[
            Text(
              title!,
              style: theme.textTheme.titleLarge?.copyWith(
                color: theme.colorScheme.error,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
          ],
          
          Text(
            message,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.8),
            ),
            textAlign: TextAlign.center,
          ),
          
          if (showDetails && details != null) ..[
            const SizedBox(height: 12),
            ExpansionTile(
              title: Text(
                '查看详情',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    details!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                      color: theme.colorScheme.onSurface.withOpacity(0.7),
                    ),
                  ),
                ),
              ],
            ),
          ],
          
          if (onRetry != null) ..[
            const SizedBox(height: 24),
            CustomButton(
              text: retryText ?? '重试',
              onPressed: onRetry,
              icon: Icons.refresh,
              isOutlined: true,
            ),
          ],
        ],
      ),
    );
  }
}

// 网络错误组件
class NetworkErrorWidget extends StatelessWidget {
  final VoidCallback? onRetry;
  final String? message;
  
  const NetworkErrorWidget({
    super.key,
    this.onRetry,
    this.message,
  });
  
  @override
  Widget build(BuildContext context) {
    return CustomErrorWidget(
      title: '网络连接失败',
      message: message ?? '请检查您的网络连接并重试',
      icon: Icons.wifi_off,
      onRetry: onRetry,
    );
  }
}

// 服务器错误组件
class ServerErrorWidget extends StatelessWidget {
  final VoidCallback? onRetry;
  final String? message;
  final int? statusCode;
  
  const ServerErrorWidget({
    super.key,
    this.onRetry,
    this.message,
    this.statusCode,
  });
  
  @override
  Widget build(BuildContext context) {
    String errorMessage = message ?? '服务器暂时无法响应，请稍后重试';
    if (statusCode != null) {
      errorMessage = '服务器错误 ($statusCode)\n$errorMessage';
    }
    
    return CustomErrorWidget(
      title: '服务器错误',
      message: errorMessage,
      icon: Icons.dns,
      onRetry: onRetry,
    );
  }
}

// 权限错误组件
class PermissionErrorWidget extends StatelessWidget {
  final VoidCallback? onRetry;
  final String? message;
  
  const PermissionErrorWidget({
    super.key,
    this.onRetry,
    this.message,
  });
  
  @override
  Widget build(BuildContext context) {
    return CustomErrorWidget(
      title: '权限不足',
      message: message ?? '您没有权限访问此内容',
      icon: Icons.lock_outline,
      onRetry: onRetry,
      retryText: '重新登录',
    );
  }
}

// 未找到错误组件
class NotFoundErrorWidget extends StatelessWidget {
  final VoidCallback? onRetry;
  final String? message;
  
  const NotFoundErrorWidget({
    super.key,
    this.onRetry,
    this.message,
  });
  
  @override
  Widget build(BuildContext context) {
    return CustomErrorWidget(
      title: '内容不存在',
      message: message ?? '您要查找的内容不存在或已被删除',
      icon: Icons.search_off,
      onRetry: onRetry,
      retryText: '返回',
    );
  }
}

// 通用API错误组件
class ApiErrorWidget extends StatelessWidget {
  final String error;
  final VoidCallback? onRetry;
  final bool showDetails;
  
  const ApiErrorWidget({
    super.key,
    required this.error,
    this.onRetry,
    this.showDetails = false,
  });
  
  @override
  Widget build(BuildContext context) {
    // 根据错误信息判断错误类型
    if (error.toLowerCase().contains('network') || 
        error.toLowerCase().contains('connection')) {
      return NetworkErrorWidget(
        onRetry: onRetry,
        message: error,
      );
    }
    
    if (error.toLowerCase().contains('unauthorized') ||
        error.toLowerCase().contains('forbidden')) {
      return PermissionErrorWidget(
        onRetry: onRetry,
        message: error,
      );
    }
    
    if (error.toLowerCase().contains('not found')) {
      return NotFoundErrorWidget(
        onRetry: onRetry,
        message: error,
      );
    }
    
    if (error.toLowerCase().contains('server') ||
        error.toLowerCase().contains('500') ||
        error.toLowerCase().contains('502') ||
        error.toLowerCase().contains('503')) {
      return ServerErrorWidget(
        onRetry: onRetry,
        message: error,
      );
    }
    
    // 默认错误
    return CustomErrorWidget(
      message: error,
      onRetry: onRetry,
      showDetails: showDetails,
      details: showDetails ? error : null,
    );
  }
}

// 错误边界组件
class ErrorBoundary extends StatefulWidget {
  final Widget child;
  final Widget Function(Object error, StackTrace? stackTrace)? errorBuilder;
  final Function(Object error, StackTrace? stackTrace)? onError;
  
  const ErrorBoundary({
    super.key,
    required this.child,
    this.errorBuilder,
    this.onError,
  });
  
  @override
  State<ErrorBoundary> createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends State<ErrorBoundary> {
  Object? _error;
  StackTrace? _stackTrace;
  
  @override
  void initState() {
    super.initState();
    // 设置全局错误处理
    FlutterError.onError = (FlutterErrorDetails details) {
      if (mounted) {
        setState(() {
          _error = details.exception;
          _stackTrace = details.stack;
        });
      }
      widget.onError?.call(details.exception, details.stack);
    };
  }
  
  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      if (widget.errorBuilder != null) {
        return widget.errorBuilder!(_error!, _stackTrace);
      }
      
      return CustomErrorWidget(
        title: '应用出现错误',
        message: '抱歉，应用遇到了一个错误',
        showDetails: true,
        details: _error.toString(),
        onRetry: () {
          setState(() {
            _error = null;
            _stackTrace = null;
          });
        },
      );
    }
    
    return widget.child;
  }
}

// 简单的错误提示组件
class ErrorSnackBar {
  static void show(
    BuildContext context, {
    required String message,
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(seconds: 4),
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
        duration: duration,
        action: actionLabel != null && onAction != null
            ? SnackBarAction(
                label: actionLabel,
                textColor: Colors.white,
                onPressed: onAction,
              )
            : null,
      ),
    );
  }
}

// 错误对话框
class ErrorDialog {
  static Future<void> show(
    BuildContext context, {
    required String message,
    String? title,
    String? confirmText,
    VoidCallback? onConfirm,
  }) {
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: title != null ? Text(title) : null,
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              onConfirm?.call();
            },
            child: Text(confirmText ?? '确定'),
          ),
        ],
      ),
    );
  }
}