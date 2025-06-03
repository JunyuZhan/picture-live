import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';
import '../../core/models/user.dart';
import '../../core/models/photo.dart';
import '../../core/models/session.dart';
import '../../core/services/user_service.dart';
import '../../core/services/photo_service.dart';
import '../../core/services/session_service.dart';
import '../../core/utils/date_utils.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/loading_overlay.dart';
import '../widgets/empty_state.dart';
import '../widgets/error_widget.dart';
import '../widgets/photo_card.dart';
import '../widgets/session_card.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  final String? userId;
  final bool isCurrentUser;

  const ProfileScreen({
    Key? key,
    this.userId,
    this.isCurrentUser = true,
  }) : super(key: key);

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final ImagePicker _imagePicker = ImagePicker();
  
  User? _user;
  List<Photo> _userPhotos = [];
  List<Session> _userSessions = [];
  bool _isLoading = true;
  bool _isLoadingPhotos = false;
  bool _isLoadingSessions = false;
  bool _isEditing = false;
  String? _error;
  
  // 编辑表单控制器
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _bioController = TextEditingController();
  File? _newAvatar;
  
  // 统计数据
  int _totalPhotos = 0;
  int _totalSessions = 0;
  int _totalLikes = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadUserProfile();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _loadUserProfile() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final userService = ref.read(userServiceProvider);
      
      if (widget.isCurrentUser) {
        // 加载当前用户信息
        _user = ref.read(authProvider).user;
        if (_user == null) {
          throw Exception('用户未登录');
        }
      } else {
        // 加载指定用户信息
        if (widget.userId == null) {
          throw Exception('用户ID不能为空');
        }
        _user = await userService.getUserById(widget.userId!);
      }
      
      // 初始化编辑表单
      _initializeEditForm();
      
      // 加载用户数据
      await Future.wait([
        _loadUserPhotos(),
        _loadUserSessions(),
        _loadUserStats(),
      ]);
      
      setState(() => _isLoading = false);
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _initializeEditForm() {
    if (_user != null) {
      _usernameController.text = _user!.username;
      _emailController.text = _user!.email;
      _bioController.text = _user!.bio ?? '';
    }
  }

  Future<void> _loadUserPhotos() async {
    try {
      setState(() => _isLoadingPhotos = true);
      
      final photoService = ref.read(photoServiceProvider);
      final response = await photoService.getUserPhotos(
        _user!.id,
        page: 1,
        limit: 20,
      );
      
      setState(() {
        _userPhotos = response.data;
        _isLoadingPhotos = false;
      });
    } catch (e) {
      setState(() => _isLoadingPhotos = false);
    }
  }

  Future<void> _loadUserSessions() async {
    try {
      setState(() => _isLoadingSessions = true);
      
      final sessionService = ref.read(sessionServiceProvider);
      final response = await sessionService.getUserSessions(
        _user!.id,
        page: 1,
        limit: 20,
      );
      
      setState(() {
        _userSessions = response.data;
        _isLoadingSessions = false;
      });
    } catch (e) {
      setState(() => _isLoadingSessions = false);
    }
  }

  Future<void> _loadUserStats() async {
    try {
      final userService = ref.read(userServiceProvider);
      final stats = await userService.getUserStats(_user!.id);
      
      setState(() {
        _totalPhotos = stats['totalPhotos'] ?? 0;
        _totalSessions = stats['totalSessions'] ?? 0;
        _totalLikes = stats['totalLikes'] ?? 0;
      });
    } catch (e) {
      // 统计数据加载失败不影响主要功能
    }
  }

  Future<void> _pickAvatar() async {
    try {
      final permission = await Permission.camera.request();
      if (!permission.isGranted) {
        _showErrorSnackBar('需要相机权限才能更换头像');
        return;
      }
      
      final source = await _showImageSourceDialog();
      if (source == null) return;
      
      final XFile? image = await _imagePicker.pickImage(
        source: source,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );
      
      if (image != null) {
        setState(() => _newAvatar = File(image.path));
      }
    } catch (e) {
      _showErrorSnackBar('选择头像失败: ${e.toString()}');
    }
  }

  Future<ImageSource?> _showImageSourceDialog() async {
    return showDialog<ImageSource>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('选择头像来源'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('拍照'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('从相册选择'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveProfile() async {
    try {
      setState(() => _isLoading = true);
      
      final userService = ref.read(userServiceProvider);
      
      final updatedUser = await userService.updateProfile(
        username: _usernameController.text.trim(),
        email: _emailController.text.trim(),
        bio: _bioController.text.trim().isEmpty 
            ? null 
            : _bioController.text.trim(),
        avatar: _newAvatar,
      );
      
      // 更新本地用户信息
      ref.read(authProvider.notifier).updateUser(updatedUser);
      
      setState(() {
        _user = updatedUser;
        _isEditing = false;
        _newAvatar = null;
        _isLoading = false;
      });
      
      _showSuccessSnackBar('个人资料更新成功');
    } catch (e) {
      setState(() => _isLoading = false);
      _showErrorSnackBar('更新失败: ${e.toString()}');
    }
  }

  void _cancelEdit() {
    setState(() {
      _isEditing = false;
      _newAvatar = null;
    });
    _initializeEditForm();
  }

  Future<void> _logout() async {
    final confirmed = await _showConfirmDialog(
      '退出登录',
      '确定要退出登录吗？',
    );
    
    if (!confirmed) return;
    
    try {
      await ref.read(authProvider.notifier).logout();
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/login',
        (route) => false,
      );
    } catch (e) {
      _showErrorSnackBar('退出登录失败: ${e.toString()}');
    }
  }

  Future<bool> _showConfirmDialog(String title, String content) async {
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
    if (_isLoading) {
      return Scaffold(
        appBar: CustomAppBar(
          title: widget.isCurrentUser ? '我的资料' : '用户资料',
          showBackButton: !widget.isCurrentUser,
        ),
        body: const LoadingOverlay(isLoading: true),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: CustomAppBar(
          title: widget.isCurrentUser ? '我的资料' : '用户资料',
          showBackButton: !widget.isCurrentUser,
        ),
        body: CustomErrorWidget(
          message: _error!,
          onRetry: _loadUserProfile,
        ),
      );
    }

    if (_user == null) {
      return Scaffold(
        appBar: CustomAppBar(
          title: widget.isCurrentUser ? '我的资料' : '用户资料',
          showBackButton: !widget.isCurrentUser,
        ),
        body: const NoDataEmptyState(
          message: '用户不存在',
        ),
      );
    }

    return Scaffold(
      appBar: CustomAppBar(
        title: widget.isCurrentUser ? '我的资料' : _user!.username,
        showBackButton: !widget.isCurrentUser,
        actions: widget.isCurrentUser
            ? [
                if (_isEditing) ..[
                  TextButton(
                    onPressed: _cancelEdit,
                    child: const Text('取消'),
                  ),
                  TextButton(
                    onPressed: _saveProfile,
                    child: const Text('保存'),
                  ),
                ] else ..[
                  IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () => setState(() => _isEditing = true),
                  ),
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      switch (value) {
                        case 'settings':
                          Navigator.pushNamed(context, '/settings');
                          break;
                        case 'logout':
                          _logout();
                          break;
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'settings',
                        child: ListTile(
                          leading: Icon(Icons.settings),
                          title: Text('设置'),
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'logout',
                        child: ListTile(
                          leading: Icon(Icons.logout, color: Colors.red),
                          title: Text('退出登录', style: TextStyle(color: Colors.red)),
                        ),
                      ),
                    ],
                  ),
                ],
              ]
            : null,
      ),
      body: Column(
        children: [
          // 用户信息卡片
          _buildUserInfoCard(),
          
          // 统计数据
          _buildStatsSection(),
          
          // 标签栏
          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: '照片'),
              Tab(text: '会话'),
              Tab(text: '关于'),
            ],
          ),
          
          // 标签内容
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildPhotosTab(),
                _buildSessionsTab(),
                _buildAboutTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserInfoCard() {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: _isEditing ? _buildEditForm() : _buildUserInfo(),
      ),
    );
  }

  Widget _buildUserInfo() {
    return Column(
      children: [
        // 头像
        Stack(
          children: [
            CircleAvatar(
              radius: 50,
              backgroundImage: _user!.avatar != null
                  ? NetworkImage(_user!.avatar!)
                  : null,
              child: _user!.avatar == null
                  ? Text(
                      _user!.username.isNotEmpty
                          ? _user!.username[0].toUpperCase()
                          : 'U',
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
            if (widget.isCurrentUser && _isEditing)
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: IconButton(
                    icon: const Icon(
                      Icons.camera_alt,
                      color: Colors.white,
                      size: 20,
                    ),
                    onPressed: _pickAvatar,
                  ),
                ),
              ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // 用户名
        Text(
          _user!.username,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        
        const SizedBox(height: 4),
        
        // 邮箱
        Text(
          _user!.email,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey[600],
          ),
        ),
        
        // 个人简介
        if (_user!.bio?.isNotEmpty == true) ..[
          const SizedBox(height: 12),
          Text(
            _user!.bio!,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
        
        const SizedBox(height: 12),
        
        // 注册时间
        Text(
          '加入于 ${AppDateUtils.formatDate(_user!.createdAt)}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[500],
          ),
        ),
      ],
    );
  }

  Widget _buildEditForm() {
    return Column(
      children: [
        // 头像编辑
        Stack(
          children: [
            CircleAvatar(
              radius: 50,
              backgroundImage: _newAvatar != null
                  ? FileImage(_newAvatar!)
                  : (_user!.avatar != null
                      ? NetworkImage(_user!.avatar!)
                      : null),
              child: _newAvatar == null && _user!.avatar == null
                  ? Text(
                      _user!.username.isNotEmpty
                          ? _user!.username[0].toUpperCase()
                          : 'U',
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: IconButton(
                  icon: const Icon(
                    Icons.camera_alt,
                    color: Colors.white,
                    size: 20,
                  ),
                  onPressed: _pickAvatar,
                ),
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 24),
        
        // 用户名输入
        CustomTextField(
          controller: _usernameController,
          labelText: '用户名',
          prefixIcon: Icons.person,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return '请输入用户名';
            }
            if (value.trim().length < 2) {
              return '用户名至少需要2个字符';
            }
            return null;
          },
        ),
        
        const SizedBox(height: 16),
        
        // 邮箱输入
        CustomTextField(
          controller: _emailController,
          labelText: '邮箱',
          prefixIcon: Icons.email,
          keyboardType: TextInputType.emailAddress,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return '请输入邮箱';
            }
            if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
              return '请输入有效的邮箱地址';
            }
            return null;
          },
        ),
        
        const SizedBox(height: 16),
        
        // 个人简介输入
        MultilineTextField(
          controller: _bioController,
          labelText: '个人简介',
          hintText: '介绍一下自己（可选）',
          prefixIcon: Icons.info,
          maxLines: 3,
          maxLength: 200,
        ),
      ],
    );
  }

  Widget _buildStatsSection() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildStatItem('照片', _totalPhotos),
          _buildStatItem('会话', _totalSessions),
          _buildStatItem('获赞', _totalLikes),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, int count) {
    return Column(
      children: [
        Text(
          count.toString(),
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildPhotosTab() {
    if (_isLoadingPhotos) {
      return const LoadingOverlay(isLoading: true);
    }

    if (_userPhotos.isEmpty) {
      return NoPhotosEmptyState(
        message: widget.isCurrentUser ? '还没有上传照片' : '该用户还没有上传照片',
        actionText: widget.isCurrentUser ? '上传第一张照片' : null,
        onActionPressed: widget.isCurrentUser
            ? () {
                // TODO: 导航到上传照片页面
              }
            : null,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadUserPhotos,
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          childAspectRatio: 0.8,
        ),
        itemCount: _userPhotos.length,
        itemBuilder: (context, index) {
          return PhotoGridItem(
            photo: _userPhotos[index],
            onTap: () {
              Navigator.pushNamed(
                context,
                '/photo-detail',
                arguments: {
                  'photoId': _userPhotos[index].id,
                  'photos': _userPhotos,
                  'initialIndex': index,
                },
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildSessionsTab() {
    if (_isLoadingSessions) {
      return const LoadingOverlay(isLoading: true);
    }

    if (_userSessions.isEmpty) {
      return NoSessionsEmptyState(
        message: widget.isCurrentUser ? '还没有创建会话' : '该用户还没有创建会话',
        actionText: widget.isCurrentUser ? '创建第一个会话' : null,
        onActionPressed: widget.isCurrentUser
            ? () {
                Navigator.pushNamed(context, '/create-session');
              }
            : null,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadUserSessions,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _userSessions.length,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: SessionCard(
              session: _userSessions[index],
              onTap: () {
                Navigator.pushNamed(
                  context,
                  '/session-detail',
                  arguments: {
                    'sessionId': _userSessions[index].id,
                    'session': _userSessions[index],
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildAboutTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildAboutItem('用户ID', _user!.id),
          _buildAboutItem('用户名', _user!.username),
          _buildAboutItem('邮箱', _user!.email),
          if (_user!.bio?.isNotEmpty == true)
            _buildAboutItem('个人简介', _user!.bio!),
          _buildAboutItem('注册时间', AppDateUtils.formatDateTime(_user!.createdAt)),
          _buildAboutItem('最后活跃', AppDateUtils.formatRelativeTime(_user!.updatedAt)),
          
          const SizedBox(height: 24),
          
          // 统计信息
          Text(
            '统计信息',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          
          _buildAboutItem('上传照片', '$_totalPhotos 张'),
          _buildAboutItem('创建会话', '$_totalSessions 个'),
          _buildAboutItem('获得点赞', '$_totalLikes 次'),
        ],
      ),
    );
  }

  Widget _buildAboutItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}