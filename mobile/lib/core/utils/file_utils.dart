import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';
import 'package:dio/dio.dart';
import 'package:crypto/crypto.dart';

class FileUtils {
  static const String appFolderName = 'PictureLive';
  static const String photosFolderName = 'Photos';
  static const String cachesFolderName = 'Caches';
  static const String tempFolderName = 'Temp';

  /// 获取应用文档目录
  static Future<Directory> getAppDocumentsDirectory() async {
    final documentsDir = await getApplicationDocumentsDirectory();
    final appDir = Directory(path.join(documentsDir.path, appFolderName));
    
    if (!await appDir.exists()) {
      await appDir.create(recursive: true);
    }
    
    return appDir;
  }

  /// 获取应用缓存目录
  static Future<Directory> getAppCacheDirectory() async {
    final cacheDir = await getTemporaryDirectory();
    final appCacheDir = Directory(path.join(cacheDir.path, appFolderName));
    
    if (!await appCacheDir.exists()) {
      await appCacheDir.create(recursive: true);
    }
    
    return appCacheDir;
  }

  /// 获取照片存储目录
  static Future<Directory> getPhotosDirectory() async {
    final appDir = await getAppDocumentsDirectory();
    final photosDir = Directory(path.join(appDir.path, photosFolderName));
    
    if (!await photosDir.exists()) {
      await photosDir.create(recursive: true);
    }
    
    return photosDir;
  }

  /// 获取缓存目录
  static Future<Directory> getCachesDirectory() async {
    final appCacheDir = await getAppCacheDirectory();
    final cachesDir = Directory(path.join(appCacheDir.path, cachesFolderName));
    
    if (!await cachesDir.exists()) {
      await cachesDir.create(recursive: true);
    }
    
    return cachesDir;
  }

  /// 获取临时目录
  static Future<Directory> getTempDirectory() async {
    final appCacheDir = await getAppCacheDirectory();
    final tempDir = Directory(path.join(appCacheDir.path, tempFolderName));
    
    if (!await tempDir.exists()) {
      await tempDir.create(recursive: true);
    }
    
    return tempDir;
  }

  /// 获取外部存储目录（Android）
  static Future<Directory?> getExternalStorageDirectory() async {
    if (Platform.isAndroid) {
      final status = await Permission.storage.request();
      if (status.isGranted) {
        final externalDir = await getExternalStorageDirectory();
        if (externalDir != null) {
          final appExternalDir = Directory(
            path.join(externalDir.path, appFolderName),
          );
          
          if (!await appExternalDir.exists()) {
            await appExternalDir.create(recursive: true);
          }
          
          return appExternalDir;
        }
      }
    }
    return null;
  }

  /// 保存文件到指定目录
  static Future<File> saveFile(
    Uint8List data,
    String fileName, {
    Directory? directory,
    bool overwrite = false,
  }) async {
    directory ??= await getAppDocumentsDirectory();
    
    final filePath = path.join(directory.path, fileName);
    final file = File(filePath);
    
    if (!overwrite && await file.exists()) {
      throw FileSystemException('文件已存在', filePath);
    }
    
    await file.writeAsBytes(data);
    return file;
  }

  /// 复制文件
  static Future<File> copyFile(
    File sourceFile,
    String targetPath, {
    bool overwrite = false,
  }) async {
    final targetFile = File(targetPath);
    
    if (!overwrite && await targetFile.exists()) {
      throw FileSystemException('目标文件已存在', targetPath);
    }
    
    // 确保目标目录存在
    final targetDir = Directory(path.dirname(targetPath));
    if (!await targetDir.exists()) {
      await targetDir.create(recursive: true);
    }
    
    return await sourceFile.copy(targetPath);
  }

  /// 移动文件
  static Future<File> moveFile(
    File sourceFile,
    String targetPath, {
    bool overwrite = false,
  }) async {
    final targetFile = File(targetPath);
    
    if (!overwrite && await targetFile.exists()) {
      throw FileSystemException('目标文件已存在', targetPath);
    }
    
    // 确保目标目录存在
    final targetDir = Directory(path.dirname(targetPath));
    if (!await targetDir.exists()) {
      await targetDir.create(recursive: true);
    }
    
    return await sourceFile.rename(targetPath);
  }

  /// 删除文件
  static Future<void> deleteFile(String filePath) async {
    final file = File(filePath);
    if (await file.exists()) {
      await file.delete();
    }
  }

  /// 删除目录
  static Future<void> deleteDirectory(
    String directoryPath, {
    bool recursive = false,
  }) async {
    final directory = Directory(directoryPath);
    if (await directory.exists()) {
      await directory.delete(recursive: recursive);
    }
  }

  /// 获取文件大小
  static Future<int> getFileSize(String filePath) async {
    final file = File(filePath);
    if (await file.exists()) {
      return await file.length();
    }
    return 0;
  }

  /// 获取目录大小
  static Future<int> getDirectorySize(String directoryPath) async {
    final directory = Directory(directoryPath);
    if (!await directory.exists()) {
      return 0;
    }
    
    int totalSize = 0;
    await for (final entity in directory.list(recursive: true)) {
      if (entity is File) {
        try {
          totalSize += await entity.length();
        } catch (e) {
          // 忽略无法访问的文件
        }
      }
    }
    
    return totalSize;
  }

  /// 清空目录
  static Future<void> clearDirectory(String directoryPath) async {
    final directory = Directory(directoryPath);
    if (await directory.exists()) {
      await for (final entity in directory.list()) {
        try {
          if (entity is File) {
            await entity.delete();
          } else if (entity is Directory) {
            await entity.delete(recursive: true);
          }
        } catch (e) {
          // 忽略删除失败的文件
        }
      }
    }
  }

  /// 清理缓存
  static Future<void> clearCache() async {
    try {
      final cacheDir = await getCachesDirectory();
      await clearDirectory(cacheDir.path);
      
      final tempDir = await getTempDirectory();
      await clearDirectory(tempDir.path);
    } catch (e) {
      throw Exception('清理缓存失败: $e');
    }
  }

  /// 获取缓存大小
  static Future<int> getCacheSize() async {
    try {
      final cacheDir = await getCachesDirectory();
      final tempDir = await getTempDirectory();
      
      final cacheSize = await getDirectorySize(cacheDir.path);
      final tempSize = await getDirectorySize(tempDir.path);
      
      return cacheSize + tempSize;
    } catch (e) {
      return 0;
    }
  }

  /// 下载文件
  static Future<File> downloadFile(
    String url,
    String fileName, {
    Directory? directory,
    Function(int received, int total)? onProgress,
    CancelToken? cancelToken,
  }) async {
    directory ??= await getPhotosDirectory();
    
    final filePath = path.join(directory.path, fileName);
    final file = File(filePath);
    
    final dio = Dio();
    
    try {
      await dio.download(
        url,
        filePath,
        onReceiveProgress: onProgress,
        cancelToken: cancelToken,
      );
      
      return file;
    } catch (e) {
      // 如果下载失败，删除可能创建的空文件
      if (await file.exists()) {
        await file.delete();
      }
      throw Exception('下载文件失败: $e');
    }
  }

  /// 分享文件
  static Future<void> shareFile(
    String filePath, {
    String? subject,
    String? text,
  }) async {
    final file = File(filePath);
    if (!await file.exists()) {
      throw FileSystemException('文件不存在', filePath);
    }
    
    await Share.shareXFiles(
      [XFile(filePath)],
      subject: subject,
      text: text,
    );
  }

  /// 分享多个文件
  static Future<void> shareFiles(
    List<String> filePaths, {
    String? subject,
    String? text,
  }) async {
    final xFiles = <XFile>[];
    
    for (final filePath in filePaths) {
      final file = File(filePath);
      if (await file.exists()) {
        xFiles.add(XFile(filePath));
      }
    }
    
    if (xFiles.isEmpty) {
      throw Exception('没有可分享的文件');
    }
    
    await Share.shareXFiles(
      xFiles,
      subject: subject,
      text: text,
    );
  }

  /// 计算文件哈希值
  static Future<String> calculateFileHash(String filePath) async {
    final file = File(filePath);
    if (!await file.exists()) {
      throw FileSystemException('文件不存在', filePath);
    }
    
    final bytes = await file.readAsBytes();
    final digest = md5.convert(bytes);
    return digest.toString();
  }

  /// 检查文件是否存在
  static Future<bool> fileExists(String filePath) async {
    return await File(filePath).exists();
  }

  /// 检查目录是否存在
  static Future<bool> directoryExists(String directoryPath) async {
    return await Directory(directoryPath).exists();
  }

  /// 创建目录
  static Future<Directory> createDirectory(
    String directoryPath, {
    bool recursive = true,
  }) async {
    final directory = Directory(directoryPath);
    return await directory.create(recursive: recursive);
  }

  /// 获取文件扩展名
  static String getFileExtension(String filePath) {
    return path.extension(filePath).toLowerCase();
  }

  /// 获取文件名（不含扩展名）
  static String getFileNameWithoutExtension(String filePath) {
    return path.basenameWithoutExtension(filePath);
  }

  /// 获取文件名（含扩展名）
  static String getFileName(String filePath) {
    return path.basename(filePath);
  }

  /// 获取文件目录
  static String getFileDirectory(String filePath) {
    return path.dirname(filePath);
  }

  /// 生成唯一文件名
  static String generateUniqueFileName(
    String originalName, {
    String? prefix,
    String? suffix,
  }) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final extension = getFileExtension(originalName);
    final nameWithoutExt = getFileNameWithoutExtension(originalName);
    
    final parts = <String>[];
    
    if (prefix != null) parts.add(prefix);
    parts.add(nameWithoutExt);
    parts.add(timestamp.toString());
    if (suffix != null) parts.add(suffix);
    
    return '${parts.join('_')}$extension';
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

  /// 获取文件MIME类型
  static String getMimeType(String filePath) {
    final extension = getFileExtension(filePath);
    
    switch (extension) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.bmp':
        return 'image/bmp';
      case '.webp':
        return 'image/webp';
      case '.mp4':
        return 'video/mp4';
      case '.mov':
        return 'video/quicktime';
      case '.avi':
        return 'video/x-msvideo';
      case '.pdf':
        return 'application/pdf';
      case '.txt':
        return 'text/plain';
      case '.json':
        return 'application/json';
      case '.zip':
        return 'application/zip';
      default:
        return 'application/octet-stream';
    }
  }

  /// 检查是否为图片文件
  static bool isImageFile(String filePath) {
    final extension = getFileExtension(filePath);
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        .contains(extension);
  }

  /// 检查是否为视频文件
  static bool isVideoFile(String filePath) {
    final extension = getFileExtension(filePath);
    return ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv']
        .contains(extension);
  }

  /// 列出目录中的文件
  static Future<List<FileSystemEntity>> listDirectory(
    String directoryPath, {
    bool recursive = false,
    bool filesOnly = false,
    bool directoriesOnly = false,
  }) async {
    final directory = Directory(directoryPath);
    if (!await directory.exists()) {
      return [];
    }
    
    final entities = <FileSystemEntity>[];
    
    await for (final entity in directory.list(recursive: recursive)) {
      if (filesOnly && entity is! File) continue;
      if (directoriesOnly && entity is! Directory) continue;
      
      entities.add(entity);
    }
    
    return entities;
  }

  /// 备份文件
  static Future<File> backupFile(
    String filePath, {
    String? backupSuffix,
  }) async {
    final file = File(filePath);
    if (!await file.exists()) {
      throw FileSystemException('文件不存在', filePath);
    }
    
    final suffix = backupSuffix ?? '.backup';
    final backupPath = '$filePath$suffix';
    
    return await copyFile(file, backupPath, overwrite: true);
  }

  /// 恢复备份文件
  static Future<File> restoreBackup(
    String backupFilePath,
    String targetPath, {
    bool deleteBackup = false,
  }) async {
    final backupFile = File(backupFilePath);
    if (!await backupFile.exists()) {
      throw FileSystemException('备份文件不存在', backupFilePath);
    }
    
    final restoredFile = await copyFile(
      backupFile,
      targetPath,
      overwrite: true,
    );
    
    if (deleteBackup) {
      await backupFile.delete();
    }
    
    return restoredFile;
  }
}