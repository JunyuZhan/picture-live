import 'package:flutter/material.dart';
import '../../core/models/photo.dart';
import '../../core/utils/date_utils.dart';
import 'custom_button.dart';

class PhotoCard extends StatelessWidget {
  final Photo photo;
  final VoidCallback? onTap;
  final VoidCallback? onLike;
  final VoidCallback? onDownload;
  final VoidCallback? onShare;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final bool showActions;
  final bool isCompact;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? padding;
  final double? aspectRatio;
  
  const PhotoCard({
    super.key,
    required this.photo,
    this.onTap,
    this.onLike,
    this.onDownload,
    this.onShare,
    this.onEdit,
    this.onDelete,
    this.showActions = false,
    this.isCompact = false,
    this.margin,
    this.padding,
    this.aspectRatio,
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
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 照片图片
              _buildPhotoImage(theme),
              
              // 照片信息
              if (!isCompact)
                Padding(
                  padding: padding ?? const EdgeInsets.all(12),
                  child: _buildPhotoInfo(theme),
                ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildPhotoImage(ThemeData theme) {
    return Stack(
      children: [
        // 主图片
        AspectRatio(
          aspectRatio: aspectRatio ?? (isCompact ? 1.0 : 4/3),
          child: Container(
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceVariant,
            ),
            child: photo.urls.thumbnail != null
                ? Image.network(
                    photo.urls.thumbnail!,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    errorBuilder: (context, error, stackTrace) {
                      return _buildErrorPlaceholder(theme);
                    },
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;
                      return _buildLoadingPlaceholder(theme, loadingProgress);
                    },
                  )
                : _buildPlaceholder(theme),
          ),
        ),
        
        // 状态标识
        if (photo.status != PhotoStatus.active)
          Positioned(
            top: 8,
            left: 8,
            child: _buildStatusChip(theme),
          ),
        
        // 质量标识
        if (photo.quality != null)
          Positioned(
            top: 8,
            right: 8,
            child: _buildQualityChip(theme),
          ),
        
        // 操作按钮覆盖层
        if (showActions)
          Positioned.fill(
            child: _buildActionOverlay(theme),
          ),
        
        // 点赞按钮
        if (onLike != null)
          Positioned(
            bottom: 8,
            right: 8,
            child: _buildLikeButton(theme),
          ),
      ],
    );
  }
  
  Widget _buildPhotoInfo(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 标题和描述
        if (photo.title?.isNotEmpty == true) ..[
          Text(
            photo.title!,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
        ],
        
        if (photo.description?.isNotEmpty == true) ..[
          Text(
            photo.description!,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.8),
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
        ],
        
        // 统计信息
        Row(
          children: [
            _buildStatItem(
              theme,
              Icons.favorite,
              '${photo.stats?.likeCount ?? 0}',
            ),
            const SizedBox(width: 16),
            _buildStatItem(
              theme,
              Icons.download,
              '${photo.stats?.downloadCount ?? 0}',
            ),
            const SizedBox(width: 16),
            _buildStatItem(
              theme,
              Icons.visibility,
              '${photo.stats?.viewCount ?? 0}',
            ),
            const Spacer(),
            Text(
              AppDateUtils.formatRelativeTime(photo.createdAt),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
          ],
        ),
        
        // 操作按钮
        if (showActions) ..[
          const SizedBox(height: 12),
          _buildActionButtons(theme),
        ],
      ],
    );
  }
  
  Widget _buildPlaceholder(ThemeData theme) {
    return Container(
      width: double.infinity,
      color: theme.colorScheme.surfaceVariant,
      child: Icon(
        Icons.image,
        size: 48,
        color: theme.colorScheme.onSurfaceVariant,
      ),
    );
  }
  
  Widget _buildErrorPlaceholder(ThemeData theme) {
    return Container(
      width: double.infinity,
      color: theme.colorScheme.errorContainer,
      child: Icon(
        Icons.broken_image,
        size: 48,
        color: theme.colorScheme.onErrorContainer,
      ),
    );
  }
  
  Widget _buildLoadingPlaceholder(ThemeData theme, ImageChunkEvent progress) {
    return Container(
      width: double.infinity,
      color: theme.colorScheme.surfaceVariant,
      child: Center(
        child: CircularProgressIndicator(
          value: progress.expectedTotalBytes != null
              ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes!
              : null,
        ),
      ),
    );
  }
  
  Widget _buildStatusChip(ThemeData theme) {
    Color chipColor;
    String statusText;
    IconData icon;
    
    switch (photo.status) {
      case PhotoStatus.active:
        return const SizedBox.shrink();
      case PhotoStatus.processing:
        chipColor = Colors.orange;
        statusText = '处理中';
        icon = Icons.hourglass_empty;
        break;
      case PhotoStatus.failed:
        chipColor = Colors.red;
        statusText = '失败';
        icon = Icons.error;
        break;
      case PhotoStatus.deleted:
        chipColor = Colors.grey;
        statusText = '已删除';
        icon = Icons.delete;
        break;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: chipColor.withOpacity(0.9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 12,
            color: Colors.white,
          ),
          const SizedBox(width: 4),
          Text(
            statusText,
            style: theme.textTheme.bodySmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildQualityChip(ThemeData theme) {
    Color chipColor;
    String qualityText;
    
    switch (photo.quality!) {
      case PhotoQuality.low:
        chipColor = Colors.red;
        qualityText = '低';
        break;
      case PhotoQuality.medium:
        chipColor = Colors.orange;
        qualityText = '中';
        break;
      case PhotoQuality.high:
        chipColor = Colors.green;
        qualityText = '高';
        break;
      case PhotoQuality.original:
        chipColor = Colors.blue;
        qualityText = '原图';
        break;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: chipColor.withOpacity(0.9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        qualityText,
        style: theme.textTheme.bodySmall?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w500,
          fontSize: 10,
        ),
      ),
    );
  }
  
  Widget _buildActionOverlay(ThemeData theme) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.transparent,
            Colors.black.withOpacity(0.3),
          ],
        ),
      ),
      child: Align(
        alignment: Alignment.topRight,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: PopupMenuButton<String>(
            onSelected: _handleMenuAction,
            icon: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.5),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.more_vert,
                color: Colors.white,
                size: 16,
              ),
            ),
            itemBuilder: (context) => [
              if (onDownload != null)
                const PopupMenuItem(
                  value: 'download',
                  child: ListTile(
                    leading: Icon(Icons.download),
                    title: Text('下载'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              if (onShare != null)
                const PopupMenuItem(
                  value: 'share',
                  child: ListTile(
                    leading: Icon(Icons.share),
                    title: Text('分享'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              if (onEdit != null)
                const PopupMenuItem(
                  value: 'edit',
                  child: ListTile(
                    leading: Icon(Icons.edit),
                    title: Text('编辑'),
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
        ),
      ),
    );
  }
  
  Widget _buildLikeButton(ThemeData theme) {
    final isLiked = photo.stats?.isLiked ?? false;
    
    return GestureDetector(
      onTap: onLike,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.5),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isLiked ? Icons.favorite : Icons.favorite_border,
              color: isLiked ? Colors.red : Colors.white,
              size: 16,
            ),
            if (photo.stats?.likeCount != null && photo.stats!.likeCount! > 0) ..[
              const SizedBox(width: 4),
              Text(
                '${photo.stats!.likeCount}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
  
  Widget _buildStatItem(ThemeData theme, IconData icon, String value) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 14,
          color: theme.colorScheme.onSurface.withOpacity(0.6),
        ),
        const SizedBox(width: 4),
        Text(
          value,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.6),
          ),
        ),
      ],
    );
  }
  
  Widget _buildActionButtons(ThemeData theme) {
    return Row(
      children: [
        if (onDownload != null)
          Expanded(
            child: CustomButton(
              text: '下载',
              onPressed: onDownload,
              icon: Icons.download,
              isOutlined: true,
              size: ButtonSize.small,
            ),
          ),
        if (onDownload != null && onShare != null)
          const SizedBox(width: 8),
        if (onShare != null)
          Expanded(
            child: CustomButton(
              text: '分享',
              onPressed: onShare,
              icon: Icons.share,
              size: ButtonSize.small,
            ),
          ),
      ],
    );
  }
  
  void _handleMenuAction(String action) {
    switch (action) {
      case 'download':
        onDownload?.call();
        break;
      case 'share':
        onShare?.call();
        break;
      case 'edit':
        onEdit?.call();
        break;
      case 'delete':
        onDelete?.call();
        break;
    }
  }
}

// 照片网格项组件
class PhotoGridItem extends StatelessWidget {
  final Photo photo;
  final VoidCallback? onTap;
  final VoidCallback? onLike;
  final bool showOverlay;
  final double aspectRatio;
  
  const PhotoGridItem({
    super.key,
    required this.photo,
    this.onTap,
    this.onLike,
    this.showOverlay = true,
    this.aspectRatio = 1.0,
  });
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return GestureDetector(
      onTap: onTap,
      child: AspectRatio(
        aspectRatio: aspectRatio,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            color: theme.colorScheme.surfaceVariant,
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // 照片图片
              if (photo.urls.thumbnail != null)
                Image.network(
                  photo.urls.thumbnail!,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Icon(
                      Icons.broken_image,
                      color: theme.colorScheme.onSurfaceVariant,
                    );
                  },
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Center(
                      child: CircularProgressIndicator(
                        value: loadingProgress.expectedTotalBytes != null
                            ? loadingProgress.cumulativeBytesLoaded / 
                              loadingProgress.expectedTotalBytes!
                            : null,
                      ),
                    );
                  },
                )
              else
                Icon(
                  Icons.image,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              
              // 覆盖层信息
              if (showOverlay)
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withOpacity(0.5),
                        ],
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 状态标识
                          if (photo.status != PhotoStatus.active)
                            Align(
                              alignment: Alignment.topLeft,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.red.withOpacity(0.9),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  photo.status.name,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: Colors.white,
                                    fontSize: 10,
                                  ),
                                ),
                              ),
                            ),
                          
                          const Spacer(),
                          
                          // 底部信息
                          Row(
                            children: [
                              if (photo.stats?.likeCount != null && 
                                  photo.stats!.likeCount! > 0) ..[
                                Icon(
                                  Icons.favorite,
                                  size: 12,
                                  color: Colors.white,
                                ),
                                const SizedBox(width: 2),
                                Text(
                                  '${photo.stats!.likeCount}',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: Colors.white,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                              
                              const Spacer(),
                              
                              if (onLike != null)
                                GestureDetector(
                                  onTap: onLike,
                                  child: Icon(
                                    photo.stats?.isLiked == true
                                        ? Icons.favorite
                                        : Icons.favorite_border,
                                    size: 16,
                                    color: photo.stats?.isLiked == true
                                        ? Colors.red
                                        : Colors.white,
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// 照片列表项组件
class PhotoListTile extends StatelessWidget {
  final Photo photo;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool selected;
  
  const PhotoListTile({
    super.key,
    required this.photo,
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
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          color: theme.colorScheme.surfaceVariant,
        ),
        clipBehavior: Clip.antiAlias,
        child: photo.urls.thumbnail != null
            ? Image.network(
                photo.urls.thumbnail!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Icon(
                    Icons.broken_image,
                    color: theme.colorScheme.onSurfaceVariant,
                  );
                },
              )
            : Icon(
                Icons.image,
                color: theme.colorScheme.onSurfaceVariant,
              ),
      ),
      title: Text(
        photo.title ?? '未命名照片',
        style: theme.textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w600,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (photo.description?.isNotEmpty == true)
            Text(
              photo.description!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          const SizedBox(height: 2),
          Row(
            children: [
              Icon(
                Icons.favorite,
                size: 12,
                color: theme.colorScheme.onSurface.withOpacity(0.6),
              ),
              const SizedBox(width: 4),
              Text(
                '${photo.stats?.likeCount ?? 0}',
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
                AppDateUtils.formatRelativeTime(photo.createdAt),
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