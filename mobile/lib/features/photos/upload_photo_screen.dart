import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:io';
import '../../core/models/session.dart';
import '../../core/models/photo.dart';
import '../../core/services/photo_service.dart';
import '../../core/services/session_service.dart';
import '../../core/utils/date_utils.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/loading_overlay.dart';
import '../widgets/session_card.dart';

class UploadPhotoScreen extends ConsumerStatefulWidget {
  final String? sessionId;
  final List<String>? imagePaths;

  const UploadPhotoScreen({
    Key? key,
    this.sessionId,
    this.imagePaths,
  }) : super(key: key);

  @override
  ConsumerState<UploadPhotoScreen> createState() => _UploadPhotoScreenState();
}

class _UploadPhotoScreenState extends ConsumerState<UploadPhotoScreen> {
  final ImagePicker _imagePicker = ImagePicker();
  final _descriptionController = TextEditingController();
  final _tagsController = TextEditingController();
  
  List<File> _selectedImages = [];
  Session? _selectedSession;
  List<Session> _availableSessions = [];
  bool _isLoading = false;
  bool _isLoadingSessions = false;
  bool _isPublic = true;
  bool _allowComments = true;
  bool _allowDownload = true;
  bool _includeLocation = false;
  Position? _currentLocation;
  String? _error;
  
  // 上传进度
  Map<int, double> _uploadProgress = {};
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _initializeData();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  Future<void> _initializeData() async {
    // 如果传入了图片路径，直接使用
    if (widget.imagePaths != null) {
      _selectedImages = widget.imagePaths!
          .map((path) => File(path))
          .where((file) => file.existsSync())
          .toList();
    }
    
    // 加载可用相册
    await _loadAvailableSessions();
    
    // 如果指定了相册ID，设置为选中状态
    if (widget.sessionId != null) {
      _selectedSession = _availableSessions
          .where((session) => session.id == widget.sessionId)
          .firstOrNull;
    }
    
    // 获取当前位置
    await _getCurrentLocation();
    
    setState(() {});
  }

  Future<void> _loadAvailableSessions() async {
    try {
      setState(() => _isLoadingSessions = true);
      
      final sessionService = ref.read(sessionServiceProvider);
      final response = await sessionService.getUserSessions(
        ref.read(authProvider).user!.id,
        page: 1,
        limit: 100,
      );
      
      setState(() {
        _availableSessions = response.data
            .where((session) => session.isActive)
            .toList();
        _isLoadingSessions = false;
      });
    } catch (e) {
      setState(() {
        _error = '加载相册列表失败: ${e.toString()}';
        _isLoadingSessions = false;
      });
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final requested = await Geolocator.requestPermission();
        if (requested == LocationPermission.denied) {
          return;
        }
      }
      
      if (permission == LocationPermission.deniedForever) {
        return;
      }
      
      _currentLocation = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 10),
      );
    } catch (e) {
      // 获取位置失败不影响主要功能
    }
  }

  Future<void> _pickImages() async {
    try {
      final permission = await Permission.camera.request();
      if (!permission.isGranted) {
        _showErrorSnackBar('需要相机权限才能选择照片');
        return;
      }
      
      final source = await _showImageSourceDialog();
      if (source == null) return;
      
      List<XFile> images = [];
      
      if (source == ImageSource.camera) {
        final XFile? image = await _imagePicker.pickImage(
          source: ImageSource.camera,
          maxWidth: 2048,
          maxHeight: 2048,
          imageQuality: 85,
        );
        if (image != null) images.add(image);
      } else {
        final List<XFile> selectedImages = await _imagePicker.pickMultiImage(
          maxWidth: 2048,
          maxHeight: 2048,
          imageQuality: 85,
        );
        images = selectedImages;
      }
      
      if (images.isNotEmpty) {
        setState(() {
          _selectedImages.addAll(
            images.map((image) => File(image.path)),
          );
        });
      }
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

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
    });
  }

  Future<void> _selectSession() async {
    final selected = await showDialog<Session>(
      context: context,
      builder: (context) => _SessionSelectionDialog(
        sessions: _availableSessions,
        selectedSession: _selectedSession,
      ),
    );
    
    if (selected != null) {
      setState(() => _selectedSession = selected);
    }
  }

  Future<void> _uploadPhotos() async {
    if (_selectedImages.isEmpty) {
      _showErrorSnackBar('请至少选择一张照片');
      return;
    }
    
    if (_selectedSession == null) {
      _showErrorSnackBar('请选择要上传到的相册');
      return;
    }
    
    try {
      setState(() {
        _isUploading = true;
        _uploadProgress.clear();
      });
      
      final photoService = ref.read(photoServiceProvider);
      final List<String> tags = _tagsController.text
          .split(',')
          .map((tag) => tag.trim())
          .where((tag) => tag.isNotEmpty)
          .toList();
      
      final List<Photo> uploadedPhotos = [];
      
      for (int i = 0; i < _selectedImages.length; i++) {
        final image = _selectedImages[i];
        
        // 更新上传进度
        setState(() => _uploadProgress[i] = 0.0);
        
        final photo = await photoService.uploadPhoto(
          sessionId: _selectedSession!.id,
          imageFile: image,
          description: _descriptionController.text.trim().isEmpty
              ? null
              : _descriptionController.text.trim(),
          tags: tags,
          isPublic: _isPublic,
          allowComments: _allowComments,
          allowDownload: _allowDownload,
          location: _includeLocation && _currentLocation != null
              ? {
                  'latitude': _currentLocation!.latitude,
                  'longitude': _currentLocation!.longitude,
                }
              : null,
          onProgress: (progress) {
            setState(() => _uploadProgress[i] = progress);
          },
        );
        
        uploadedPhotos.add(photo);
        
        // 完成当前照片上传
        setState(() => _uploadProgress[i] = 1.0);
      }
      
      setState(() => _isUploading = false);
      
      _showSuccessSnackBar('成功上传 ${uploadedPhotos.length} 张照片');
      
      // 返回上传结果
      Navigator.pop(context, uploadedPhotos);
    } catch (e) {
      setState(() => _isUploading = false);
      _showErrorSnackBar('上传失败: ${e.toString()}');
    }
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
    return LoadingOverlay(
      isLoading: _isLoading,
      child: Scaffold(
        appBar: CustomAppBar(
          title: '上传照片',
          showBackButton: true,
          actions: [
            if (!_isUploading)
              TextButton(
                onPressed: _selectedImages.isNotEmpty ? _uploadPhotos : null,
                child: const Text('上传'),
              ),
          ],
        ),
        body: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 照片选择区域
                    _buildImageSection(),
                    
                    const SizedBox(height: 24),
                    
                    // 相册选择
                    _buildSessionSection(),
                    
                    const SizedBox(height: 24),
                    
                    // 照片描述
                    _buildDescriptionSection(),
                    
                    const SizedBox(height: 24),
                    
                    // 标签
                    _buildTagsSection(),
                    
                    const SizedBox(height: 24),
                    
                    // 设置选项
                    _buildSettingsSection(),
                    
                    const SizedBox(height: 24),
                    
                    // 位置选项
                    _buildLocationSection(),
                  ],
                ),
              ),
            ),
            
            // 上传进度
            if (_isUploading) _buildUploadProgress(),
            
            // 底部操作按钮
            if (!_isUploading) _buildBottomActions(),
          ],
        ),
      ),
    );
  }

  Widget _buildImageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '选择照片',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton.icon(
              onPressed: _pickImages,
              icon: const Icon(Icons.add_photo_alternate),
              label: const Text('添加照片'),
            ),
          ],
        ),
        
        const SizedBox(height: 12),
        
        if (_selectedImages.isEmpty)
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              border: Border.all(
                color: Colors.grey[300]!,
                style: BorderStyle.solid,
                width: 2,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: InkWell(
              onTap: _pickImages,
              borderRadius: BorderRadius.circular(12),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.add_photo_alternate,
                    size: 64,
                    color: Colors.grey,
                  ),
                  SizedBox(height: 16),
                  Text(
                    '点击选择照片',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          SizedBox(
            height: 120,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _selectedImages.length,
              itemBuilder: (context, index) {
                return Container(
                  margin: const EdgeInsets.only(right: 12),
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          _selectedImages[index],
                          width: 120,
                          height: 120,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
                        child: Container(
                          decoration: const BoxDecoration(
                            color: Colors.black54,
                            shape: BoxShape.circle,
                          ),
                          child: IconButton(
                            icon: const Icon(
                              Icons.close,
                              color: Colors.white,
                              size: 20,
                            ),
                            onPressed: () => _removeImage(index),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildSessionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '选择相册',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        
        const SizedBox(height: 12),
        
        if (_isLoadingSessions)
          const Center(child: CircularProgressIndicator())
        else if (_selectedSession != null)
          Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundImage: _selectedSession!.coverImage != null
                    ? NetworkImage(_selectedSession!.coverImage!)
                    : null,
                child: _selectedSession!.coverImage == null
                    ? const Icon(Icons.group)
                    : null,
              ),
              title: Text(_selectedSession!.name),
              subtitle: Text('${_selectedSession!.memberCount} 成员'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: _selectSession,
            ),
          )
        else
          Card(
            child: ListTile(
              leading: const Icon(Icons.add),
              title: const Text('选择相册'),
              subtitle: const Text('选择要上传照片的相册'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: _selectSession,
            ),
          ),
      ],
    );
  }

  Widget _buildDescriptionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '照片描述',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        
        const SizedBox(height: 12),
        
        MultilineTextField(
          controller: _descriptionController,
          hintText: '为这些照片添加描述（可选）',
          maxLines: 3,
          maxLength: 500,
        ),
      ],
    );
  }

  Widget _buildTagsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '标签',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        
        const SizedBox(height: 12),
        
        CustomTextField(
          controller: _tagsController,
          hintText: '添加标签，用逗号分隔（如：风景,旅行,美食）',
          prefixIcon: Icons.tag,
        ),
      ],
    );
  }

  Widget _buildSettingsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '隐私设置',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        
        const SizedBox(height: 12),
        
        Card(
          child: Column(
            children: [
              SwitchListTile(
                title: const Text('公开照片'),
                subtitle: const Text('其他用户可以看到这些照片'),
                value: _isPublic,
                onChanged: (value) => setState(() => _isPublic = value),
              ),
              SwitchListTile(
                title: const Text('允许评论'),
                subtitle: const Text('其他用户可以评论这些照片'),
                value: _allowComments,
                onChanged: (value) => setState(() => _allowComments = value),
              ),
              SwitchListTile(
                title: const Text('允许下载'),
                subtitle: const Text('其他用户可以下载这些照片'),
                value: _allowDownload,
                onChanged: (value) => setState(() => _allowDownload = value),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLocationSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '位置信息',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        
        const SizedBox(height: 12),
        
        Card(
          child: SwitchListTile(
            title: const Text('包含位置信息'),
            subtitle: Text(
              _currentLocation != null
                  ? '当前位置：${_currentLocation!.latitude.toStringAsFixed(4)}, ${_currentLocation!.longitude.toStringAsFixed(4)}'
                  : '无法获取当前位置',
            ),
            value: _includeLocation && _currentLocation != null,
            onChanged: _currentLocation != null
                ? (value) => setState(() => _includeLocation = value)
                : null,
          ),
        ),
      ],
    );
  }

  Widget _buildUploadProgress() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            '正在上传照片...',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          
          const SizedBox(height: 12),
          
          ...List.generate(_selectedImages.length, (index) {
            final progress = _uploadProgress[index] ?? 0.0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Text('照片 ${index + 1}:'),
                  const SizedBox(width: 12),
                  Expanded(
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: Colors.grey[300],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text('${(progress * 100).toInt()}%'),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildBottomActions() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('取消'),
            ),
          ),
          
          const SizedBox(width: 16),
          
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _selectedImages.isNotEmpty && _selectedSession != null
                  ? _uploadPhotos
                  : null,
              child: Text(
                '上传 ${_selectedImages.length} 张照片',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SessionSelectionDialog extends StatelessWidget {
  final List<Session> sessions;
  final Session? selectedSession;

  const _SessionSelectionDialog({
    required this.sessions,
    this.selectedSession,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('选择相册'),
      content: SizedBox(
        width: double.maxFinite,
        height: 400,
        child: sessions.isEmpty
            ? const Center(
                child: Text('暂无可用相册'),
              )
            : ListView.builder(
                itemCount: sessions.length,
                itemBuilder: (context, index) {
                  final session = sessions[index];
                  final isSelected = selectedSession?.id == session.id;
                  
                  return Card(
                    color: isSelected
                        ? Theme.of(context).primaryColor.withOpacity(0.1)
                        : null,
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundImage: session.coverImage != null
                            ? NetworkImage(session.coverImage!)
                            : null,
                        child: session.coverImage == null
                            ? const Icon(Icons.group)
                            : null,
                      ),
                      title: Text(session.name),
                      subtitle: Text('${session.memberCount} 成员'),
                      trailing: isSelected
                          ? Icon(
                              Icons.check_circle,
                              color: Theme.of(context).primaryColor,
                            )
                          : null,
                      onTap: () => Navigator.pop(context, session),
                    ),
                  );
                },
              ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
      ],
    );
  }
}