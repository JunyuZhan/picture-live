import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/session_provider.dart';
import '../../core/providers/photo_provider.dart';
import '../../core/router/app_router.dart';
import '../widgets/session_card.dart';
import '../widgets/photo_grid.dart';
import '../widgets/floating_action_menu.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/empty_state.dart';
import '../widgets/error_widget.dart';
import '../widgets/loading_widget.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> 
    with TickerProviderStateMixin {
  late TabController _tabController;
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    
    // 初始化数据
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadInitialData();
    });
  }
  
  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
  
  void _loadInitialData() {
    ref.read(sessionsProvider.notifier).loadSessions();
    ref.read(photosProvider.notifier).loadPhotos();
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = ref.watch(authProvider).user;
    
    return Scaffold(
      appBar: CustomAppBar(
        title: 'Picture Live',
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              context.push(AppRoutes.search);
            },
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              context.push(AppRoutes.notifications);
            },
          ),
          PopupMenuButton<String>(
            icon: CircleAvatar(
              radius: 16,
              backgroundImage: user?.avatarUrl != null 
                  ? NetworkImage(user!.avatarUrl!) 
                  : null,
              child: user?.avatarUrl == null 
                  ? Text(
                      user?.displayName?.substring(0, 1).toUpperCase() ?? 'U',
                      style: theme.textTheme.bodySmall,
                    )
                  : null,
            ),
            onSelected: _handleMenuAction,
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'profile',
                child: ListTile(
                  leading: Icon(Icons.person_outline),
                  title: Text('个人资料'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'settings',
                child: ListTile(
                  leading: Icon(Icons.settings_outlined),
                  title: Text('设置'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'logout',
                child: ListTile(
                  leading: Icon(Icons.logout),
                  title: Text('退出登录'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(
              icon: Icon(Icons.home_outlined),
              text: '首页',
            ),
            Tab(
              icon: Icon(Icons.group_outlined),
              text: '相册',
            ),
            Tab(
              icon: Icon(Icons.photo_library_outlined),
              text: '照片',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildHomeTab(),
          _buildSessionsTab(),
          _buildPhotosTab(),
        ],
      ),
      floatingActionButton: FloatingActionMenu(
        onCreateSession: () {
          context.push(AppRoutes.createSession);
        },
        onUploadPhoto: () {
          context.push(AppRoutes.uploadPhoto);
        },
        onTakePhoto: () {
          context.push(AppRoutes.camera);
        },
      ),
    );
  }
  
  Widget _buildHomeTab() {
    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait([
          ref.read(sessionsProvider.notifier).loadSessions(),
          ref.read(photosProvider.notifier).loadPhotos(),
        ]);
      },
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 欢迎信息
            _buildWelcomeSection(),
            
            const SizedBox(height: 24),
            
            // 最近相册
            _buildRecentSessions(),
            
            const SizedBox(height: 24),
            
            // 最新照片
            _buildRecentPhotos(),
          ],
        ),
      ),
    );
  }
  
  Widget _buildSessionsTab() {
    final sessionsState = ref.watch(sessionsProvider);
    
    return RefreshIndicator(
      onRefresh: () => ref.read(sessionsProvider.notifier).loadSessions(),
      child: _buildSessionsList(sessionsState),
    );
  }
  
  Widget _buildPhotosTab() {
    final photosState = ref.watch(photosProvider);
    
    return RefreshIndicator(
      onRefresh: () => ref.read(photosProvider.notifier).loadPhotos(),
      child: _buildPhotosList(photosState),
    );
  }
  
  Widget _buildWelcomeSection() {
    final theme = Theme.of(context);
    final user = ref.watch(authProvider).user;
    final now = DateTime.now();
    final hour = now.hour;
    
    String greeting;
    if (hour < 12) {
      greeting = '早上好';
    } else if (hour < 18) {
      greeting = '下午好';
    } else {
      greeting = '晚上好';
    }
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            theme.colorScheme.primary,
            theme.colorScheme.primary.withOpacity(0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$greeting，${user?.displayName ?? user?.username ?? '用户'}！',
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          
          const SizedBox(height: 8),
          
          Text(
            '今天想分享什么精彩瞬间呢？',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: Colors.white.withOpacity(0.9),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildRecentSessions() {
    final theme = Theme.of(context);
    final sessionsState = ref.watch(sessionsProvider);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '最近相册',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                _tabController.animateTo(1);
              },
              child: const Text('查看全部'),
            ),
          ],
        ),
        
        const SizedBox(height: 12),
        
        if (sessionsState.isLoading)
          const LoadingWidget()
        else if (sessionsState.error != null)
          CustomErrorWidget(
            message: sessionsState.error!,
            onRetry: () => ref.read(sessionsProvider.notifier).loadSessions(),
          )
        else if (sessionsState.sessions.isEmpty)
          const EmptyState(
            icon: Icons.group_outlined,
            title: '暂无相册',
            subtitle: '创建您的第一个相册开始分享吧！',
          )
        else
          SizedBox(
            height: 200,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: sessionsState.sessions.take(5).length,
              itemBuilder: (context, index) {
                final session = sessionsState.sessions[index];
                return Container(
                  width: 300,
                  margin: EdgeInsets.only(
                    right: index < sessionsState.sessions.length - 1 ? 12 : 0,
                  ),
                  child: SessionCard(
                    session: session,
                    onTap: () {
                      context.push('${AppRoutes.session}/${session.id}');
                    },
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
  
  Widget _buildRecentPhotos() {
    final theme = Theme.of(context);
    final photosState = ref.watch(photosProvider);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '最新照片',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                _tabController.animateTo(2);
              },
              child: const Text('查看全部'),
            ),
          ],
        ),
        
        const SizedBox(height: 12),
        
        if (photosState.isLoading)
          const LoadingWidget()
        else if (photosState.error != null)
          CustomErrorWidget(
            message: photosState.error!,
            onRetry: () => ref.read(photosProvider.notifier).loadPhotos(),
          )
        else if (photosState.photos.isEmpty)
          const EmptyState(
            icon: Icons.photo_library_outlined,
            title: '暂无照片',
            subtitle: '上传您的第一张照片开始记录美好时光！',
          )
        else
          PhotoGrid(
            photos: photosState.photos.take(6).toList(),
            crossAxisCount: 3,
            onPhotoTap: (photo) {
              context.push('${AppRoutes.photo}/${photo.id}');
            },
          ),
      ],
    );
  }
  
  Widget _buildSessionsList(SessionsState state) {
    if (state.isLoading) {
      return const LoadingWidget();
    }
    
    if (state.error != null) {
      return CustomErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(sessionsProvider.notifier).loadSessions(),
      );
    }
    
    if (state.sessions.isEmpty) {
      return const EmptyState(
        icon: Icons.group_outlined,
        title: '暂无相册',
        subtitle: '创建您的第一个相册开始分享吧！',
      );
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: state.sessions.length,
      itemBuilder: (context, index) {
        final session = state.sessions[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: SessionCard(
            session: session,
            onTap: () {
              context.push('${AppRoutes.session}/${session.id}');
            },
          ),
        );
      },
    );
  }
  
  Widget _buildPhotosList(PhotosState state) {
    if (state.isLoading) {
      return const LoadingWidget();
    }
    
    if (state.error != null) {
      return CustomErrorWidget(
        message: state.error!,
        onRetry: () => ref.read(photosProvider.notifier).loadPhotos(),
      );
    }
    
    if (state.photos.isEmpty) {
      return const EmptyState(
        icon: Icons.photo_library_outlined,
        title: '暂无照片',
        subtitle: '上传您的第一张照片开始记录美好时光！',
      );
    }
    
    return PhotoGrid(
      photos: state.photos,
      padding: const EdgeInsets.all(16),
      onPhotoTap: (photo) {
        context.push('${AppRoutes.photo}/${photo.id}');
      },
    );
  }
  
  void _handleMenuAction(String action) {
    switch (action) {
      case 'profile':
        context.push(AppRoutes.profile);
        break;
      case 'settings':
        context.push(AppRoutes.settings);
        break;
      case 'logout':
        _showLogoutDialog();
        break;
    }
  }
  
  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('退出登录'),
        content: const Text('确定要退出登录吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await ref.read(authProvider.notifier).logout();
              if (mounted) {
                context.go(AppRoutes.login);
              }
            },
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }
}