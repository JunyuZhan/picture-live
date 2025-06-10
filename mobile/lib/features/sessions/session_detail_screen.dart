import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../core/models/session.dart';
import '../../core/models/photo.dart';
import '../../core/models/user.dart';
import '../../core/services/session_service.dart';
import '../../core/services/photo_service.dart';
import '../../core/utils/date_utils.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/custom_button.dart';
import '../widgets/photo_card.dart';
import '../widgets/loading_overlay.dart';
import '../widgets/empty_state.dart';
import '../widgets/error_widget.dart';

class SessionDetailScreen extends ConsumerStatefulWidget {
  final String sessionId;
  final Session? session;

  const SessionDetailScreen({
    Key? key,
    required this.sessionId,
    this.session,
  }) : super(key: key);

  @override
  ConsumerState<SessionDetailScreen> createState() => _SessionDetailScreenState();
}

class _SessionDetailScreenState extends ConsumerState<SessionDetailScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _imagePicker = ImagePicker();
  
  Session? _session;
  List<Photo> _photos = [];
  List<User> _participants = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasMorePhotos = true;
  String? _error;
  int _currentPage = 1;
  final int _pageSize = 20;
  bool _isJoined = false;
  bool _isOwner = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _session = widget.session;
    _loadSessionDetail();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMorePhotos();
    }
  }

  Future<void> _loadSessionDetail() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final sessionService = ref.read(sessionServiceProvider);
      final photoService = ref.read(photoServiceProvider);
      
      // 加载相册详情
      if (_session == null) {
        _session = await sessionService.getSessionById(widget.sessionId);
      }
      
      // 加载照片
      final photosResponse = await photoService.getSessionPhotos(
        widget.sessionId,
        page: 1,
        limit: _pageSize,
      );
      
      // 加载参与者
      final participants = await sessionService.getSessionParticipants(widget.sessionId);
      
      // 检查用户状态
      final currentUser = ref.read(authProvider).user;
      _isJoined = participants.any((p) => p.id == currentUser?.id);
      _isOwner = _session?.createdBy == currentUser?.id;
      
      setState(() {
        _photos = photosResponse.data;
        _participants = participants;
        _hasMorePhotos = photosResponse.hasMore;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMorePhotos() async {
    if (_isLoadingMore || !_hasMorePhotos) return;

    try {
      setState(() => _isLoadingMore = true);
      
      final photoService = ref.read(photoServiceProvider);
      final response = await photoService.getSessionPhotos(
        widget.sessionId,
        page: _currentPage + 1,
        limit: _pageSize,
      );
      
      setState(() {
        _photos.addAll(response.data);
        _hasMorePhotos = response.hasMore;
        _currentPage++;
        _isLoadingMore = false;
      });
    } catch (e) {
      setState(() => _isLoadingMore = false);
      _showErrorSnackBar('加载更多照片失败: ${e.toString()}');
    }
  }

  Future<void> _joinSession() async {
    try {
      final sessionService = ref.read(sessionServiceProvider);
      await sessionService.joinSession(widget.sessionId);
      
      setState(() => _isJoined = true);
      _showSuccessSnackBar('成功加入相册');
      _loadSessionDetail(); // 重新加载数据
    } catch (e) {
      _showErrorSnackBar('加入相册失败: ${e.toString()}');
    }
  }

  Future<void> _leaveSession() async {
    final confirmed = await _showConfirmDialog(
      '离开相册',
      '确定要离开这个相册吗？',
    );
    
    if (!confirmed) return;
    
    try {
      final sessionService = ref.read(sessionServiceProvider);
      await sessionService.leaveSession(widget.sessionId);
      
      setState(() => _isJoined = false);
      _showSuccessSnackBar('已离开相册');
      _loadSessionDetail(); // 重新加载数据
    } catch (e) {
      _showErrorSnackBar('离开相册失败: ${e.toString()}');
    }
  }

  Future<void> _uploadPhoto() async {
    try {
      // 检查权限
      final permission = await Permission.camera.request();
      if (!permission.isGranted) {
        _showErrorSnackBar('需要相机权限才能上传照片');
        return;
      }
      
      // 显示选择对话框
      final source = await _showImageSourceDialog();
      if (source == null) return;
      
      final XFile? image = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );
      
      if (image == null) return;
      
      // 显示上传对话框
      _showUploadDialog(image);
    } catch (e) {
      _showErrorSnackBar('选择照片失败: ${e.toString()}');
    }
  }

  Future<ImageSource?> _showImageSourceDialog() async {
    return showDialog<ImageSource>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('选择照片来源'),
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

  void _showUploadDialog(XFile image) {
    final TextEditingController descriptionController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('上传照片'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                image.path,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    height: 200,
                    color: Colors.grey[300],
                    child: const Icon(Icons.error),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: descriptionController,
              decoration: const InputDecoration(
                labelText: '照片描述（可选）',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _performUpload(image, descriptionController.text);
            },
            child: const Text('上传'),
          ),
        ],
      ),
    );
  }

  Future<void> _performUpload(XFile image, String description) async {
    try {
      final photoService = ref.read(photoServiceProvider);
      
      // 显示上传进度
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const AlertDialog(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('正在上传照片...'),
            ],
          ),
        ),
      );
      
      await photoService.uploadPhoto(
        sessionId: widget.sessionId,
        imagePath: image.path,
        description: description.isNotEmpty ? description : null,
      );
      
      Navigator.pop(context); // 关闭进度对话框
      _showSuccessSnackBar('照片上传成功');
      _loadSessionDetail(); // 重新加载数据
    } catch (e) {
      Navigator.pop(context); // 关闭进度对话框
      _showErrorSnackBar('上传失败: ${e.toString()}');
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
          title: '相册详情',
          showBackButton: true,
        ),
        body: const LoadingOverlay(isLoading: true),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: CustomAppBar(
          title: '相册详情',
          showBackButton: true,
        ),
        body: CustomErrorWidget(
          message: _error!,
          onRetry: _loadSessionDetail,
        ),
      );
    }

    if (_session == null) {
      return Scaffold(
        appBar: CustomAppBar(
          title: '相册详情',
          showBackButton: true,
        ),
        body: const NoDataEmptyState(
          message: '相册不存在',
        ),
      );
    }

    return Scaffold(
      appBar: CustomAppBar(
        title: _session!.name,
        showBackButton: true,
        actions: [
          if (_isOwner)
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () {
                // TODO: 导航到编辑相册页面
              },
            ),
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'share':
                  // TODO: 分享相册
                  break;
                case 'report':
                  // TODO: 举报相册
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'share',
                child: ListTile(
                  leading: Icon(Icons.share),
                  title: Text('分享相册'),
                ),
              ),
              if (!_isOwner)
                const PopupMenuItem(
                  value: 'report',
                  child: ListTile(
                    leading: Icon(Icons.report),
                    title: Text('举报相册'),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // 相册信息卡片
          _buildSessionInfoCard(),
          
          // 操作按钮
          _buildActionButtons(),
          
          // 标签栏
          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: '照片'),
              Tab(text: '参与者'),
              Tab(text: '详情'),
            ],
          ),
          
          // 标签内容
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildPhotosTab(),
                _buildParticipantsTab(),
                _buildDetailsTab(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: _isJoined
          ? FloatingActionButton(
              onPressed: _uploadPhoto,
              child: const Icon(Icons.add_a_photo),
            )
          : null,
    );
  }

  Widget _buildSessionInfoCard() {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundImage: _session!.coverImage != null
                      ? NetworkImage(_session!.coverImage!)
                      : null,
                  child: _session!.coverImage == null
                      ? Text(
                          _session!.name.isNotEmpty
                              ? _session!.name[0].toUpperCase()
                              : 'S',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _session!.name,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            _session!.isPublic ? Icons.public : Icons.lock,
                            size: 16,
                            color: Colors.grey[600],
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _session!.isPublic ? '公开' : '私密',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                          const SizedBox(width: 16),
                          Icon(
                            Icons.people,
                            size: 16,
                            color: Colors.grey[600],
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${_participants.length} 人',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (_session!.description?.isNotEmpty == true) ..[
              const SizedBox(height: 12),
              Text(
                _session!.description!,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(
                  Icons.access_time,
                  size: 16,
                  color: Colors.grey[600],
                ),
                const SizedBox(width: 4),
                Text(
                  '创建于 ${AppDateUtils.formatDate(_session!.createdAt)}',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          if (!_isJoined && !_isOwner)
            Expanded(
              child: CustomButton(
                text: '加入相册',
                onPressed: _joinSession,
                backgroundColor: Theme.of(context).primaryColor,
              ),
            ),
          if (_isJoined && !_isOwner) ..[
            Expanded(
              child: CustomButton(
                text: '离开相册',
                onPressed: _leaveSession,
                backgroundColor: Colors.red,
              ),
            ),
          ],
          if (_isOwner)
            Expanded(
              child: CustomButton(
                text: '管理相册',
                onPressed: () {
                  // TODO: 导航到相册管理页面
                },
                backgroundColor: Theme.of(context).primaryColor,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPhotosTab() {
    if (_photos.isEmpty) {
      return const NoPhotosEmptyState(
        message: '还没有照片',
        actionText: '上传第一张照片',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadSessionDetail,
      child: GridView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          childAspectRatio: 0.8,
        ),
        itemCount: _photos.length + (_isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index >= _photos.length) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }
          
          return PhotoGridItem(
            photo: _photos[index],
            onTap: () {
              // TODO: 导航到照片详情页面
            },
          );
        },
      ),
    );
  }

  Widget _buildParticipantsTab() {
    if (_participants.isEmpty) {
      return const NoDataEmptyState(
        message: '还没有参与者',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _participants.length,
      itemBuilder: (context, index) {
        final participant = _participants[index];
        final isOwner = participant.id == _session!.createdBy;
        
        return Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundImage: participant.avatar != null
                  ? NetworkImage(participant.avatar!)
                  : null,
              child: participant.avatar == null
                  ? Text(
                      participant.username.isNotEmpty
                          ? participant.username[0].toUpperCase()
                          : 'U',
                    )
                  : null,
            ),
            title: Text(participant.username),
            subtitle: Text(participant.email),
            trailing: isOwner
                ? const Chip(
                    label: Text('创建者'),
                    backgroundColor: Colors.orange,
                  )
                : null,
            onTap: () {
              // TODO: 导航到用户详情页面
            },
          ),
        );
      },
    );
  }

  Widget _buildDetailsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildDetailItem('相册名称', _session!.name),
          _buildDetailItem('描述', _session!.description ?? '无'),
          _buildDetailItem('类型', _session!.isPublic ? '公开相册' : '私密相册'),
          _buildDetailItem('创建时间', AppDateUtils.formatDateTime(_session!.createdAt)),
          _buildDetailItem('更新时间', AppDateUtils.formatDateTime(_session!.updatedAt)),
          _buildDetailItem('参与者数量', '${_participants.length} 人'),
          _buildDetailItem('照片数量', '${_photos.length} 张'),
          if (_session!.location?.isNotEmpty == true)
            _buildDetailItem('位置', _session!.location!),
          if (_session!.tags?.isNotEmpty == true)
            _buildDetailItem('标签', _session!.tags!.join(', ')),
        ],
      ),
    );
  }

  Widget _buildDetailItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}