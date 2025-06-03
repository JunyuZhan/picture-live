import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';

class CustomTextField extends StatefulWidget {
  final String name;
  final String? label;
  final String? hintText;
  final String? helperText;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final List<String? Function(String?)>? validators;
  final Function(String?)? onChanged;
  final Function(String?)? onSubmitted;
  final TextEditingController? controller;
  final FocusNode? focusNode;
  final bool enabled;
  final bool readOnly;
  final int? maxLines;
  final int? minLines;
  final int? maxLength;
  final List<TextInputFormatter>? inputFormatters;
  final String? initialValue;
  final EdgeInsetsGeometry? contentPadding;
  final InputBorder? border;
  final Color? fillColor;
  final bool filled;
  final TextStyle? style;
  final TextStyle? labelStyle;
  final TextStyle? hintStyle;
  final bool autofocus;
  final String? errorText;
  
  const CustomTextField({
    super.key,
    required this.name,
    this.label,
    this.hintText,
    this.helperText,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.validators,
    this.onChanged,
    this.onSubmitted,
    this.controller,
    this.focusNode,
    this.enabled = true,
    this.readOnly = false,
    this.maxLines = 1,
    this.minLines,
    this.maxLength,
    this.inputFormatters,
    this.initialValue,
    this.contentPadding,
    this.border,
    this.fillColor,
    this.filled = true,
    this.style,
    this.labelStyle,
    this.hintStyle,
    this.autofocus = false,
    this.errorText,
  });
  
  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}

class _CustomTextFieldState extends State<CustomTextField> {
  late FocusNode _focusNode;
  bool _isFocused = false;
  
  @override
  void initState() {
    super.initState();
    _focusNode = widget.focusNode ?? FocusNode();
    _focusNode.addListener(_onFocusChange);
  }
  
  @override
  void dispose() {
    if (widget.focusNode == null) {
      _focusNode.dispose();
    } else {
      _focusNode.removeListener(_onFocusChange);
    }
    super.dispose();
  }
  
  void _onFocusChange() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return FormBuilderTextField(
      name: widget.name,
      controller: widget.controller,
      focusNode: _focusNode,
      initialValue: widget.initialValue,
      enabled: widget.enabled,
      readOnly: widget.readOnly,
      obscureText: widget.obscureText,
      keyboardType: widget.keyboardType,
      textInputAction: widget.textInputAction,
      maxLines: widget.maxLines,
      minLines: widget.minLines,
      maxLength: widget.maxLength,
      inputFormatters: widget.inputFormatters,
      autofocus: widget.autofocus,
      style: widget.style ?? theme.textTheme.bodyLarge,
      onChanged: widget.onChanged,
      onSubmitted: widget.onSubmitted,
      validator: widget.validators != null
          ? (value) {
              for (final validator in widget.validators!) {
                final result = validator(value);
                if (result != null) return result;
              }
              return null;
            }
          : null,
      decoration: InputDecoration(
        labelText: widget.label,
        hintText: widget.hintText,
        helperText: widget.helperText,
        errorText: widget.errorText,
        prefixIcon: widget.prefixIcon != null
            ? Icon(
                widget.prefixIcon,
                color: _isFocused
                    ? theme.colorScheme.primary
                    : theme.colorScheme.onSurface.withOpacity(0.6),
              )
            : null,
        suffixIcon: widget.suffixIcon,
        filled: widget.filled,
        fillColor: widget.fillColor ?? 
            (widget.enabled 
                ? theme.colorScheme.surface
                : theme.colorScheme.onSurface.withOpacity(0.05)),
        contentPadding: widget.contentPadding ?? 
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: widget.border ?? _buildBorder(theme, false, false),
        enabledBorder: _buildBorder(theme, false, false),
        focusedBorder: _buildBorder(theme, true, false),
        errorBorder: _buildBorder(theme, false, true),
        focusedErrorBorder: _buildBorder(theme, true, true),
        disabledBorder: _buildBorder(theme, false, false, disabled: true),
        labelStyle: widget.labelStyle ?? 
            theme.textTheme.bodyMedium?.copyWith(
              color: _isFocused
                  ? theme.colorScheme.primary
                  : theme.colorScheme.onSurface.withOpacity(0.6),
            ),
        hintStyle: widget.hintStyle ?? 
            theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.4),
            ),
        helperStyle: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurface.withOpacity(0.6),
        ),
        errorStyle: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.error,
        ),
        counterStyle: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurface.withOpacity(0.6),
        ),
      ),
    );
  }
  
  InputBorder _buildBorder(
    ThemeData theme, 
    bool focused, 
    bool error, {
    bool disabled = false,
  }) {
    Color borderColor;
    double borderWidth;
    
    if (disabled) {
      borderColor = theme.colorScheme.onSurface.withOpacity(0.12);
      borderWidth = 1;
    } else if (error) {
      borderColor = theme.colorScheme.error;
      borderWidth = focused ? 2 : 1;
    } else if (focused) {
      borderColor = theme.colorScheme.primary;
      borderWidth = 2;
    } else {
      borderColor = theme.colorScheme.outline.withOpacity(0.5);
      borderWidth = 1;
    }
    
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(
        color: borderColor,
        width: borderWidth,
      ),
    );
  }
}

// 搜索框组件
class SearchTextField extends StatefulWidget {
  final String? hintText;
  final Function(String)? onChanged;
  final Function(String)? onSubmitted;
  final VoidCallback? onClear;
  final TextEditingController? controller;
  final bool autofocus;
  final bool enabled;
  
  const SearchTextField({
    super.key,
    this.hintText,
    this.onChanged,
    this.onSubmitted,
    this.onClear,
    this.controller,
    this.autofocus = false,
    this.enabled = true,
  });
  
  @override
  State<SearchTextField> createState() => _SearchTextFieldState();
}

class _SearchTextFieldState extends State<SearchTextField> {
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
    
    return TextField(
      controller: _controller,
      enabled: widget.enabled,
      autofocus: widget.autofocus,
      textInputAction: TextInputAction.search,
      onSubmitted: widget.onSubmitted,
      decoration: InputDecoration(
        hintText: widget.hintText ?? '搜索...',
        prefixIcon: const Icon(Icons.search),
        suffixIcon: _hasText
            ? IconButton(
                icon: const Icon(Icons.clear),
                onPressed: _onClear,
              )
            : null,
        filled: true,
        fillColor: theme.colorScheme.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 12,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide(
            color: theme.colorScheme.primary,
            width: 2,
          ),
        ),
      ),
    );
  }
}

// 多行文本输入框
class MultilineTextField extends StatelessWidget {
  final String name;
  final String? label;
  final String? hintText;
  final int minLines;
  final int maxLines;
  final List<String? Function(String?)>? validators;
  final Function(String?)? onChanged;
  final String? initialValue;
  final bool enabled;
  final int? maxLength;
  
  const MultilineTextField({
    super.key,
    required this.name,
    this.label,
    this.hintText,
    this.minLines = 3,
    this.maxLines = 6,
    this.validators,
    this.onChanged,
    this.initialValue,
    this.enabled = true,
    this.maxLength,
  });
  
  @override
  Widget build(BuildContext context) {
    return CustomTextField(
      name: name,
      label: label,
      hintText: hintText,
      minLines: minLines,
      maxLines: maxLines,
      validators: validators,
      onChanged: onChanged,
      initialValue: initialValue,
      enabled: enabled,
      maxLength: maxLength,
      keyboardType: TextInputType.multiline,
      textInputAction: TextInputAction.newline,
    );
  }
}