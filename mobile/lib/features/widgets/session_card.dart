import 'package:flutter/material.dart';
import '../../core/models/session.dart';
import '../../core/utils/date_utils.dart';
import 'custom_button.dart';

class SessionCard extends StatelessWidget {
  final Session session;
  final VoidCallback? onTap;
  final VoidCallback? onJoin;
  final VoidCallback? onLeave;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final bool showActions;
  final bool isCompact;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? padding;
  
  const SessionCard({
    super.key,
    required this.session,
    this.onTap,
    this.onJoin,
    this.onLeave,
    this.onEdit,
    this.onDelete,
    this.showActions = false,
    this.isCompact = false,
    this.margin,
    this.padding,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Container(
      margin: margin ?? const EdgeInsets.symmetric(vertical: 4),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(16),
            child: isCompact ? _buildCompactContent(theme) : _buildFullContent(theme),
          ),
        ),
      ),
    );
  }
  
  Widget _buildCompactContent(ThemeData theme) {
    return Row(
      children: [
        // 相册头像/图标
        _buildSessionAvatar(theme),
        
        const SizedBox(width: 12),
        
        // 相册信息
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                session.name,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              
              const SizedBox(height: 4),
              
              Row(
                children: [
                  Icon(
                    Icons.people,
                    size: 14,
                    color: theme.colorScheme.onSurface.withOpacity(0.6),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${session.memberCount ?? 0} 成员',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                  const SizedBox(width: 12),
                  _buildStatusChip(theme),
                ],
              ),
            ],
          ),
        ),
        
        // 操作按钮
        if (showActions)
          _buildActionButton(theme),
      ],
    );
  }
  
  Widget _buildFullContent(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 头部信息
        Row(
          children: [
            _buildSessionAvatar(theme),
            
            const SizedBox(width: 12),
            
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session.name,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  
                  const SizedBox(height: 4),
                  
                  Row(
                    children: [
                      _buildStatusChip(theme),
                      const SizedBox(width: 8),
                      Text(
                        '创建于 ${AppDateUtils.formatDate(session.createdAt)}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            if (showActions)
              PopupMenuButton<String>(
                onSelected: _handleMenuAction,
                itemBuilder: (context) => [
                  if (onEdit != null)
                    const PopupMenuItem(
                      value: 'edit',
                      child: ListTile(
                        leading: Icon(Icons.edit),
                        title: Text('编辑'),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  if (onJoin != null)
                    const PopupMenuItem(
                      value: 'join',
                      child: ListTile(
                        leading: Icon(Icons.login),
                        title: Text('加入'),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  if (onLeave != null)
                    const PopupMenuItem(
                      value: 'leave',
                      child: ListTile(
                        leading: Icon(Icons.logout),
                        title: Text('离开'),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  if (onDelete != null) ..[
                    const PopupMenuDivider(),
                    const PopupMenuItem(
                      value: 'delete',
                      child: ListTile(
                        leading: Icon(Icons.delete, color: Colors.red),
                        title: Text('删除', style: TextStyle(color: Colors.red)),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ],
                ],
              ),
          ],
        ),
        
        // 描述
        if (session.description?.isNotEmpty == true) ..[
          const SizedBox(height: 12),
          Text(
            session.description!,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.8),
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
        
        const SizedBox(height: 16),
        
        // 统计信息
        Row(
          children: [
            _buildStatItem(
              theme,
              Icons.people,
              '${session.memberCount ?? 0}',
              '成员',
            ),
            const SizedBox(width: 16),
            _buildStatItem(
              theme,
              Icons.photo_library,
              '${session.stats?.photoCount ?? 0}',
              '照片',
            ),
            const SizedBox(width: 16),
            _buildStatItem(
              theme,
              Icons.access_time,
              AppDateUtils.formatRelativeTime(session.updatedAt),
              '更新',
            ),
          ],
        ),
        
        // 操作按钮
        if (showActions && (onJoin != null || onLeave != null)) ..[
          const SizedBox(height: 16),
          Row(
            children: [
              if (onJoin != null)
                Expanded(
                  child: CustomButton(
                    text: '加入相册',
                    onPressed: onJoin,
                    icon: Icons.login,
                  ),
                ),
              if (onJoin != null && onLeave != null)
                const SizedBox(width: 12),
              if (onLeave != null)
                Expanded(
                  child: CustomButton(
                    text: '离开相册',
                    onPressed: onLeave,
                    icon: Icons.logout,
                    isOutlined: true,
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
  
  Widget _buildSessionAvatar(ThemeData theme) {
    return Container(
      width: isCompact ? 40 : 56,
      height: isCompact ? 40 : 56,
      decoration: BoxDecoration(
        color: session.coverUrl != null 
            ? null 
            : theme.colorScheme.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(isCompact ? 8 : 12),
        image: session.coverUrl != null
            ? DecorationImage(
                image: NetworkImage(session.coverUrl!),
                fit: BoxFit.cover,
              )
            : null,
      ),
      child: session.coverUrl == null
          ? Icon(
              Icons.group,
              size: isCompact ? 20 : 28,
              color: theme.colorScheme.primary,
            )
          : null,
    );
  }
  
  Widget _buildStatusChip(ThemeData theme) {
    Color chipColor;
    String statusText;
    
    switch (session.status) {
      case SessionStatus.active:
        chipColor = Colors.green;
        statusText = '活跃';
        break;
      case SessionStatus.inactive:
        chipColor = Colors.orange;
        statusText = '不活跃';
        break;
      case SessionStatus.archived:
        chipColor = Colors.grey;
        statusText = '已归档';
        break;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: chipColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: chipColor.withOpacity(0.3),
        ),
      ),
      child: Text(
        statusText,
        style: theme.textTheme.bodySmall?.copyWith(
          color: chipColor,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
  
  Widget _buildStatItem(
    ThemeData theme,
    IconData icon,
    String value,
    String label,
  ) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 16,
          color: theme.colorScheme.onSurface.withOpacity(0.6),
        ),
        const SizedBox(width: 4),
        Text(
          value,
          style: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: theme.colorScheme.onSurface.withOpacity(0.8),
          ),
        ),
        const SizedBox(width: 2),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.6),
          ),
        ),
      ],
    );
  }
  
  Widget _buildActionButton(ThemeData theme) {
    if (onJoin != null) {
      return CustomIconButton(
        icon: Icons.login,
        onPressed: onJoin,
        tooltip: '加入相册',
        backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
        iconColor: theme.colorScheme.primary,
      );
    }
    
    if (onLeave != null) {
      return CustomIconButton(
        icon: Icons.logout,
        onPressed: onLeave,
        tooltip: '离开相册',
        backgroundColor: theme.colorScheme.error.withOpacity(0.1),
        iconColor: theme.colorScheme.error,
      );
    }
    
    return const SizedBox.shrink();
  }
  
  void _handleMenuAction(String action) {
    switch (action) {
      case 'edit':
        onEdit?.call();
        break;
      case 'join':
        onJoin?.call();
        break;
      case 'leave':
        onLeave?.call();
        break;
      case 'delete':
        onDelete?.call();
        break;
    }
  }
}

// 相册列表项组件
class SessionListTile extends StatelessWidget {
  final Session session;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool selected;
  
  const SessionListTile({
    super.key,
    required this.session,
    this.onTap,
    this.trailing,
    this.selected = false,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return ListTile(
      onTap: onTap,
      selected: selected,
      leading: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: session.coverUrl != null 
              ? null 
              : theme.colorScheme.primary.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          image: session.coverUrl != null
              ? DecorationImage(
                  image: NetworkImage(session.coverUrl!),
                  fit: BoxFit.cover,
                )
              : null,
        ),
        child: session.coverUrl == null
            ? Icon(
                Icons.group,
                color: theme.colorScheme.primary,
              )
            : null,
      ),
      title: Text(
        session.name,
        style: theme.textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w600,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (session.description?.isNotEmpty == true)
            Text(
              session.description!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          const SizedBox(height: 2),
          Row(
            children: [
              Icon(
                Icons.people,
                size: 12,
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
              const SizedBox(width: 4),
              Text(
                '${session.memberCount ?? 0} 成员',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '•',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                AppDateUtils.formatRelativeTime(session.updatedAt),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
            ],
          ),
        ],
      ),
      trailing: trailing,
    );
  }
}