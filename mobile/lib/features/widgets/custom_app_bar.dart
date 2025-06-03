import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final Widget? titleWidget;
  final List<Widget>? actions;
  final Widget? leading;
  final bool automaticallyImplyLeading;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double? elevation;
  final bool centerTitle;
  final PreferredSizeWidget? bottom;
  final SystemUiOverlayStyle? systemOverlayStyle;
  final bool showBackButton;
  final VoidCallback? onBackPressed;
  final double toolbarHeight;
  final bool floating;
  final bool pinned;
  final bool snap;
  final double? expandedHeight;
  final Widget? flexibleSpace;
  final bool primary;
  
  const CustomAppBar({
    super.key,
    this.title,
    this.titleWidget,
    this.actions,
    this.leading,
    this.automaticallyImplyLeading = true,
    this.backgroundColor,
    this.foregroundColor,
    this.elevation,
    this.centerTitle = true,
    this.bottom,
    this.systemOverlayStyle,
    this.showBackButton = false,
    this.onBackPressed,
    this.toolbarHeight = kToolbarHeight,
    this.floating = false,
    this.pinned = true,
    this.snap = false,
    this.expandedHeight,
    this.flexibleSpace,
    this.primary = true,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    Widget? leadingWidget = leading;
    if (leadingWidget == null && showBackButton) {
      leadingWidget = IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: onBackPressed ?? () => Navigator.of(context).pop(),
      );
    }
    
    Widget? titleWidgetFinal = titleWidget;
    if (titleWidgetFinal == null && title != null) {
      titleWidgetFinal = Text(
        title!,
        style: theme.textTheme.titleLarge?.copyWith(
          color: foregroundColor ?? theme.colorScheme.onSurface,
          fontWeight: FontWeight.w600,
        ),
      );
    }
    
    if (expandedHeight != null) {
      return SliverAppBar(
        title: titleWidgetFinal,
        actions: actions,
        leading: leadingWidget,
        automaticallyImplyLeading: automaticallyImplyLeading,
        backgroundColor: backgroundColor ?? theme.colorScheme.surface,
        foregroundColor: foregroundColor ?? theme.colorScheme.onSurface,
        elevation: elevation ?? 0,
        centerTitle: centerTitle,
        bottom: bottom,
        systemOverlayStyle: systemOverlayStyle,
        toolbarHeight: toolbarHeight,
        floating: floating,
        pinned: pinned,
        snap: snap,
        expandedHeight: expandedHeight,
        flexibleSpace: flexibleSpace,
        primary: primary,
      );
    }
    
    return AppBar(
      title: titleWidgetFinal,
      actions: actions,
      leading: leadingWidget,
      automaticallyImplyLeading: automaticallyImplyLeading,
      backgroundColor: backgroundColor ?? theme.colorScheme.surface,
      foregroundColor: foregroundColor ?? theme.colorScheme.onSurface,
      elevation: elevation ?? 0,
      centerTitle: centerTitle,
      bottom: bottom,
      systemOverlayStyle: systemOverlayStyle,
      toolbarHeight: toolbarHeight,
    );
  }
  
  @override
  Size get preferredSize => Size.fromHeight(
    toolbarHeight + (bottom?.preferredSize.height ?? 0),
  );
}

// 搜索应用栏
class SearchAppBar extends StatefulWidget implements PreferredSizeWidget {
  final String? hintText;
  final Function(String)? onChanged;
  final Function(String)? onSubmitted;
  final VoidCallback? onClear;
  final List<Widget>? actions;
  final bool autofocus;
  final TextEditingController? controller;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double elevation;
  
  const SearchAppBar({
    super.key,
    this.hintText,
    this.onChanged,
    this.onSubmitted,
    this.onClear,
    this.actions,
    this.autofocus = true,
    this.controller,
    this.backgroundColor,
    this.foregroundColor,
    this.elevation = 0,
  });
  
  @override
  State<SearchAppBar> createState() => _SearchAppBarState();
  
  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

class _SearchAppBarState extends State<SearchAppBar> {
  late TextEditingController _controller;
  bool _hasText = false;
  
  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? TextEditingController();
    _controller.addListener(_onTextChanged);
    _hasText = _controller.text.isNotEmpty;
  }
  
  @override
  void dispose() {
    if (widget.controller == null) {
      _controller.dispose();
    } else {
      _controller.removeListener(_onTextChanged);
    }
    super.dispose();
  }
  
  void _onTextChanged() {
    final hasText = _controller.text.isNotEmpty;
    if (hasText != _hasText) {
      setState(() {
        _hasText = hasText;
      });
    }
    widget.onChanged?.call(_controller.text);
  }
  
  void _onClear() {
    _controller.clear();
    widget.onClear?.call();
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return AppBar(
      backgroundColor: widget.backgroundColor ?? theme.colorScheme.surface,
      foregroundColor: widget.foregroundColor ?? theme.colorScheme.onSurface,
      elevation: widget.elevation,
      title: TextField(
        controller: _controller,
        autofocus: widget.autofocus,
        textInputAction: TextInputAction.search,
        onSubmitted: widget.onSubmitted,
        decoration: InputDecoration(
          hintText: widget.hintText ?? '搜索...',
          border: InputBorder.none,
          hintStyle: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.6),
          ),
        ),
        style: theme.textTheme.bodyLarge,
      ),
      actions: [
        if (_hasText)
          IconButton(
            icon: const Icon(Icons.clear),
            onPressed: _onClear,
          ),
        ...?widget.actions,
      ],
    );
  }
}

// 带标签的应用栏
class TabAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final List<Widget> tabs;
  final TabController? controller;
  final List<Widget>? actions;
  final Widget? leading;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double? elevation;
  final bool centerTitle;
  final Color? indicatorColor;
  final Color? labelColor;
  final Color? unselectedLabelColor;
  final bool isScrollable;
  
  const TabAppBar({
    super.key,
    this.title,
    required this.tabs,
    this.controller,
    this.actions,
    this.leading,
    this.backgroundColor,
    this.foregroundColor,
    this.elevation,
    this.centerTitle = true,
    this.indicatorColor,
    this.labelColor,
    this.unselectedLabelColor,
    this.isScrollable = false,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return AppBar(
      title: title != null ? Text(title!) : null,
      actions: actions,
      leading: leading,
      backgroundColor: backgroundColor ?? theme.colorScheme.surface,
      foregroundColor: foregroundColor ?? theme.colorScheme.onSurface,
      elevation: elevation ?? 0,
      centerTitle: centerTitle,
      bottom: TabBar(
        controller: controller,
        tabs: tabs,
        indicatorColor: indicatorColor ?? theme.colorScheme.primary,
        labelColor: labelColor ?? theme.colorScheme.primary,
        unselectedLabelColor: unselectedLabelColor ?? 
            theme.colorScheme.onSurface.withOpacity(0.6),
        isScrollable: isScrollable,
      ),
    );
  }
  
  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + kTextTabBarHeight);
}

// 渐变应用栏
class GradientAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final Widget? titleWidget;
  final List<Widget>? actions;
  final Widget? leading;
  final List<Color> gradientColors;
  final AlignmentGeometry gradientBegin;
  final AlignmentGeometry gradientEnd;
  final Color? foregroundColor;
  final double? elevation;
  final bool centerTitle;
  final PreferredSizeWidget? bottom;
  
  const GradientAppBar({
    super.key,
    this.title,
    this.titleWidget,
    this.actions,
    this.leading,
    required this.gradientColors,
    this.gradientBegin = Alignment.topLeft,
    this.gradientEnd = Alignment.bottomRight,
    this.foregroundColor,
    this.elevation,
    this.centerTitle = true,
    this.bottom,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    Widget? titleWidgetFinal = titleWidget;
    if (titleWidgetFinal == null && title != null) {
      titleWidgetFinal = Text(
        title!,
        style: theme.textTheme.titleLarge?.copyWith(
          color: foregroundColor ?? Colors.white,
          fontWeight: FontWeight.w600,
        ),
      );
    }
    
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: gradientBegin,
          end: gradientEnd,
        ),
      ),
      child: AppBar(
        title: titleWidgetFinal,
        actions: actions,
        leading: leading,
        backgroundColor: Colors.transparent,
        foregroundColor: foregroundColor ?? Colors.white,
        elevation: elevation ?? 0,
        centerTitle: centerTitle,
        bottom: bottom,
      ),
    );
  }
  
  @override
  Size get preferredSize => Size.fromHeight(
    kToolbarHeight + (bottom?.preferredSize.height ?? 0),
  );
}

// 透明应用栏
class TransparentAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final Widget? titleWidget;
  final List<Widget>? actions;
  final Widget? leading;
  final Color? foregroundColor;
  final bool centerTitle;
  final PreferredSizeWidget? bottom;
  
  const TransparentAppBar({
    super.key,
    this.title,
    this.titleWidget,
    this.actions,
    this.leading,
    this.foregroundColor,
    this.centerTitle = true,
    this.bottom,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    Widget? titleWidgetFinal = titleWidget;
    if (titleWidgetFinal == null && title != null) {
      titleWidgetFinal = Text(
        title!,
        style: theme.textTheme.titleLarge?.copyWith(
          color: foregroundColor ?? Colors.white,
          fontWeight: FontWeight.w600,
          shadows: [
            Shadow(
              color: Colors.black.withOpacity(0.5),
              offset: const Offset(0, 1),
              blurRadius: 2,
            ),
          ],
        ),
      );
    }
    
    return AppBar(
      title: titleWidgetFinal,
      actions: actions,
      leading: leading,
      backgroundColor: Colors.transparent,
      foregroundColor: foregroundColor ?? Colors.white,
      elevation: 0,
      centerTitle: centerTitle,
      bottom: bottom,
      systemOverlayStyle: SystemUiOverlayStyle.light,
    );
  }
  
  @override
  Size get preferredSize => Size.fromHeight(
    kToolbarHeight + (bottom?.preferredSize.height ?? 0),
  );
}