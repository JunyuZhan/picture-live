import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:crypto/crypto.dart';

class ImageUtils {
  static const int maxImageSize = 2048;
  static const int thumbnailSize = 300;
  static const int avatarSize = 200;
  static const double defaultQuality = 0.85;

  /// 压缩图片
  static Future<File> compressImage(
    File imageFile, {
    int? maxWidth,
    int? maxHeight,
    double quality = defaultQuality,
  }) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final image = img.decodeImage(bytes);
      
      if (image == null) {
        throw Exception('无法解码图片');
      }

      // 计算新的尺寸
      final targetWidth = maxWidth ?? maxImageSize;
      final targetHeight = maxHeight ?? maxImageSize;
      
      img.Image resizedImage;
      if (image.width > targetWidth || image.height > targetHeight) {
        resizedImage = img.copyResize(
          image,
          width: targetWidth,
          height: targetHeight,
          interpolation: img.Interpolation.linear,
        );
      } else {
        resizedImage = image;
      }

      // 压缩并保存
      final compressedBytes = img.encodeJpg(
        resizedImage,
        quality: (quality * 100).round(),
      );

      // 创建临时文件
      final tempDir = await getTemporaryDirectory();
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_compressed.jpg';
      final compressedFile = File(path.join(tempDir.path, fileName));
      
      await compressedFile.writeAsBytes(compressedBytes);
      return compressedFile;
    } catch (e) {
      throw Exception('压缩图片失败: $e');
    }
  }

  /// 生成缩略图
  static Future<File> generateThumbnail(
    File imageFile, {
    int size = thumbnailSize,
  }) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final image = img.decodeImage(bytes);
      
      if (image == null) {
        throw Exception('无法解码图片');
      }

      // 生成正方形缩略图
      final thumbnail = img.copyResizeCropSquare(image, size: size);
      final thumbnailBytes = img.encodeJpg(thumbnail, quality: 80);

      // 保存缩略图
      final tempDir = await getTemporaryDirectory();
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_thumb.jpg';
      final thumbnailFile = File(path.join(tempDir.path, fileName));
      
      await thumbnailFile.writeAsBytes(thumbnailBytes);
      return thumbnailFile;
    } catch (e) {
      throw Exception('生成缩略图失败: $e');
    }
  }

  /// 生成头像
  static Future<File> generateAvatar(
    File imageFile, {
    int size = avatarSize,
  }) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final image = img.decodeImage(bytes);
      
      if (image == null) {
        throw Exception('无法解码图片');
      }

      // 生成圆形头像
      final avatar = img.copyResizeCropSquare(image, size: size);
      final avatarBytes = img.encodeJpg(avatar, quality: 90);

      // 保存头像
      final tempDir = await getTemporaryDirectory();
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_avatar.jpg';
      final avatarFile = File(path.join(tempDir.path, fileName));
      
      await avatarFile.writeAsBytes(avatarBytes);
      return avatarFile;
    } catch (e) {
      throw Exception('生成头像失败: $e');
    }
  }

  /// 获取图片信息
  static Future<ImageInfo> getImageInfo(File imageFile) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final image = img.decodeImage(bytes);
      
      if (image == null) {
        throw Exception('无法解码图片');
      }

      final fileSize = await imageFile.length();
      
      return ImageInfo(
        width: image.width,
        height: image.height,
        fileSize: fileSize,
        format: _getImageFormat(imageFile.path),
        aspectRatio: image.width / image.height,
      );
    } catch (e) {
      throw Exception('获取图片信息失败: $e');
    }
  }

  /// 计算图片哈希值
  static Future<String> calculateImageHash(File imageFile) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final digest = md5.convert(bytes);
      return digest.toString();
    } catch (e) {
      throw Exception('计算图片哈希失败: $e');
    }
  }

  /// 旋转图片
  static Future<File> rotateImage(
    File imageFile,
    int degrees,
  ) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final image = img.decodeImage(bytes);
      
      if (image == null) {
        throw Exception('无法解码图片');
      }

      img.Image rotatedImage;
      switch (degrees) {
        case 90:
          rotatedImage = img.copyRotate(image, angle: 90);
          break;
        case 180:
          rotatedImage = img.copyRotate(image, angle: 180);
          break;
        case 270:
          rotatedImage = img.copyRotate(image, angle: 270);
          break;
        default:
          rotatedImage = image;
      }

      final rotatedBytes = img.encodeJpg(rotatedImage, quality: 90);

      // 保存旋转后的图片
      final tempDir = await getTemporaryDirectory();
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_rotated.jpg';
      final rotatedFile = File(path.join(tempDir.path, fileName));
      
      await rotatedFile.writeAsBytes(rotatedBytes);
      return rotatedFile;
    } catch (e) {
      throw Exception('旋转图片失败: $e');
    }
  }

  /// 裁剪图片
  static Future<File> cropImage(
    File imageFile, {
    required int x,
    required int y,
    required int width,
    required int height,
  }) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final image = img.decodeImage(bytes);
      
      if (image == null) {
        throw Exception('无法解码图片');
      }

      final croppedImage = img.copyCrop(
        image,
        x: x,
        y: y,
        width: width,
        height: height,
      );

      final croppedBytes = img.encodeJpg(croppedImage, quality: 90);

      // 保存裁剪后的图片
      final tempDir = await getTemporaryDirectory();
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_cropped.jpg';
      final croppedFile = File(path.join(tempDir.path, fileName));
      
      await croppedFile.writeAsBytes(croppedBytes);
      return croppedFile;
    } catch (e) {
      throw Exception('裁剪图片失败: $e');
    }
  }

  /// 添加水印
  static Future<File> addWatermark(
    File imageFile,
    String watermarkText, {
    WatermarkPosition position = WatermarkPosition.bottomRight,
    Color textColor = Colors.white,
    double fontSize = 16.0,
    double opacity = 0.7,
  }) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final image = img.decodeImage(bytes);
      
      if (image == null) {
        throw Exception('无法解码图片');
      }

      // 使用 img 库添加文字水印
      final watermarkedImage = img.drawString(
        image,
        watermarkText,
        font: img.arial14,
        x: _getWatermarkX(image.width, position),
        y: _getWatermarkY(image.height, position),
        color: img.ColorRgb8(
          (textColor.red * 255).round(),
          (textColor.green * 255).round(),
          (textColor.blue * 255).round(),
        ),
      );

      final watermarkedBytes = img.encodeJpg(watermarkedImage, quality: 90);

      // 保存带水印的图片
      final tempDir = await getTemporaryDirectory();
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_watermarked.jpg';
      final watermarkedFile = File(path.join(tempDir.path, fileName));
      
      await watermarkedFile.writeAsBytes(watermarkedBytes);
      return watermarkedFile;
    } catch (e) {
      throw Exception('添加水印失败: $e');
    }
  }

  /// 从 Widget 生成图片
  static Future<File> captureWidget(
    GlobalKey key, {
    double pixelRatio = 1.0,
  }) async {
    try {
      final RenderRepaintBoundary boundary =
          key.currentContext!.findRenderObject() as RenderRepaintBoundary;
      
      final ui.Image image = await boundary.toImage(
        pixelRatio: pixelRatio,
      );
      
      final ByteData? byteData = await image.toByteData(
        format: ui.ImageByteFormat.png,
      );
      
      if (byteData == null) {
        throw Exception('无法生成图片数据');
      }

      final bytes = byteData.buffer.asUint8List();

      // 保存截图
      final tempDir = await getTemporaryDirectory();
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_capture.png';
      final captureFile = File(path.join(tempDir.path, fileName));
      
      await captureFile.writeAsBytes(bytes);
      return captureFile;
    } catch (e) {
      throw Exception('截图失败: $e');
    }
  }

  /// 验证图片文件
  static bool isValidImageFile(String filePath) {
    final extension = path.extension(filePath).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        .contains(extension);
  }

  /// 获取图片格式
  static String _getImageFormat(String filePath) {
    final extension = path.extension(filePath).toLowerCase();
    switch (extension) {
      case '.jpg':
      case '.jpeg':
        return 'JPEG';
      case '.png':
        return 'PNG';
      case '.gif':
        return 'GIF';
      case '.bmp':
        return 'BMP';
      case '.webp':
        return 'WebP';
      default:
        return 'Unknown';
    }
  }

  /// 获取水印 X 坐标
  static int _getWatermarkX(int imageWidth, WatermarkPosition position) {
    switch (position) {
      case WatermarkPosition.topLeft:
      case WatermarkPosition.bottomLeft:
        return 10;
      case WatermarkPosition.topRight:
      case WatermarkPosition.bottomRight:
        return imageWidth - 100;
      case WatermarkPosition.center:
        return imageWidth ~/ 2 - 50;
    }
  }

  /// 获取水印 Y 坐标
  static int _getWatermarkY(int imageHeight, WatermarkPosition position) {
    switch (position) {
      case WatermarkPosition.topLeft:
      case WatermarkPosition.topRight:
        return 10;
      case WatermarkPosition.bottomLeft:
      case WatermarkPosition.bottomRight:
        return imageHeight - 30;
      case WatermarkPosition.center:
        return imageHeight ~/ 2;
    }
  }

  /// 清理临时图片文件
  static Future<void> cleanupTempImages() async {
    try {
      final tempDir = await getTemporaryDirectory();
      final files = tempDir.listSync();
      
      for (final file in files) {
        if (file is File) {
          final fileName = path.basename(file.path);
          if (fileName.contains('_compressed') ||
              fileName.contains('_thumb') ||
              fileName.contains('_avatar') ||
              fileName.contains('_rotated') ||
              fileName.contains('_cropped') ||
              fileName.contains('_watermarked') ||
              fileName.contains('_capture')) {
            try {
              await file.delete();
            } catch (e) {
              // 忽略删除失败的文件
            }
          }
        }
      }
    } catch (e) {
      // 忽略清理失败
    }
  }

  /// 格式化文件大小
  static String formatFileSize(int bytes) {
    if (bytes < 1024) {
      return '$bytes B';
    } else if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } else {
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
  }

  /// 计算合适的显示尺寸
  static Size calculateDisplaySize(
    int originalWidth,
    int originalHeight,
    double maxWidth,
    double maxHeight,
  ) {
    final aspectRatio = originalWidth / originalHeight;
    
    double displayWidth = maxWidth;
    double displayHeight = maxWidth / aspectRatio;
    
    if (displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = maxHeight * aspectRatio;
    }
    
    return Size(displayWidth, displayHeight);
  }
}

/// 图片信息类
class ImageInfo {
  final int width;
  final int height;
  final int fileSize;
  final String format;
  final double aspectRatio;

  const ImageInfo({
    required this.width,
    required this.height,
    required this.fileSize,
    required this.format,
    required this.aspectRatio,
  });

  @override
  String toString() {
    return 'ImageInfo(width: $width, height: $height, fileSize: ${ImageUtils.formatFileSize(fileSize)}, format: $format, aspectRatio: ${aspectRatio.toStringAsFixed(2)})';
  }
}

/// 水印位置枚举
enum WatermarkPosition {
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  center,
}