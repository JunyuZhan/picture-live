import 'package:flutter/material.dart';
import 'custom_button.dart';

class EmptyState extends StatelessWidget {
  final IconData? icon;
  final String? iconAsset;
  final String title;
  final String? subtitle;
  final String? actionText;
  final VoidCallback? onAction;
  final Widget? customIcon;
  final Color? iconColor;
  final double iconSize;
  final EdgeInsetsGeometry? padding;
  final bool showBackground;
  
  const EmptyState({
    super.key,
    this.icon,
    this.iconAsset,
    required this.title,
    this.subtitle,
    this.actionText,
    this.onAction,
    this.customIcon,
    this.iconColor,
    this.iconSize = 64,
    this.padding,
    this.showBackground = true,
  }) : assert(
         icon != null || iconAsset != null || customIcon != null,
         'Must provide either icon, iconAsset, or customIcon',
       );
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    Widget iconWidget;
    if (customIcon != null) {
      iconWidget = customIcon!;
    } else if (iconAsset != null) {
      iconWidget = Image.asset(
        iconAsset!,
        width: iconSize,
        height: iconSize,
        color: iconColor ?? theme.colorScheme.onSurface.withOpacity(0.4),
      );
    } else {
      iconWidget = Icon(
        icon!,
        size: iconSize,
        color: iconColor ?? theme.colorScheme.onSurface.withOpacity(0.4),
      );
    }
    
    return Container(
      width: double.infinity,
      padding: padding ?? const EdgeInsets.all(32),
      decoration: showBackground
          ? BoxDecoration(
              color: theme.colorScheme.surface.withOpacity(0.5),
              borderRadius: BorderRadius.circular(12),
            )
          : null,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          iconWidget,
          
          const SizedBox(height: 16),
          
          Text(
            title,
            style: theme.textTheme.titleLarge?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.8),
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
          
          if (subtitle != null) ..[
            const SizedBox(height: 8),
            Text(
              subtitle!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
              textAlign: TextAlign.center,
            ),
          ],
          
          if (actionText != null && onAction != null) ..[
            const SizedBox(height: 24),
            CustomButton(
              text: actionText!,
              onPressed: onAction,
              isOutlined: true,
            ),
          ],
        ],
      ),
    );
  }
}

// 预定义的空状态组件
class NoDataEmptyState extends StatelessWidget {
  final String? title;
  final String? subtitle;
  final String? actionText;
  final VoidCallback? onAction;
  
  const NoDataEmptyState({
    super.key,
    this.title,
    this.subtitle,
    this.actionText,
    this.onAction,
  });
  
  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.inbox_outlined,
      title: title ?? '暂无数据',
      subtitle: subtitle ?? '这里还没有任何内容',
      actionText: actionText,
      onAction: onAction,
    );
  }
}

class NoPhotosEmptyState extends StatelessWidget {
  final VoidCallback? onUpload;
  
  const NoPhotosEmptyState({
    super.key,
    this.onUpload,
  });
  
  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.photo_library_outlined,
      title: '暂无照片',
      subtitle: '上传您的第一张照片开始记录美好时光！',
      actionText: onUpload != null ? '上传照片' : null,
      onAction: onUpload,
    );
  }
}

class NoSessionsEmptyState extends StatelessWidget {
  final VoidCallback? onCreate;
  
  const NoSessionsEmptyState({
    super.key,
    this.onCreate,
  });
  
  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.group_outlined,
      title: '暂无相册',
      subtitle: '创建您的第一个相册开始分享吧！',
      actionText: onCreate != null ? '创建相册' : null,
      onAction: onCreate,
    );
  }
}

class NoSearchResultsEmptyState extends StatelessWidget {
  final String? query;
  final VoidCallback? onClear;
  
  const NoSearchResultsEmptyState({
    super.key,
    this.query,
    this.onClear,
  });
  
  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.search_off,
      title: '未找到结果',
      subtitle: query != null 
          ? '没有找到与"$query"相关的内容'
          : '请尝试其他搜索词',
      actionText: onClear != null ? '清除搜索' : null,
      onAction: onClear,
    );
  }
}

class NoNetworkEmptyState extends StatelessWidget {
  final VoidCallback? onRetry;
  
  const NoNetworkEmptyState({
    super.key,
    this.onRetry,
  });
  
  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.wifi_off,
      title: '网络连接失败',
      subtitle: '请检查您的网络连接并重试',
      actionText: onRetry != null ? '重试' : null,
      onAction: onRetry,
      iconColor: Theme.of(context).colorScheme.error,
    );
  }
}

class NoNotificationsEmptyState extends StatelessWidget {
  const NoNotificationsEmptyState({super.key});
  
  @override
  Widget build(BuildContext context) {
    return const EmptyState(
      icon: Icons.notifications_none,
      title: '暂无通知',
      subtitle: '您的所有通知都会显示在这里',
    );
  }
}

class NoFavoritesEmptyState extends StatelessWidget {
  final VoidCallback? onExplore;
  
  const NoFavoritesEmptyState({
    super.key,
    this.onExplore,
  });
  
  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.favorite_border,
      title: '暂无收藏',
      subtitle: '您收藏的内容会显示在这里',
      actionText: onExplore != null ? '去探索' : null,
      onAction: onExplore,
    );
  }
}

// 带动画的空状态组件
class AnimatedEmptyState extends StatefulWidget {
  final EmptyState emptyState;
  final Duration animationDuration;
  
  const AnimatedEmptyState({
    super.key,
    required this.emptyState,
    this.animationDuration = const Duration(milliseconds: 600),
  });
  
  @override
  State<AnimatedEmptyState> createState() => _AnimatedEmptyStateState();
}

class _AnimatedEmptyStateState extends State<AnimatedEmptyState>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.animationDuration,
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));
    
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ));
    
    _controller.forward();
  }
  
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: widget.emptyState,
      ),
    );
  }
}