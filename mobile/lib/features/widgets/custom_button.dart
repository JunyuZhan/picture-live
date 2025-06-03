import 'package:flutter/material.dart';

class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isOutlined;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final double? width;
  final double height;
  final EdgeInsetsGeometry? padding;
  final BorderRadius? borderRadius;
  final double? elevation;
  
  const CustomButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.isOutlined = false,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.width,
    this.height = 48,
    this.padding,
    this.borderRadius,
    this.elevation,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEnabled = onPressed != null && !isLoading;
    
    Widget child = Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading) ..[
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                isOutlined 
                    ? theme.colorScheme.primary
                    : Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 12),
        ] else if (icon != null) ..[
          Icon(
            icon,
            size: 18,
            color: isEnabled
                ? (textColor ?? 
                   (isOutlined 
                       ? theme.colorScheme.primary 
                       : Colors.white))
                : theme.disabledColor,
          ),
          const SizedBox(width: 8),
        ],
        
        Text(
          text,
          style: theme.textTheme.labelLarge?.copyWith(
            color: isEnabled
                ? (textColor ?? 
                   (isOutlined 
                       ? theme.colorScheme.primary 
                       : Colors.white))
                : theme.disabledColor,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
    
    if (isOutlined) {
      return SizedBox(
        width: width,
        height: height,
        child: OutlinedButton(
          onPressed: isEnabled ? onPressed : null,
          style: OutlinedButton.styleFrom(
            backgroundColor: backgroundColor,
            side: BorderSide(
              color: isEnabled 
                  ? (backgroundColor ?? theme.colorScheme.primary)
                  : theme.disabledColor,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: borderRadius ?? BorderRadius.circular(8),
            ),
            padding: padding ?? const EdgeInsets.symmetric(
              horizontal: 24,
              vertical: 12,
            ),
            elevation: elevation ?? 0,
          ),
          child: child,
        ),
      );
    }
    
    return SizedBox(
      width: width,
      height: height,
      child: ElevatedButton(
        onPressed: isEnabled ? onPressed : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor ?? theme.colorScheme.primary,
          foregroundColor: textColor ?? Colors.white,
          disabledBackgroundColor: theme.disabledColor,
          shape: RoundedRectangleBorder(
            borderRadius: borderRadius ?? BorderRadius.circular(8),
          ),
          padding: padding ?? const EdgeInsets.symmetric(
            horizontal: 24,
            vertical: 12,
          ),
          elevation: elevation ?? 2,
        ),
        child: child,
      ),
    );
  }
}

// 专门的图标按钮
class CustomIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final Color? backgroundColor;
  final Color? iconColor;
  final double size;
  final double iconSize;
  final bool isLoading;
  final EdgeInsetsGeometry? padding;
  
  const CustomIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.tooltip,
    this.backgroundColor,
    this.iconColor,
    this.size = 48,
    this.iconSize = 24,
    this.isLoading = false,
    this.padding,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEnabled = onPressed != null && !isLoading;
    
    Widget child = isLoading
        ? SizedBox(
            width: iconSize * 0.8,
            height: iconSize * 0.8,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                iconColor ?? theme.colorScheme.primary,
              ),
            ),
          )
        : Icon(
            icon,
            size: iconSize,
            color: isEnabled
                ? (iconColor ?? theme.colorScheme.primary)
                : theme.disabledColor,
          );
    
    Widget button = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: backgroundColor ?? theme.colorScheme.surface,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isEnabled ? onPressed : null,
          borderRadius: BorderRadius.circular(size / 2),
          child: Padding(
            padding: padding ?? EdgeInsets.all((size - iconSize) / 2),
            child: child,
          ),
        ),
      ),
    );
    
    if (tooltip != null) {
      return Tooltip(
        message: tooltip!,
        child: button,
      );
    }
    
    return button;
  }
}

// 浮动操作按钮样式的按钮
class CustomFAB extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final Color? backgroundColor;
  final Color? iconColor;
  final double size;
  final bool isExtended;
  final String? label;
  final bool isLoading;
  
  const CustomFAB({
    super.key,
    required this.icon,
    this.onPressed,
    this.tooltip,
    this.backgroundColor,
    this.iconColor,
    this.size = 56,
    this.isExtended = false,
    this.label,
    this.isLoading = false,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEnabled = onPressed != null && !isLoading;
    
    if (isExtended && label != null) {
      return FloatingActionButton.extended(
        onPressed: isEnabled ? onPressed : null,
        backgroundColor: backgroundColor ?? theme.colorScheme.primary,
        foregroundColor: iconColor ?? Colors.white,
        tooltip: tooltip,
        icon: isLoading
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    iconColor ?? Colors.white,
                  ),
                ),
              )
            : Icon(icon),
        label: Text(
          label!,
          style: theme.textTheme.labelLarge?.copyWith(
            color: iconColor ?? Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }
    
    return FloatingActionButton(
      onPressed: isEnabled ? onPressed : null,
      backgroundColor: backgroundColor ?? theme.colorScheme.primary,
      foregroundColor: iconColor ?? Colors.white,
      tooltip: tooltip,
      child: isLoading
          ? SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  iconColor ?? Colors.white,
                ),
              ),
            )
          : Icon(icon),
    );
  }
}