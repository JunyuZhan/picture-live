import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';
import 'dart:io';
import '../../core/models/photo.dart';
import '../../core/models/user.dart';
import '../../core/services/photo_service.dart';
import '../../core/utils/date_utils.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/loading_overlay.dart';
import '../widgets/error_widget.dart';

class PhotoDetailScreen extends ConsumerStatefulWidget {
  final String photoId;
  final List<Photo>? photos;
  final int? initialIndex;
  final Photo? photo;

  const PhotoDetailScreen({
    Key? key,
    required this.photoId,
    this.photos,
    this.initialIndex,
    this.photo,
  }) : super(key: key);

  @override
  ConsumerState<PhotoDetailScreen> createState() => _PhotoDetailScreenState();
}

class _PhotoDetailScreenState extends ConsumerState<PhotoDetailScreen>
    with TickerProviderStateMixin {
  late PageController _pageController;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  
  Photo? _currentPhoto;
  List<Photo> _photos = [];
  int _currentIndex = 0;
  bool _isLoading = true;
  bool _showDetails = false;
  bool _isLiked = false;
  bool _isDownloading = false;
  String? _error;
  
  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex ?? 0;
    _pageController = PageController(initialPage: _currentIndex);
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
    
    _initializePhotos();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  void _initializePhotos() {
    if (widget.photos != null && widget.photos!.isNotEmpty) {
      _photos = widget.photos!;
      _currentPhoto = _photos[_currentIndex];
      _isLiked = _currentPhoto?.isLiked ?? false;
      setState(() => _isLoading = false);
    } else if (widget.photo != null) {
      _photos = [widget.photo!];
      _currentPhoto = widget.photo;
      _isLiked = _currentPhoto?.isLiked ?? false;
      setState(() => _isLoading = false);
    } else {
      _loadPhotoDetail();
    }
  }

  Future<void> _loadPhotoDetail() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final photoService = ref.read(photoServiceProvider);
      final photo = await photoService.getPhotoById(widget.photoId);
      
      setState(() {
        _currentPhoto = photo;
        _photos = [photo];
        _isLiked = photo.isLiked;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _onPageChanged(int index) {
    setState(() {
      _currentIndex = index;
      _currentPhoto = _photos[index];
      _isLiked = _currentPhoto?.isLiked ?? false;
    });
  }

  void _toggleDetails() {
    setState(() => _showDetails = !_showDetails);
    if (_showDetails) {
      _animationController.forward();
    } else {
      _animationController.reverse();
    }
  }

  Future<void> _toggleLike() async {
    if (_currentPhoto == null) return;
    
    try {
      final photoService = ref.read(photoServiceProvider);
      
      if (_isLiked) {
        await photoService.unlikePhoto(_currentPhoto!.id);
      } else {
        await photoService.likePhoto(_currentPhoto!.id);
      }
      
      setState(() {
        _isLiked = !_isLiked;
        _currentPhoto = _currentPhoto!.copyWith(
          likesCount: _isLiked 
              ? _currentPhoto!.likesCount + 1 
              : _currentPhoto!.likesCount - 1,
          isLiked: _isLiked,
        );
        _photos[_currentIndex] = _currentPhoto!;
      });
    } catch (e) {
      _showErrorSnackBar('操作失败: ${e.toString()}');
    }
  }

  Future<void> _sharePhoto() async {
    if (_currentPhoto == null) return;
    
    try {
      await Share.share(
        '分享照片: ${_currentPhoto!.description ?? ""} - Picture Live',
        subject: '来自 Picture Live 的照片',
      );
    } catch (e) {
      _showErrorSnackBar('分享失败: ${e.toString()}');
    }
  }

  Future<void> _downloadPhoto() async {
    if (_currentPhoto == null || _isDownloading) return;
    
    try {
      setState(() => _isDownloading = true);
      
      // 获取下载目录
      final directory = await getApplicationDocumentsDirectory();
      final fileName = 'photo_${_currentPhoto!.id}_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final filePath = '${directory.path}/$fileName';
      
      // 下载文件
      final dio = Dio();
      await dio.download(
        _currentPhoto!.url,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            final progress = received / total;
            // 可以在这里显示下载进度
          }
        },
      );
      
      _showSuccessSnackBar('照片已保存到: $filePath');
    } catch (e) {
      _showErrorSnackBar('下载失败: ${e.toString()}');
    } finally {
      setState(() => _isDownloading = false);
    }
  }

  Future<void> _deletePhoto() async {
    if (_currentPhoto == null) return;
    
    final confirmed = await _showConfirmDialog(
      '删除照片',
      '确定要删除这张照片吗？此操作无法撤销。',
    );
    
    if (!confirmed) return;
    
    try {
      final photoService = ref.read(photoServiceProvider);
      await photoService.deletePhoto(_currentPhoto!.id);
      
      _showSuccessSnackBar('照片已删除');
      Navigator.pop(context, true); // 返回并标记已删除
    } catch (e) {
      _showErrorSnackBar('删除失败: ${e.toString()}');
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
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
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
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: const LoadingOverlay(isLoading: true),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: CustomErrorWidget(
          message: _error!,
          onRetry: _loadPhotoDetail,
        ),
      );
    }

    if (_currentPhoto == null) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: const Center(
          child: Text(
            '照片不存在',
            style: TextStyle(color: Colors.white),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 照片查看器
          _buildPhotoViewer(),
          
          // 顶部应用栏
          _buildTopAppBar(),
          
          // 底部操作栏
          _buildBottomActionBar(),
          
          // 照片详情面板
          if (_showDetails) _buildDetailsPanel(),
        ],
      ),
    );
  }

  Widget _buildPhotoViewer() {
    if (_photos.length == 1) {
      return GestureDetector(
        onTap: _toggleDetails,
        child: PhotoView(
          imageProvider: NetworkImage(_currentPhoto!.url),
          minScale: PhotoViewComputedScale.contained,
          maxScale: PhotoViewComputedScale.covered * 3,
          initialScale: PhotoViewComputedScale.contained,
          heroAttributes: PhotoViewHeroAttributes(
            tag: 'photo_${_currentPhoto!.id}',
          ),
          loadingBuilder: (context, event) => const Center(
            child: CircularProgressIndicator(color: Colors.white),
          ),
          errorBuilder: (context, error, stackTrace) => const Center(
            child: Icon(
              Icons.error,
              color: Colors.white,
              size: 64,
            ),
          ),
        ),
      );
    }

    return PhotoViewGallery.builder(
      scrollPhysics: const BouncingScrollPhysics(),
      builder: (context, index) {
        final photo = _photos[index];
        return PhotoViewGalleryPageOptions(
          imageProvider: NetworkImage(photo.url),
          minScale: PhotoViewComputedScale.contained,
          maxScale: PhotoViewComputedScale.covered * 3,
          initialScale: PhotoViewComputedScale.contained,
          heroAttributes: PhotoViewHeroAttributes(
            tag: 'photo_${photo.id}',
          ),
        );
      },
      itemCount: _photos.length,
      loadingBuilder: (context, event) => const Center(
        child: CircularProgressIndicator(color: Colors.white),
      ),
      pageController: _pageController,
      onPageChanged: _onPageChanged,
      backgroundDecoration: const BoxDecoration(
        color: Colors.black,
      ),
    );
  }

  Widget _buildTopAppBar() {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.black.withOpacity(0.7),
                Colors.transparent,
              ],
            ),
          ),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
              Expanded(
                child: _photos.length > 1
                    ? Center(
                        child: Text(
                          '${_currentIndex + 1} / ${_photos.length}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      )
                    : const SizedBox(),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, color: Colors.white),
                onSelected: (value) {
                  switch (value) {
                    case 'download':
                      _downloadPhoto();
                      break;
                    case 'share':
                      _sharePhoto();
                      break;
                    case 'delete':
                      _deletePhoto();
                      break;
                    case 'report':
                      // TODO: 举报照片
                      break;
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'download',
                    child: ListTile(
                      leading: Icon(Icons.download),
                      title: Text('下载'),
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'share',
                    child: ListTile(
                      leading: Icon(Icons.share),
                      title: Text('分享'),
                    ),
                  ),
                  // 只有照片所有者才能删除
                  if (_isPhotoOwner())
                    const PopupMenuItem(
                      value: 'delete',
                      child: ListTile(
                        leading: Icon(Icons.delete, color: Colors.red),
                        title: Text('删除', style: TextStyle(color: Colors.red)),
                      ),
                    ),
                  const PopupMenuItem(
                    value: 'report',
                    child: ListTile(
                      leading: Icon(Icons.report),
                      title: Text('举报'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomActionBar() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.bottomCenter,
              end: Alignment.topCenter,
              colors: [
                Colors.black.withOpacity(0.7),
                Colors.transparent,
              ],
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildActionButton(
                icon: _isLiked ? Icons.favorite : Icons.favorite_border,
                label: '${_currentPhoto!.likesCount}',
                color: _isLiked ? Colors.red : Colors.white,
                onPressed: _toggleLike,
              ),
              _buildActionButton(
                icon: Icons.info_outline,
                label: '详情',
                color: Colors.white,
                onPressed: _toggleDetails,
              ),
              _buildActionButton(
                icon: _isDownloading ? Icons.downloading : Icons.download,
                label: '下载',
                color: Colors.white,
                onPressed: _isDownloading ? null : _downloadPhoto,
              ),
              _buildActionButton(
                icon: Icons.share,
                label: '分享',
                color: Colors.white,
                onPressed: _sharePhoto,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    VoidCallback? onPressed,
  }) {
    return GestureDetector(
      onTap: onPressed,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: onPressed == null ? Colors.grey : color,
            size: 28,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: onPressed == null ? Colors.grey : Colors.white,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsPanel() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.6,
          ),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.9),
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(20),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 拖拽指示器
              Container(
                margin: const EdgeInsets.symmetric(vertical: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[600],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // 详情内容
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 用户信息
                      if (_currentPhoto!.user != null)
                        _buildUserInfo(_currentPhoto!.user!),
                      
                      const SizedBox(height: 16),
                      
                      // 照片描述
                      if (_currentPhoto!.description?.isNotEmpty == true) ..[
                        Text(
                          _currentPhoto!.description!,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      
                      // 照片信息
                      _buildPhotoInfo(),
                      
                      // 标签
                      if (_currentPhoto!.tags?.isNotEmpty == true) ..[
                        const SizedBox(height: 16),
                        _buildTags(),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUserInfo(User user) {
    return Row(
      children: [
        CircleAvatar(
          radius: 20,
          backgroundImage: user.avatar != null
              ? NetworkImage(user.avatar!)
              : null,
          child: user.avatar == null
              ? Text(
                  user.username.isNotEmpty
                      ? user.username[0].toUpperCase()
                      : 'U',
                  style: const TextStyle(color: Colors.white),
                )
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                user.username,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                AppDateUtils.formatRelativeTime(_currentPhoto!.createdAt),
                style: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPhotoInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildInfoRow('拍摄时间', AppDateUtils.formatDateTime(_currentPhoto!.createdAt)),
        if (_currentPhoto!.location?.isNotEmpty == true)
          _buildInfoRow('位置', _currentPhoto!.location!),
        _buildInfoRow('质量评分', '${_currentPhoto!.qualityScore}/100'),
        _buildInfoRow('点赞数', '${_currentPhoto!.likesCount}'),
        if (_currentPhoto!.fileSize != null)
          _buildInfoRow('文件大小', _formatFileSize(_currentPhoto!.fileSize!)),
        if (_currentPhoto!.dimensions?.isNotEmpty == true)
          _buildInfoRow('尺寸', _currentPhoto!.dimensions!),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey[400],
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTags() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '标签',
          style: TextStyle(
            color: Colors.grey[400],
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _currentPhoto!.tags!.map((tag) {
            return Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 6,
              ),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Colors.blue.withOpacity(0.5),
                ),
              ),
              child: Text(
                tag,
                style: const TextStyle(
                  color: Colors.blue,
                  fontSize: 12,
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  bool _isPhotoOwner() {
    final currentUser = ref.read(authProvider).user;
    return currentUser?.id == _currentPhoto?.user?.id;
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '${bytes}B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)}KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
  }
}