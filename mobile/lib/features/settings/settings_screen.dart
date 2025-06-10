import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/models/user.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/user_service.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/theme_provider.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/loading_overlay.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _isLoading = false;
  PackageInfo? _packageInfo;
  
  // 设置项状态
  bool _notificationsEnabled = true;
  bool _autoUploadEnabled = false;
  bool _highQualityUpload = true;
  bool _wifiOnlyUpload = true;
  String _downloadQuality = 'high';
  String _language = 'zh';

  @override
  void initState() {
    super.initState();
    _loadPackageInfo();
    _loadSettings();
  }

  Future<void> _loadPackageInfo() async {
    try {
      _packageInfo = await PackageInfo.fromPlatform();
      setState(() {});
    } catch (e) {
      // 忽略错误
    }
  }

  Future<void> _loadSettings() async {
    try {
      // TODO: 从本地存储或服务器加载用户设置
      // 这里使用默认值
    } catch (e) {
      // 忽略错误
    }
  }

  Future<void> _saveSettings() async {
    try {
      setState(() => _isLoading = true);
      
      // TODO: 保存设置到本地存储或服务器
      await Future.delayed(const Duration(milliseconds: 500));
      
      setState(() => _isLoading = false);
      _showSuccessSnackBar('设置已保存');
    } catch (e) {
      setState(() => _isLoading = false);
      _showErrorSnackBar('保存设置失败: ${e.toString()}');
    }
  }

  Future<void> _clearCache() async {
    final confirmed = await _showConfirmDialog(
      '清除缓存',
      '确定要清除所有缓存数据吗？这将删除已下载的图片和临时文件。',
    );
    
    if (!confirmed) return;
    
    try {
      setState(() => _isLoading = true);
      
      // TODO: 实现清除缓存逻辑
      await Future.delayed(const Duration(seconds: 1));
      
      setState(() => _isLoading = false);
      _showSuccessSnackBar('缓存已清除');
    } catch (e) {
      setState(() => _isLoading = false);
      _showErrorSnackBar('清除缓存失败: ${e.toString()}');
    }
  }

  Future<void> _exportData() async {
    final confirmed = await _showConfirmDialog(
      '导出数据',
      '确定要导出您的个人数据吗？这可能需要一些时间。',
    );
    
    if (!confirmed) return;
    
    try {
      setState(() => _isLoading = true);
      
      // TODO: 实现数据导出逻辑
      await Future.delayed(const Duration(seconds: 2));
      
      setState(() => _isLoading = false);
      _showSuccessSnackBar('数据导出完成，请检查下载文件夹');
    } catch (e) {
      setState(() => _isLoading = false);
      _showErrorSnackBar('导出数据失败: ${e.toString()}');
    }
  }

  Future<void> _deleteAccount() async {
    final confirmed = await _showConfirmDialog(
      '删除账户',
      '警告：此操作将永久删除您的账户和所有数据，且无法恢复。确定要继续吗？',
      isDestructive: true,
    );
    
    if (!confirmed) return;
    
    // 二次确认
    final doubleConfirmed = await _showConfirmDialog(
      '最终确认',
      '请再次确认：您真的要删除账户吗？此操作无法撤销。',
      isDestructive: true,
    );
    
    if (!doubleConfirmed) return;
    
    try {
      setState(() => _isLoading = true);
      
      final userService = ref.read(userServiceProvider);
      await userService.deleteAccount();
      
      // 退出登录并导航到登录页面
      await ref.read(authProvider.notifier).logout();
      
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/login',
        (route) => false,
      );
    } catch (e) {
      setState(() => _isLoading = false);
      _showErrorSnackBar('删除账户失败: ${e.toString()}');
    }
  }

  Future<void> _logout() async {
    final confirmed = await _showConfirmDialog(
      '退出登录',
      '确定要退出登录吗？',
    );
    
    if (!confirmed) return;
    
    try {
      setState(() => _isLoading = true);
      
      await ref.read(authProvider.notifier).logout();
      
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/login',
        (route) => false,
      );
    } catch (e) {
      setState(() => _isLoading = false);
      _showErrorSnackBar('退出登录失败: ${e.toString()}');
    }
  }

  Future<void> _launchUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        _showErrorSnackBar('无法打开链接');
      }
    } catch (e) {
      _showErrorSnackBar('打开链接失败: ${e.toString()}');
    }
  }

  Future<bool> _showConfirmDialog(
    String title,
    String content, {
    bool isDestructive = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: isDestructive
                ? ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  )
                : null,
            child: const Text('确定'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final isDarkMode = ref.watch(themeProvider).isDarkMode;

    return LoadingOverlay(
      isLoading: _isLoading,
      child: Scaffold(
        appBar: const CustomAppBar(
          title: '设置',
          showBackButton: true,
        ),
        body: ListView(
          children: [
            // 用户信息
            if (user != null) _buildUserSection(user),
            
            // 通知设置
            _buildNotificationSection(),
            
            // 上传设置
            _buildUploadSection(),
            
            // 下载设置
            _buildDownloadSection(),
            
            // 外观设置
            _buildAppearanceSection(isDarkMode),
            
            // 语言设置
            _buildLanguageSection(),
            
            // 存储设置
            _buildStorageSection(),
            
            // 隐私设置
            _buildPrivacySection(),
            
            // 关于
            _buildAboutSection(),
            
            // 账户操作
            _buildAccountSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildUserSection(User user) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: ListTile(
        leading: CircleAvatar(
          backgroundImage: user.avatar != null
              ? NetworkImage(user.avatar!)
              : null,
          child: user.avatar == null
              ? Text(user.username.isNotEmpty
                  ? user.username[0].toUpperCase()
                  : 'U')
              : null,
        ),
        title: Text(user.username),
        subtitle: Text(user.email),
        trailing: const Icon(Icons.arrow_forward_ios),
        onTap: () {
          Navigator.pushNamed(context, '/profile');
        },
      ),
    );
  }

  Widget _buildNotificationSection() {
    return _buildSection(
      '通知',
      [
        SwitchListTile(
          title: const Text('推送通知'),
          subtitle: const Text('接收新照片、评论等通知'),
          value: _notificationsEnabled,
          onChanged: (value) {
            setState(() => _notificationsEnabled = value);
            _saveSettings();
          },
        ),
      ],
    );
  }

  Widget _buildUploadSection() {
    return _buildSection(
      '上传设置',
      [
        SwitchListTile(
          title: const Text('自动上传'),
          subtitle: const Text('拍照后自动上传到当前相册'),
          value: _autoUploadEnabled,
          onChanged: (value) {
            setState(() => _autoUploadEnabled = value);
            _saveSettings();
          },
        ),
        SwitchListTile(
          title: const Text('高质量上传'),
          subtitle: const Text('上传原始质量的照片'),
          value: _highQualityUpload,
          onChanged: (value) {
            setState(() => _highQualityUpload = value);
            _saveSettings();
          },
        ),
        SwitchListTile(
          title: const Text('仅WiFi上传'),
          subtitle: const Text('只在WiFi环境下上传照片'),
          value: _wifiOnlyUpload,
          onChanged: (value) {
            setState(() => _wifiOnlyUpload = value);
            _saveSettings();
          },
        ),
      ],
    );
  }

  Widget _buildDownloadSection() {
    return _buildSection(
      '下载设置',
      [
        ListTile(
          title: const Text('下载质量'),
          subtitle: Text(_getDownloadQualityText()),
          trailing: const Icon(Icons.arrow_forward_ios),
          onTap: () => _showDownloadQualityDialog(),
        ),
      ],
    );
  }

  Widget _buildAppearanceSection(bool isDarkMode) {
    return _buildSection(
      '外观',
      [
        SwitchListTile(
          title: const Text('深色模式'),
          subtitle: const Text('使用深色主题'),
          value: isDarkMode,
          onChanged: (value) {
            ref.read(themeProvider.notifier).toggleTheme();
          },
        ),
      ],
    );
  }

  Widget _buildLanguageSection() {
    return _buildSection(
      '语言',
      [
        ListTile(
          title: const Text('语言'),
          subtitle: Text(_getLanguageText()),
          trailing: const Icon(Icons.arrow_forward_ios),
          onTap: () => _showLanguageDialog(),
        ),
      ],
    );
  }

  Widget _buildStorageSection() {
    return _buildSection(
      '存储',
      [
        ListTile(
          title: const Text('清除缓存'),
          subtitle: const Text('删除已下载的图片和临时文件'),
          trailing: const Icon(Icons.delete_outline),
          onTap: _clearCache,
        ),
      ],
    );
  }

  Widget _buildPrivacySection() {
    return _buildSection(
      '隐私',
      [
        ListTile(
          title: const Text('隐私政策'),
          trailing: const Icon(Icons.arrow_forward_ios),
          onTap: () => _launchUrl('https://example.com/privacy'),
        ),
        ListTile(
          title: const Text('服务条款'),
          trailing: const Icon(Icons.arrow_forward_ios),
          onTap: () => _launchUrl('https://example.com/terms'),
        ),
        ListTile(
          title: const Text('导出数据'),
          subtitle: const Text('导出您的个人数据'),
          trailing: const Icon(Icons.download),
          onTap: _exportData,
        ),
      ],
    );
  }

  Widget _buildAboutSection() {
    return _buildSection(
      '关于',
      [
        ListTile(
          title: const Text('版本'),
          subtitle: Text(_packageInfo?.version ?? '未知'),
          trailing: const Icon(Icons.info_outline),
        ),
        ListTile(
          title: const Text('帮助与反馈'),
          trailing: const Icon(Icons.arrow_forward_ios),
          onTap: () => _launchUrl('https://example.com/help'),
        ),
        ListTile(
          title: const Text('联系我们'),
          trailing: const Icon(Icons.arrow_forward_ios),
          onTap: () => _launchUrl('mailto:support@example.com'),
        ),
      ],
    );
  }

  Widget _buildAccountSection() {
    return _buildSection(
      '账户',
      [
        ListTile(
          title: const Text('退出登录'),
          textColor: Colors.orange,
          leading: const Icon(Icons.logout, color: Colors.orange),
          onTap: _logout,
        ),
        ListTile(
          title: const Text('删除账户'),
          textColor: Colors.red,
          leading: const Icon(Icons.delete_forever, color: Colors.red),
          onTap: _deleteAccount,
        ),
      ],
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: Theme.of(context).primaryColor,
            ),
          ),
        ),
        Card(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(children: children),
        ),
      ],
    );
  }

  String _getDownloadQualityText() {
    switch (_downloadQuality) {
      case 'low':
        return '低质量（节省流量）';
      case 'medium':
        return '中等质量';
      case 'high':
        return '高质量（推荐）';
      case 'original':
        return '原始质量';
      default:
        return '高质量（推荐）';
    }
  }

  String _getLanguageText() {
    switch (_language) {
      case 'zh':
        return '中文';
      case 'en':
        return 'English';
      default:
        return '中文';
    }
  }

  void _showDownloadQualityDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('选择下载质量'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('低质量（节省流量）'),
              value: 'low',
              groupValue: _downloadQuality,
              onChanged: (value) {
                setState(() => _downloadQuality = value!);
                Navigator.pop(context);
                _saveSettings();
              },
            ),
            RadioListTile<String>(
              title: const Text('中等质量'),
              value: 'medium',
              groupValue: _downloadQuality,
              onChanged: (value) {
                setState(() => _downloadQuality = value!);
                Navigator.pop(context);
                _saveSettings();
              },
            ),
            RadioListTile<String>(
              title: const Text('高质量（推荐）'),
              value: 'high',
              groupValue: _downloadQuality,
              onChanged: (value) {
                setState(() => _downloadQuality = value!);
                Navigator.pop(context);
                _saveSettings();
              },
            ),
            RadioListTile<String>(
              title: const Text('原始质量'),
              value: 'original',
              groupValue: _downloadQuality,
              onChanged: (value) {
                setState(() => _downloadQuality = value!);
                Navigator.pop(context);
                _saveSettings();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showLanguageDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('选择语言'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('中文'),
              value: 'zh',
              groupValue: _language,
              onChanged: (value) {
                setState(() => _language = value!);
                Navigator.pop(context);
                _saveSettings();
              },
            ),
            RadioListTile<String>(
              title: const Text('English'),
              value: 'en',
              groupValue: _language,
              onChanged: (value) {
                setState(() => _language = value!);
                Navigator.pop(context);
                _saveSettings();
              },
            ),
          ],
        ),
      ),
    );
  }
}