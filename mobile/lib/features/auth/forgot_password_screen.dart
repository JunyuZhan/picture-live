import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/config/app_config.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/loading_overlay.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});
  
  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormBuilderState>();
  bool _emailSent = false;
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('忘记密码'),
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
                
                // 标题和说明
                _buildHeader(theme),
                
                const SizedBox(height: 32),
                
                if (!_emailSent) ..[
                  // 邮箱输入表单
                  _buildEmailForm(theme),
                  
                  const SizedBox(height: 24),
                  
                  // 发送按钮
                  _buildSendButton(),
                ] else ..[
                  // 邮件发送成功提示
                  _buildSuccessMessage(theme),
                  
                  const SizedBox(height: 24),
                  
                  // 重新发送按钮
                  _buildResendButton(),
                ],
                
                const SizedBox(height: 32),
                
                // 返回登录链接
                _buildBackToLoginLink(theme),
                
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
        // 图标
        Center(
          child: Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.lock_reset,
              size: 40,
              color: theme.colorScheme.primary,
            ),
          ),
        ),
        
        const SizedBox(height: 24),
        
        Text(
          _emailSent ? '邮件已发送' : '重置密码',
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: theme.colorScheme.onSurface,
          ),
          textAlign: TextAlign.center,
        ),
        
        const SizedBox(height: 8),
        
        Text(
          _emailSent 
              ? '我们已向您的邮箱发送了重置密码的链接，请查收邮件并按照说明操作。'
              : '请输入您的邮箱地址，我们将向您发送重置密码的链接。',
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.6),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
  
  Widget _buildEmailForm(ThemeData theme) {
    return FormBuilder(
      key: _formKey,
      child: CustomTextField(
        name: 'email',
        label: '邮箱地址',
        prefixIcon: Icons.email_outlined,
        keyboardType: TextInputType.emailAddress,
        textInputAction: TextInputAction.done,
        validators: [
          FormBuilderValidators.required(errorText: '请输入邮箱地址'),
          FormBuilderValidators.email(errorText: '请输入有效的邮箱地址'),
        ],
        onSubmitted: (_) => _handleSendResetEmail(),
      ),
    );
  }
  
  Widget _buildSendButton() {
    return CustomButton(
      text: '发送重置链接',
      onPressed: _handleSendResetEmail,
      isLoading: ref.watch(authProvider).isLoading,
    );
  }
  
  Widget _buildSuccessMessage(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.primary.withOpacity(0.3),
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.mark_email_read,
            size: 48,
            color: theme.colorScheme.primary,
          ),
          
          const SizedBox(height: 12),
          
          Text(
            '邮件发送成功！',
            style: theme.textTheme.titleMedium?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
          
          const SizedBox(height: 8),
          
          Text(
            '请检查您的邮箱（包括垃圾邮件文件夹），点击邮件中的链接重置密码。',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.7),
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 12),
          
          Text(
            '如果您在几分钟内没有收到邮件，请检查垃圾邮件文件夹或重新发送。',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.6),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
  
  Widget _buildResendButton() {
    return OutlinedButton(
      onPressed: () {
        setState(() {
          _emailSent = false;
        });
      },
      child: const Text('重新发送'),
    );
  }
  
  Widget _buildBackToLoginLink(ThemeData theme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.arrow_back,
          size: 16,
          color: theme.colorScheme.onSurface.withOpacity(0.6),
        ),
        TextButton(
          onPressed: () {
            context.pop();
          },
          child: Text(
            '返回登录',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
  
  Future<void> _handleSendResetEmail() async {
    if (_formKey.currentState?.saveAndValidate() ?? false) {
      final formData = _formKey.currentState!.value;
      
      final result = await ref.read(authProvider.notifier).forgotPassword(
        email: formData['email'],
      );
      
      if (mounted) {
        if (result.isSuccess) {
          setState(() {
            _emailSent = true;
          });
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message ?? '发送失败，请稍后重试'),
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          );
        }
      }
    }
  }
}