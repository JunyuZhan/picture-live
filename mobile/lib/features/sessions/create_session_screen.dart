import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';
import '../../core/models/session.dart';
import '../../core/services/session_service.dart';
import '../widgets/custom_app_bar.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/loading_overlay.dart';

class CreateSessionScreen extends ConsumerStatefulWidget {
  final Session? sessionToEdit;

  const CreateSessionScreen({
    Key? key,
    this.sessionToEdit,
  }) : super(key: key);

  @override
  ConsumerState<CreateSessionScreen> createState() => _CreateSessionScreenState();
}

class _CreateSessionScreenState extends ConsumerState<CreateSessionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final _tagsController = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  
  bool _isPublic = true;
  bool _isLoading = false;
  File? _coverImage;
  String? _existingCoverImageUrl;
  List<String> _tags = [];
  
  bool get _isEditing => widget.sessionToEdit != null;

  @override
  void initState() {
    super.initState();
    if (_isEditing) {
      _initializeEditData();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  void _initializeEditData() {
    final session = widget.sessionToEdit!;
    _nameController.text = session.name;
    _descriptionController.text = session.description ?? '';
    _locationController.text = session.location ?? '';
    _isPublic = session.isPublic;
    _existingCoverImageUrl = session.coverImage;
    _tags = session.tags ?? [];
    _tagsController.text = _tags.join(', ');
  }

  Future<void> _pickCoverImage() async {
    try {
      // 检查权限
      final permission = await Permission.camera.request();
      if (!permission.isGranted) {
        _showErrorSnackBar('需要相机权限才能选择封面图片');
        return;
      }
      
      // 显示选择对话框
      final source = await _showImageSourceDialog();
      if (source == null) return;
      
      final XFile? image = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      
      if (image != null) {
        setState(() {
          _coverImage = File(image.path);
          _existingCoverImageUrl = null; // 清除现有图片
        });
      }
    } catch (e) {
      _showErrorSnackBar('选择图片失败: ${e.toString()}');
    }
  }

  Future<ImageSource?> _showImageSourceDialog() async {
    return showDialog<ImageSource>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('选择图片来源'),
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

  void _removeCoverImage() {
    setState(() {
      _coverImage = null;
      _existingCoverImageUrl = null;
    });
  }

  void _updateTags(String value) {
    final tags = value
        .split(',')
        .map((tag) => tag.trim())
        .where((tag) => tag.isNotEmpty)
        .toList();
    setState(() => _tags = tags);
  }

  Future<void> _saveSession() async {
    if (!_formKey.currentState!.validate()) return;
    
    try {
      setState(() => _isLoading = true);
      
      final sessionService = ref.read(sessionServiceProvider);
      
      if (_isEditing) {
        // 更新相册
        await sessionService.updateSession(
          sessionId: widget.sessionToEdit!.id,
          name: _nameController.text.trim(),
          description: _descriptionController.text.trim().isEmpty 
              ? null 
              : _descriptionController.text.trim(),
          isPublic: _isPublic,
          location: _locationController.text.trim().isEmpty 
              ? null 
              : _locationController.text.trim(),
          tags: _tags.isEmpty ? null : _tags,
          coverImage: _coverImage,
        );
        
        _showSuccessSnackBar('相册更新成功');
      } else {
        // 创建新相册
        final session = await sessionService.createSession(
          name: _nameController.text.trim(),
          description: _descriptionController.text.trim().isEmpty 
              ? null 
              : _descriptionController.text.trim(),
          isPublic: _isPublic,
          location: _locationController.text.trim().isEmpty 
              ? null 
              : _locationController.text.trim(),
          tags: _tags.isEmpty ? null : _tags,
          coverImage: _coverImage,
        );
        
        _showSuccessSnackBar('相册创建成功');
        
        // 导航到相册详情页面
        Navigator.pushReplacementNamed(
          context,
          '/session-detail',
          arguments: {
            'sessionId': session.id,
            'session': session,
          },
        );
        return;
      }
      
      Navigator.pop(context, true); // 返回并标记成功
    } catch (e) {
      _showErrorSnackBar('${_isEditing ? "更新" : "创建"}失败: ${e.toString()}');
    } finally {
      setState(() => _isLoading = false);
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
    return Scaffold(
      appBar: CustomAppBar(
        title: _isEditing ? '编辑相册' : '创建相册',
        showBackButton: true,
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _saveSession,
            child: Text(
              _isEditing ? '保存' : '创建',
              style: TextStyle(
                color: _isLoading 
                    ? Colors.grey 
                    : Theme.of(context).primaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 封面图片
                _buildCoverImageSection(),
                
                const SizedBox(height: 24),
                
                // 基本信息
                _buildBasicInfoSection(),
                
                const SizedBox(height: 24),
                
                // 相册设置
                _buildSettingsSection(),
                
                const SizedBox(height: 24),
                
                // 位置和标签
                _buildLocationAndTagsSection(),
                
                const SizedBox(height: 32),
                
                // 创建按钮（移动端）
                if (MediaQuery.of(context).size.width < 600)
                  SizedBox(
                    width: double.infinity,
                    child: CustomButton(
                      text: _isEditing ? '保存更改' : '创建相册',
                      onPressed: _isLoading ? null : _saveSession,
                      isLoading: _isLoading,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCoverImageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '封面图片',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        
        Container(
          width: double.infinity,
          height: 200,
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[300]!),
          ),
          child: _coverImage != null || _existingCoverImageUrl != null
              ? Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(11),
                      child: _coverImage != null
                          ? Image.file(
                              _coverImage!,
                              width: double.infinity,
                              height: double.infinity,
                              fit: BoxFit.cover,
                            )
                          : Image.network(
                              _existingCoverImageUrl!,
                              width: double.infinity,
                              height: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  color: Colors.grey[300],
                                  child: const Icon(
                                    Icons.error,
                                    size: 64,
                                    color: Colors.grey,
                                  ),
                                );
                              },
                            ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.6),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: IconButton(
                          icon: const Icon(
                            Icons.close,
                            color: Colors.white,
                            size: 20,
                          ),
                          onPressed: _removeCoverImage,
                        ),
                      ),
                    ),
                  ],
                )
              : InkWell(
                  onTap: _pickCoverImage,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: double.infinity,
                    height: double.infinity,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.add_photo_alternate_outlined,
                          size: 48,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '点击添加封面图片',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '建议尺寸: 1024x1024',
                          style: TextStyle(
                            color: Colors.grey[500],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        ),
        
        if (_coverImage == null && _existingCoverImageUrl == null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              children: [
                TextButton.icon(
                  onPressed: _pickCoverImage,
                  icon: const Icon(Icons.add_photo_alternate),
                  label: const Text('选择图片'),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildBasicInfoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '基本信息',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 16),
        
        CustomTextField(
          controller: _nameController,
          labelText: '相册名称',
          hintText: '输入相册名称',
          prefixIcon: Icons.title,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return '请输入相册名称';
            }
            if (value.trim().length < 2) {
              return '相册名称至少需要2个字符';
            }
            if (value.trim().length > 50) {
              return '相册名称不能超过50个字符';
            }
            return null;
          },
        ),
        
        const SizedBox(height: 16),
        
        MultilineTextField(
          controller: _descriptionController,
          labelText: '相册描述',
          hintText: '描述这个相册的目的和内容（可选）',
          prefixIcon: Icons.description,
          maxLines: 4,
          maxLength: 500,
          validator: (value) {
            if (value != null && value.trim().length > 500) {
              return '描述不能超过500个字符';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildSettingsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '相册设置',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 16),
        
        Card(
          child: Column(
            children: [
              SwitchListTile(
                title: const Text('公开相册'),
                subtitle: Text(
                  _isPublic 
                      ? '任何人都可以发现并加入这个相册' 
                      : '只有受邀请的人才能加入这个相册',
                ),
                value: _isPublic,
                onChanged: (value) {
                  setState(() => _isPublic = value);
                },
                secondary: Icon(
                  _isPublic ? Icons.public : Icons.lock,
                  color: Theme.of(context).primaryColor,
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 12),
        
        // 设置说明
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue[50],
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.blue[200]!),
          ),
          child: Row(
            children: [
              Icon(
                Icons.info_outline,
                color: Colors.blue[700],
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '公开相册会出现在相册列表中，私密相册需要邀请链接才能加入。',
                  style: TextStyle(
                    color: Colors.blue[700],
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLocationAndTagsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '附加信息',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 16),
        
        CustomTextField(
          controller: _locationController,
          labelText: '位置',
          hintText: '输入位置信息（可选）',
          prefixIcon: Icons.location_on,
          validator: (value) {
            if (value != null && value.trim().length > 100) {
              return '位置信息不能超过100个字符';
            }
            return null;
          },
        ),
        
        const SizedBox(height: 16),
        
        CustomTextField(
          controller: _tagsController,
          labelText: '标签',
          hintText: '输入标签，用逗号分隔（可选）',
          prefixIcon: Icons.tag,
          onChanged: _updateTags,
          validator: (value) {
            if (value != null && _tags.length > 10) {
              return '标签数量不能超过10个';
            }
            return null;
          },
        ),
        
        if (_tags.isNotEmpty) ..[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _tags.map((tag) {
              return Chip(
                label: Text(tag),
                backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                side: BorderSide(
                  color: Theme.of(context).primaryColor.withOpacity(0.3),
                ),
                onDeleted: () {
                  setState(() {
                    _tags.remove(tag);
                    _tagsController.text = _tags.join(', ');
                  });
                },
              );
            }).toList(),
          ),
        ],
        
        const SizedBox(height: 12),
        
        Text(
          '标签可以帮助其他用户更容易找到你的相册',
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}