import 'package:flutter/material.dart';
import '../../core/models/photo.dart';
import '../../core/services/photo_service.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/custom_button.dart';
import '../widgets/photo_card.dart';
import '../widgets/loading_overlay.dart';
import '../widgets/empty_state.dart';
import '../widgets/error_widget.dart';

class PhotosScreen extends StatefulWidget {
  final String? sessionId;
  
  const PhotosScreen({
    super.key,
    this.sessionId,
  });
  
  @override
  State<PhotosScreen> createState() => _PhotosScreenState();
}

class _PhotosScreenState extends State<PhotosScreen>
    with TickerProviderStateMixin {
  final PhotoService _photoService = PhotoService();
  final ScrollController _scrollController = ScrollController();
  
  late TabController _tabController;
  
  List<Photo> _allPhotos = [];
  List<Photo> _myPhotos = [];
  List<Photo> _likedPhotos = [];
  
  bool _isLoading = false;
  bool _isLoadingMore = false;
  String? _error;
  
  int _currentPage = 1;
  bool _hasMoreData = true;
  
  bool _isGridView = true;
  PhotoQuality? _selectedQuality;
  String? _sortBy = 'created_at';
  String? _sortOrder = 'desc';
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    _scrollController.addListener(_onScroll);
    _loadPhotos();
  }
  
  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
  
  void _onTabChanged() {
    if (_tabController.indexIsChanging) {
      _resetPagination();
      _loadPhotos();
    }
  }
  
  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMorePhotos();
    }
  }
  
  void _resetPagination() {
    _currentPage = 1;
    _hasMoreData = true;
  }
  
  Future<void> _loadPhotos() async {
    if (_isLoading) return;
    
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    try {
      final response = await _photoService.getPhotos(
        sessionId: widget.sessionId,
        page: _currentPage,
        limit: 20,
        quality: _selectedQuality,
        sortBy: _sortBy,
        sortOrder: _sortOrder,
        type: _getPhotoType(),
      );
      
      if (response.success && response.data != null) {
        final photos = response.data!;
        
        setState(() {
          if (_currentPage == 1) {
            _updatePhotoLists(photos);
          } else {
            _appendToPhotoLists(photos);
          }
          _hasMoreData = photos.length >= 20;
        });
      } else {
        setState(() {
          _error = response.message ?? '加载照片失败';
        });
      }
    } catch (e) {
      setState(() {
        _error = '网络错误，请检查网络连接';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
  
  Future<void> _loadMorePhotos() async {
    if (_isLoadingMore || !_hasMoreData || _isLoading) return;
    
    setState(() {
      _isLoadingMore = true;
    });
    
    _currentPage++;
    
    try {
      final response = await _photoService.getPhotos(
        sessionId: widget.sessionId,
        page: _currentPage,
        limit: 20,
        quality: _selectedQuality,
        sortBy: _sortBy,
        sortOrder: _sortOrder,
        type: _getPhotoType(),
      );
      
      if (response.success && response.data != null) {
        final photos = response.data!;
        
        setState(() {
          _appendToPhotoLists(photos);
          _hasMoreData = photos.length >= 20;
        });
      }
    } catch (e) {
      _currentPage--; // 回滚页码
    } finally {
      setState(() {
        _isLoadingMore = false;
      });
    }
  }
  
  String? _getPhotoType() {
    switch (_tabController.index) {
      case 0:
        return null; // 全部
      case 1:
        return 'my'; // 我的
      case 2:
        return 'liked'; // 喜欢的
      default:
        return null;
    }
  }
  
  void _updatePhotoLists(List<Photo> photos) {
    switch (_tabController.index) {
      case 0:
        _allPhotos = photos;
        break;
      case 1:
        _myPhotos = photos;
        break;
      case 2:
        _likedPhotos = photos;
        break;
    }
  }
  
  void _appendToPhotoLists(List<Photo> photos) {
    switch (_tabController.index) {
      case 0:
        _allPhotos.addAll(photos);
        break;
      case 1:
        _myPhotos.addAll(photos);
        break;
      case 2:
        _likedPhotos.addAll(photos);
        break;
    }
  }
  
  List<Photo> _getCurrentPhotos() {
    switch (_tabController.index) {
      case 0:
        return _allPhotos;
      case 1:
        return _myPhotos;
      case 2:
        return _likedPhotos;
      default:
        return [];
    }
  }
  
  Future<void> _onRefresh() async {
    _resetPagination();
    await _loadPhotos();
  }
  
  void _onPhotoTap(Photo photo) {
    Navigator.pushNamed(
      context,
      '/photo-detail',
      arguments: {
        'photo': photo,
        'photos': _getCurrentPhotos(),
      },
    );
  }
  
  Future<void> _onLikePhoto(Photo photo) async {
    try {
      final response = photo.stats?.isLiked == true
          ? await _photoService.unlikePhoto(photo.id)
          : await _photoService.likePhoto(photo.id);
      
      if (response.success) {
        setState(() {
          // 更新本地状态
          final index = _getCurrentPhotos().indexWhere((p) => p.id == photo.id);
          if (index != -1) {
            final updatedPhoto = _getCurrentPhotos()[index];
            final currentLikeCount = updatedPhoto.stats?.likeCount ?? 0;
            final isLiked = updatedPhoto.stats?.isLiked ?? false;
            
            // 创建新的统计对象
            final newStats = updatedPhoto.stats?.copyWith(
              isLiked: !isLiked,
              likeCount: isLiked ? currentLikeCount - 1 : currentLikeCount + 1,
            );
            
            // 更新照片
            _getCurrentPhotos()[index] = updatedPhoto.copyWith(stats: newStats);
          }
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('操作失败，请重试')),
      );
    }
  }
  
  Future<void> _onDownloadPhoto(Photo photo) async {
    try {
      final response = await _photoService.downloadPhoto(photo.id);
      
      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('照片下载成功')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.message ?? '下载失败')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('下载失败，请重试')),
      );
    }
  }
  
  void _onSharePhoto(Photo photo) {
    // TODO: 实现分享功能
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('分享功能开发中')),
    );
  }
  
  Future<void> _onDeletePhoto(Photo photo) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认删除'),
        content: const Text('确定要删除这张照片吗？此操作无法撤销。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    
    if (confirmed == true) {
      try {
        final response = await _photoService.deletePhoto(photo.id);
        
        if (response.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('照片已删除')),
          );
          _onRefresh();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? '删除失败')),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('删除失败，请重试')),
        );
      }
    }
  }
  
  void _onUploadPhoto() {
    Navigator.pushNamed(
      context,
      '/upload-photo',
      arguments: widget.sessionId,
    ).then((_) {
      _onRefresh();
    });
  }
  
  void _showFilterDialog() {
    showModalBottomSheet(
      context: context,
      builder: (context) => _buildFilterSheet(),
    );
  }
  
  Widget _buildFilterSheet() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '筛选和排序',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          
          // 质量筛选
          Text(
            '照片质量',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilterChip(
                label: const Text('全部'),
                selected: _selectedQuality == null,
                onSelected: (selected) {
                  setState(() {
                    _selectedQuality = null;
                  });
                  Navigator.pop(context);
                  _onRefresh();
                },
              ),
              ...PhotoQuality.values.map((quality) => FilterChip(
                label: Text(quality.displayName),
                selected: _selectedQuality == quality,
                onSelected: (selected) {
                  setState(() {
                    _selectedQuality = selected ? quality : null;
                  });
                  Navigator.pop(context);
                  _onRefresh();
                },
              )),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // 排序方式
          Text(
            '排序方式',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Column(
            children: [
              RadioListTile<String>(
                title: const Text('创建时间'),
                value: 'created_at',
                groupValue: _sortBy,
                onChanged: (value) {
                  setState(() {
                    _sortBy = value;
                  });
                  Navigator.pop(context);
                  _onRefresh();
                },
              ),
              RadioListTile<String>(
                title: const Text('点赞数'),
                value: 'like_count',
                groupValue: _sortBy,
                onChanged: (value) {
                  setState(() {
                    _sortBy = value;
                  });
                  Navigator.pop(context);
                  _onRefresh();
                },
              ),
              RadioListTile<String>(
                title: const Text('下载数'),
                value: 'download_count',
                groupValue: _sortBy,
                onChanged: (value) {
                  setState(() {
                    _sortBy = value;
                  });
                  Navigator.pop(context);
                  _onRefresh();
                },
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // 排序顺序
          Row(
            children: [
              Expanded(
                child: CustomButton(
                  text: '升序',
                  onPressed: () {
                    setState(() {
                      _sortOrder = 'asc';
                    });
                    Navigator.pop(context);
                    _onRefresh();
                  },
                  isOutlined: _sortOrder != 'asc',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: CustomButton(
                  text: '降序',
                  onPressed: () {
                    setState(() {
                      _sortOrder = 'desc';
                    });
                    Navigator.pop(context);
                    _onRefresh();
                  },
                  isOutlined: _sortOrder != 'desc',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: CustomAppBar(
        title: widget.sessionId != null ? '相册照片' : '照片',
        actions: [
          IconButton(
            icon: Icon(_isGridView ? Icons.list : Icons.grid_view),
            onPressed: () {
              setState(() {
                _isGridView = !_isGridView;
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              showSearch(
                context: context,
                delegate: PhotoSearchDelegate(
                  photoService: _photoService,
                  sessionId: widget.sessionId,
                  onPhotoTap: _onPhotoTap,
                  onLikePhoto: _onLikePhoto,
                ),
              );
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: '全部'),
            Tab(text: '我的'),
            Tab(text: '喜欢的'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildPhotoList(),
          _buildPhotoList(),
          _buildPhotoList(),
        ],
      ),
      floatingActionButton: CustomFAB(
        onPressed: _onUploadPhoto,
        icon: Icons.add_a_photo,
        tooltip: '上传照片',
      ),
    );
  }
  
  Widget _buildPhotoList() {
    if (_isLoading && _currentPage == 1) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (_error != null && _currentPage == 1) {
      return CustomErrorWidget(
        message: _error!,
        onRetry: _loadPhotos,
      );
    }
    
    final photos = _getCurrentPhotos();
    
    if (photos.isEmpty && !_isLoading) {
      return NoPhotosEmptyState(
        onUploadPhoto: _onUploadPhoto,
      );
    }
    
    return RefreshIndicator(
      onRefresh: _onRefresh,
      child: _isGridView ? _buildGridView(photos) : _buildListView(photos),
    );
  }
  
  Widget _buildGridView(List<Photo> photos) {
    return GridView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(8),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1,
      ),
      itemCount: photos.length + (_isLoadingMore ? 2 : 0),
      itemBuilder: (context, index) {
        if (index >= photos.length) {
          return const Card(
            child: Center(child: CircularProgressIndicator()),
          );
        }
        
        final photo = photos[index];
        
        return PhotoGridItem(
          photo: photo,
          onTap: () => _onPhotoTap(photo),
          onLike: () => _onLikePhoto(photo),
        );
      },
    );
  }
  
  Widget _buildListView(List<Photo> photos) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: photos.length + (_isLoadingMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= photos.length) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        
        final photo = photos[index];
        
        return PhotoCard(
          photo: photo,
          onTap: () => _onPhotoTap(photo),
          onLike: () => _onLikePhoto(photo),
          onDownload: () => _onDownloadPhoto(photo),
          onShare: () => _onSharePhoto(photo),
          onDelete: photo.canDelete ? () => _onDeletePhoto(photo) : null,
          showActions: true,
          margin: const EdgeInsets.only(bottom: 16),
        );
      },
    );
  }
}

// 照片质量扩展
extension PhotoQualityExtension on PhotoQuality {
  String get displayName {
    switch (this) {
      case PhotoQuality.low:
        return '低质量';
      case PhotoQuality.medium:
        return '中等质量';
      case PhotoQuality.high:
        return '高质量';
      case PhotoQuality.original:
        return '原图';
    }
  }
}

// 照片搜索委托
class PhotoSearchDelegate extends SearchDelegate<Photo?> {
  final PhotoService photoService;
  final String? sessionId;
  final Function(Photo) onPhotoTap;
  final Function(Photo) onLikePhoto;
  
  PhotoSearchDelegate({
    required this.photoService,
    this.sessionId,
    required this.onPhotoTap,
    required this.onLikePhoto,
  });
  
  @override
  String get searchFieldLabel => '搜索照片...';
  
  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      IconButton(
        icon: const Icon(Icons.clear),
        onPressed: () {
          query = '';
        },
      ),
    ];
  }
  
  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () {
        close(context, null);
      },
    );
  }
  
  @override
  Widget buildResults(BuildContext context) {
    return _buildSearchResults();
  }
  
  @override
  Widget buildSuggestions(BuildContext context) {
    if (query.isEmpty) {
      return const Center(
        child: Text('输入关键词搜索照片'),
      );
    }
    
    return _buildSearchResults();
  }
  
  Widget _buildSearchResults() {
    return FutureBuilder<List<Photo>>(
      future: _searchPhotos(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        
        if (snapshot.hasError) {
          return CustomErrorWidget(
            message: '搜索失败，请重试',
            onRetry: () {
              // 触发重建
            },
          );
        }
        
        final photos = snapshot.data ?? [];
        
        if (photos.isEmpty) {
          return const NoSearchResultsEmptyState();
        }
        
        return GridView.builder(
          padding: const EdgeInsets.all(8),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 1,
          ),
          itemCount: photos.length,
          itemBuilder: (context, index) {
            final photo = photos[index];
            
            return PhotoGridItem(
              photo: photo,
              onTap: () {
                close(context, photo);
                onPhotoTap(photo);
              },
              onLike: () => onLikePhoto(photo),
            );
          },
        );
      },
    );
  }
  
  Future<List<Photo>> _searchPhotos() async {
    try {
      final response = await photoService.getPhotos(
        sessionId: sessionId,
        search: query,
        limit: 50,
      );
      
      if (response.success && response.data != null) {
        return response.data!;
      }
      
      return [];
    } catch (e) {
      throw Exception('搜索失败');
    }
  }
}