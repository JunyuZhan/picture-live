import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/router/app_router.dart';
import '../../core/config/app_config.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/loading_overlay.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});
  
  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormBuilderState>();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _agreeToTerms = false;
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('注册'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: LoadingOverlay(
        isLoading: authState.isLoading,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 20),
                
                // 标题
                _buildHeader(theme),
                
                const SizedBox(height: 32),
                
                // 注册表单
                _buildRegisterForm(theme),
                
                const SizedBox(height: 24),
                
                // 服务条款
                _buildTermsAgreement(theme),
                
                const SizedBox(height: 24),
                
                // 注册按钮
                _buildRegisterButton(),
                
                const SizedBox(height: 32),
                
                // 登录链接
                _buildLoginLink(theme),
                
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildHeader(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '创建账号',
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: theme.colorScheme.onSurface,
          ),
        ),
        
        const SizedBox(height: 8),
        
        Text(
          '加入 ${AppConfig.appName}，开始分享精彩瞬间',
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.6),
          ),
        ),
      ],
    );
  }
  
  Widget _buildRegisterForm(ThemeData theme) {
    return FormBuilder(
      key: _formKey,
      child: Column(
        children: [
          // 用户名
          CustomTextField(
            name: 'username',
            label: '用户名',
            prefixIcon: Icons.person_outline,
            textInputAction: TextInputAction.next,
            validators: [
              FormBuilderValidators.required(errorText: '请输入用户名'),
              FormBuilderValidators.minLength(3, errorText: '用户名至少3位'),
              FormBuilderValidators.maxLength(20, errorText: '用户名最多20位'),
              FormBuilderValidators.match(
                r'^[a-zA-Z0-9_]+$',
                errorText: '用户名只能包含字母、数字和下划线',
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // 邮箱
          CustomTextField(
            name: 'email',
            label: '邮箱',
            prefixIcon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            validators: [
              FormBuilderValidators.required(errorText: '请输入邮箱'),
              FormBuilderValidators.email(errorText: '请输入有效的邮箱地址'),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // 显示名称（可选）
          CustomTextField(
            name: 'displayName',
            label: '显示名称（可选）',
            prefixIcon: Icons.badge_outlined,
            textInputAction: TextInputAction.next,
            validators: [
              FormBuilderValidators.maxLength(50, errorText: '显示名称最多50位'),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // 密码
          CustomTextField(
            name: 'password',
            label: '密码',
            prefixIcon: Icons.lock_outline,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.next,
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_off : Icons.visibility,
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
              onPressed: () {
                setState(() {
                  _obscurePassword = !_obscurePassword;
                });
              },
            ),
            validators: [
              FormBuilderValidators.required(errorText: '请输入密码'),
              FormBuilderValidators.minLength(8, errorText: '密码至少8位'),
              FormBuilderValidators.match(
                r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)',
                errorText: '密码必须包含大小写字母和数字',
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // 确认密码
          CustomTextField(
            name: 'confirmPassword',
            label: '确认密码',
            prefixIcon: Icons.lock_outline,
            obscureText: _obscureConfirmPassword,
            textInputAction: TextInputAction.done,
            suffixIcon: IconButton(
              icon: Icon(
                _obscureConfirmPassword ? Icons.visibility_off : Icons.visibility,
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
              onPressed: () {
                setState(() {
                  _obscureConfirmPassword = !_obscureConfirmPassword;
                });
              },
            ),
            validators: [
              FormBuilderValidators.required(errorText: '请确认密码'),
              (value) {
                final password = _formKey.currentState?.fields['password']?.value;
                if (value != password) {
                  return '两次输入的密码不一致';
                }
                return null;
              },
            ],
            onSubmitted: (_) => _handleRegister(),
          ),
        ],
      ),
    );
  }
  
  Widget _buildTermsAgreement(ThemeData theme) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Checkbox(
          value: _agreeToTerms,
          onChanged: (value) {
            setState(() {
              _agreeToTerms = value ?? false;
            });
          },
        ),
        Expanded(
          child: GestureDetector(
            onTap: () {
              setState(() {
                _agreeToTerms = !_agreeToTerms;
              });
            },
            child: RichText(
              text: TextSpan(
                style: theme.textTheme.bodyMedium,
                children: [
                  const TextSpan(text: '我已阅读并同意'),
                  TextSpan(
                    text: '《服务条款》',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                  const TextSpan(text: '和'),
                  TextSpan(
                    text: '《隐私政策》',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildRegisterButton() {
    return CustomButton(
      text: '注册',
      onPressed: _agreeToTerms ? _handleRegister : null,
      isLoading: ref.watch(authProvider).isLoading,
    );
  }
  
  Widget _buildLoginLink(ThemeData theme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          '已有账号？',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.6),
          ),
        ),
        TextButton(
          onPressed: () {
            context.pop();
          },
          child: Text(
            '立即登录',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
  
  Future<void> _handleRegister() async {
    if (!_agreeToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('请先同意服务条款和隐私政策'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
      return;
    }
    
    if (_formKey.currentState?.saveAndValidate() ?? false) {
      final formData = _formKey.currentState!.value;
      
      final result = await ref.read(authProvider.notifier).register(
        username: formData['username'],
        email: formData['email'],
        password: formData['password'],
        displayName: formData['displayName']?.isNotEmpty == true 
            ? formData['displayName'] 
            : null,
      );
      
      if (mounted) {
        if (result.isSuccess) {
          // 注册成功，显示提示并跳转到登录页
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('注册成功！请查收邮箱验证邮件'),
              backgroundColor: Theme.of(context).colorScheme.primary,
            ),
          );
          context.go(AppRoutes.login);
        } else {
          // 显示错误信息
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message ?? '注册失败'),
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          );
        }
      }
    }
  }
}