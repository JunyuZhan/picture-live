import 'package:flutter/material.dart';

class LoadingOverlay extends StatelessWidget {
  final Widget child;
  final bool isLoading;
  final String? message;
  final Color? backgroundColor;
  final Color? indicatorColor;
  final double opacity;
  
  const LoadingOverlay({
    super.key,
    required this.child,
    required this.isLoading,
    this.message,
    this.backgroundColor,
    this.indicatorColor,
    this.opacity = 0.7,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Stack(
      children: [
        child,
        if (isLoading)
          Container(
            color: (backgroundColor ?? Colors.black).withOpacity(opacity),
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(
                        indicatorColor ?? theme.colorScheme.primary,
                      ),
                    ),
                    if (message != null) ..[
                      const SizedBox(height: 16),
                      Text(
                        message!,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// 简单的加载指示器
class LoadingWidget extends StatelessWidget {
  final String? message;
  final Color? color;
  final double size;
  final EdgeInsetsGeometry? padding;
  
  const LoadingWidget({
    super.key,
    this.message,
    this.color,
    this.size = 24,
    this.padding,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Padding(
      padding: padding ?? const EdgeInsets.all(16),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: size,
              height: size,
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(
                  color ?? theme.colorScheme.primary,
                ),
              ),
            ),
            if (message != null) ..[
              const SizedBox(height: 12),
              Text(
                message!,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.7),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// 线性进度指示器
class LinearLoadingWidget extends StatelessWidget {
  final double? value;
  final String? message;
  final Color? backgroundColor;
  final Color? valueColor;
  final EdgeInsetsGeometry? padding;
  
  const LinearLoadingWidget({
    super.key,
    this.value,
    this.message,
    this.backgroundColor,
    this.valueColor,
    this.padding,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Padding(
      padding: padding ?? const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (message != null) ..[
            Text(
              message!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.7),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
          ],
          LinearProgressIndicator(
            value: value,
            backgroundColor: backgroundColor ?? 
                theme.colorScheme.onSurface.withOpacity(0.1),
            valueColor: AlwaysStoppedAnimation<Color>(
              valueColor ?? theme.colorScheme.primary,
            ),
          ),
          if (value != null) ..[
            const SizedBox(height: 8),
            Text(
              '${(value! * 100).toInt()}%',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// 骨架屏加载组件
class SkeletonLoader extends StatefulWidget {
  final double width;
  final double height;
  final BorderRadius? borderRadius;
  final Color? baseColor;
  final Color? highlightColor;
  
  const SkeletonLoader({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius,
    this.baseColor,
    this.highlightColor,
  });
  
  @override
  State<SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<SkeletonLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;
  
  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _animation = Tween<double>(
      begin: -1.0,
      end: 2.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
    _animationController.repeat();
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    final baseColor = widget.baseColor ?? 
        (isDark ? Colors.grey[800]! : Colors.grey[300]!);
    final highlightColor = widget.highlightColor ?? 
        (isDark ? Colors.grey[700]! : Colors.grey[100]!);
    
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: widget.borderRadius ?? BorderRadius.circular(4),
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                baseColor,
                highlightColor,
                baseColor,
              ],
              stops: [
                _animation.value - 0.3,
                _animation.value,
                _animation.value + 0.3,
              ],
            ),
          ),
        );
      },
    );
  }
}

// 列表项骨架屏
class ListItemSkeleton extends StatelessWidget {
  final bool showAvatar;
  final bool showSubtitle;
  final bool showTrailing;
  
  const ListItemSkeleton({
    super.key,
    this.showAvatar = true,
    this.showSubtitle = true,
    this.showTrailing = false,
  });
  
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          if (showAvatar) ..[
            const SkeletonLoader(
              width: 48,
              height: 48,
              borderRadius: BorderRadius.all(Radius.circular(24)),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SkeletonLoader(
                  width: double.infinity,
                  height: 16,
                ),
                if (showSubtitle) ..[
                  const SizedBox(height: 8),
                  SkeletonLoader(
                    width: MediaQuery.of(context).size.width * 0.6,
                    height: 14,
                  ),
                ],
              ],
            ),
          ),
          if (showTrailing) ..[
            const SizedBox(width: 12),
            const SkeletonLoader(
              width: 24,
              height: 24,
            ),
          ],
        ],
      ),
    );
  }
}

// 卡片骨架屏
class CardSkeleton extends StatelessWidget {
  final double? width;
  final double height;
  final bool showImage;
  final bool showTitle;
  final bool showSubtitle;
  final bool showActions;
  
  const CardSkeleton({
    super.key,
    this.width,
    this.height = 200,
    this.showImage = true,
    this.showTitle = true,
    this.showSubtitle = true,
    this.showActions = false,
  });
  
  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (showImage) ..[
            Expanded(
              flex: 3,
              child: SkeletonLoader(
                width: double.infinity,
                height: double.infinity,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (showTitle) ..[
            const SkeletonLoader(
              width: double.infinity,
              height: 16,
            ),
            const SizedBox(height: 8),
          ],
          if (showSubtitle) ..[
            SkeletonLoader(
              width: MediaQuery.of(context).size.width * 0.7,
              height: 14,
            ),
            const SizedBox(height: 8),
          ],
          if (showActions) ..[
            const Spacer(),
            Row(
              children: [
                const SkeletonLoader(
                  width: 60,
                  height: 32,
                ),
                const SizedBox(width: 8),
                const SkeletonLoader(
                  width: 60,
                  height: 32,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}