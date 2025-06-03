import 'package:flutter/material.dart';
import '../../core/models/session.dart';
import '../../core/services/session_service.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/session_card.dart';
import '../widgets/loading_overlay.dart';
import '../widgets/empty_state.dart';
import '../widgets/error_widget.dart';

class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key});
  
  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen>
    with TickerProviderStateMixin {
  final SessionService _sessionService = SessionService();
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  late TabController _tabController;
  
  List<Session> _allSessions = [];
  List<Session> _mySessions = [];
  List<Session> _joinedSessions = [];
  List<Session> _publicSessions = [];
  
  bool _isLoading = false;
  bool _isLoadingMore = false;
  String? _error;
  String _searchQuery = '';
  
  int _currentPage = 1;
  bool _hasMoreData = true;
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(_onTabChanged);
    _scrollController.addListener(_onScroll);
    _loadSessions();
  }
  
  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }
  
  void _onTabChanged() {
    if (_tabController.indexIsChanging) {
      _resetPagination();
      _loadSessions();
    }
  }
  
  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMoreSessions();
    }
  }
  
  void _resetPagination() {
    _currentPage = 1;
    _hasMoreData = true;
  }
  
  Future<void> _loadSessions() async {
    if (_isLoading) return;
    
    setState(() {
      _isLoading = true;
      _error = null;
    });
    
    try {
      final response = await _sessionService.getSessions(
        page: _currentPage,
        limit: 20,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        type: _getSessionType(),
      );
      
      if (response.success && response.data != null) {
        final sessions = response.data!;
        
        setState(() {
          if (_currentPage == 1) {
            _updateSessionLists(sessions);
          } else {
            _appendToSessionLists(sessions);
          }
          _hasMoreData = sessions.length >= 20;
        });
      } else {
        setState(() {
          _error = response.message ?? '加载会话失败';
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
  
  Future<void> _loadMoreSessions() async {
    if (_isLoadingMore || !_hasMoreData || _isLoading) return;
    
    setState(() {
      _isLoadingMore = true;
    });
    
    _currentPage++;
    
    try {
      final response = await _sessionService.getSessions(
        page: _currentPage,
        limit: 20,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        type: _getSessionType(),
      );
      
      if (response.success && response.data != null) {
        final sessions = response.data!;
        
        setState(() {
          _appendToSessionLists(sessions);
          _hasMoreData = sessions.length >= 20;
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
  
  String? _getSessionType() {
    switch (_tabController.index) {
      case 0:
        return null; // 全部
      case 1:
        return 'my'; // 我的
      case 2:
        return 'joined'; // 已加入
      case 3:
        return 'public'; // 公开
      default:
        return null;
    }
  }
  
  void _updateSessionLists(List<Session> sessions) {
    switch (_tabController.index) {
      case 0:
        _allSessions = sessions;
        break;
      case 1:
        _mySessions = sessions;
        break;
      case 2:
        _joinedSessions = sessions;
        break;
      case 3:
        _publicSessions = sessions;
        break;
    }
  }
  
  void _appendToSessionLists(List<Session> sessions) {
    switch (_tabController.index) {
      case 0:
        _allSessions.addAll(sessions);
        break;
      case 1:
        _mySessions.addAll(sessions);
        break;
      case 2:
        _joinedSessions.addAll(sessions);
        break;
      case 3:
        _publicSessions.addAll(sessions);
        break;
    }
  }
  
  List<Session> _getCurrentSessions() {
    switch (_tabController.index) {
      case 0:
        return _allSessions;
      case 1:
        return _mySessions;
      case 2:
        return _joinedSessions;
      case 3:
        return _publicSessions;
      default:
        return [];
    }
  }
  
  void _onSearch(String query) {
    setState(() {
      _searchQuery = query;
    });
    _resetPagination();
    _loadSessions();
  }
  
  Future<void> _onRefresh() async {
    _resetPagination();
    await _loadSessions();
  }
  
  void _onSessionTap(Session session) {
    Navigator.pushNamed(
      context,
      '/session-detail',
      arguments: session,
    );
  }
  
  Future<void> _onJoinSession(Session session) async {
    try {
      final response = await _sessionService.joinSession(session.id);
      
      if (response.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('成功加入会话')),
        );
        _onRefresh();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.message ?? '加入会话失败')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('网络错误，请重试')),
      );
    }
  }
  
  Future<void> _onLeaveSession(Session session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认离开'),
        content: Text('确定要离开会话"${session.name}"吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('确定'),
          ),
        ],
      ),
    );
    
    if (confirmed == true) {
      try {
        final response = await _sessionService.leaveSession(session.id);
        
        if (response.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('已离开会话')),
          );
          _onRefresh();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? '离开会话失败')),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('网络错误，请重试')),
        );
      }
    }
  }
  
  void _onCreateSession() {
    Navigator.pushNamed(context, '/create-session').then((_) {
      _onRefresh();
    });
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: CustomAppBar(
        title: '会话',
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              showSearch(
                context: context,
                delegate: SessionSearchDelegate(
                  sessionService: _sessionService,
                  onSessionTap: _onSessionTap,
                  onJoinSession: _onJoinSession,
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
            Tab(text: '已加入'),
            Tab(text: '公开'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildSessionList(),
          _buildSessionList(),
          _buildSessionList(),
          _buildSessionList(),
        ],
      ),
      floatingActionButton: CustomFAB(
        onPressed: _onCreateSession,
        icon: Icons.add,
        tooltip: '创建会话',
      ),
    );
  }
  
  Widget _buildSessionList() {
    if (_isLoading && _currentPage == 1) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (_error != null && _currentPage == 1) {
      return CustomErrorWidget(
        message: _error!,
        onRetry: _loadSessions,
      );
    }
    
    final sessions = _getCurrentSessions();
    
    if (sessions.isEmpty && !_isLoading) {
      return NoSessionsEmptyState(
        onCreateSession: _onCreateSession,
      );
    }
    
    return RefreshIndicator(
      onRefresh: _onRefresh,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: sessions.length + (_isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index >= sessions.length) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          
          final session = sessions[index];
          
          return SessionCard(
            session: session,
            onTap: () => _onSessionTap(session),
            onJoin: session.canJoin ? () => _onJoinSession(session) : null,
            onLeave: session.canLeave ? () => _onLeaveSession(session) : null,
            showActions: true,
            margin: const EdgeInsets.only(bottom: 12),
          );
        },
      ),
    );
  }
}

// 会话搜索委托
class SessionSearchDelegate extends SearchDelegate<Session?> {
  final SessionService sessionService;
  final Function(Session) onSessionTap;
  final Function(Session) onJoinSession;
  
  SessionSearchDelegate({
    required this.sessionService,
    required this.onSessionTap,
    required this.onJoinSession,
  });
  
  @override
  String get searchFieldLabel => '搜索会话...';
  
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
        child: Text('输入关键词搜索会话'),
      );
    }
    
    return _buildSearchResults();
  }
  
  Widget _buildSearchResults() {
    return FutureBuilder<List<Session>>(
      future: _searchSessions(),
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
        
        final sessions = snapshot.data ?? [];
        
        if (sessions.isEmpty) {
          return const NoSearchResultsEmptyState();
        }
        
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: sessions.length,
          itemBuilder: (context, index) {
            final session = sessions[index];
            
            return SessionCard(
              session: session,
              onTap: () {
                close(context, session);
                onSessionTap(session);
              },
              onJoin: session.canJoin ? () => onJoinSession(session) : null,
              showActions: true,
              margin: const EdgeInsets.only(bottom: 12),
            );
          },
        );
      },
    );
  }
  
  Future<List<Session>> _searchSessions() async {
    try {
      final response = await sessionService.getSessions(
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