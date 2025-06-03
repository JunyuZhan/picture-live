import 'dart:io';

class ValidationUtils {
  // 邮箱正则表达式
  static final RegExp _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
  );

  // 手机号正则表达式（中国大陆）
  static final RegExp _phoneRegex = RegExp(
    r'^1[3-9]\d{9}$',
  );

  // 用户名正则表达式（字母、数字、下划线，3-20位）
  static final RegExp _usernameRegex = RegExp(
    r'^[a-zA-Z0-9_]{3,20}$',
  );

  // 密码正则表达式（至少8位，包含字母和数字）
  static final RegExp _passwordRegex = RegExp(
    r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$',
  );

  // URL正则表达式
  static final RegExp _urlRegex = RegExp(
    r'^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$',
  );

  // 身份证号正则表达式（中国大陆）
  static final RegExp _idCardRegex = RegExp(
    r'^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$',
  );

  /// 验证邮箱
  static bool isValidEmail(String? email) {
    if (email == null || email.isEmpty) return false;
    return _emailRegex.hasMatch(email.trim());
  }

  /// 验证手机号
  static bool isValidPhone(String? phone) {
    if (phone == null || phone.isEmpty) return false;
    return _phoneRegex.hasMatch(phone.trim());
  }

  /// 验证用户名
  static bool isValidUsername(String? username) {
    if (username == null || username.isEmpty) return false;
    return _usernameRegex.hasMatch(username.trim());
  }

  /// 验证密码
  static bool isValidPassword(String? password) {
    if (password == null || password.isEmpty) return false;
    return _passwordRegex.hasMatch(password);
  }

  /// 验证URL
  static bool isValidUrl(String? url) {
    if (url == null || url.isEmpty) return false;
    return _urlRegex.hasMatch(url.trim());
  }

  /// 验证身份证号
  static bool isValidIdCard(String? idCard) {
    if (idCard == null || idCard.isEmpty) return false;
    return _idCardRegex.hasMatch(idCard.trim());
  }

  /// 验证是否为空
  static bool isNotEmpty(String? value) {
    return value != null && value.trim().isNotEmpty;
  }

  /// 验证长度范围
  static bool isLengthInRange(String? value, int min, int max) {
    if (value == null) return false;
    final length = value.trim().length;
    return length >= min && length <= max;
  }

  /// 验证最小长度
  static bool isMinLength(String? value, int minLength) {
    if (value == null) return false;
    return value.trim().length >= minLength;
  }

  /// 验证最大长度
  static bool isMaxLength(String? value, int maxLength) {
    if (value == null) return false;
    return value.trim().length <= maxLength;
  }

  /// 验证数字
  static bool isNumeric(String? value) {
    if (value == null || value.isEmpty) return false;
    return double.tryParse(value.trim()) != null;
  }

  /// 验证整数
  static bool isInteger(String? value) {
    if (value == null || value.isEmpty) return false;
    return int.tryParse(value.trim()) != null;
  }

  /// 验证数字范围
  static bool isNumberInRange(String? value, double min, double max) {
    if (!isNumeric(value)) return false;
    final number = double.parse(value!.trim());
    return number >= min && number <= max;
  }

  /// 验证年龄
  static bool isValidAge(String? age) {
    if (!isInteger(age)) return false;
    final ageInt = int.parse(age!.trim());
    return ageInt >= 0 && ageInt <= 150;
  }

  /// 验证日期格式（YYYY-MM-DD）
  static bool isValidDate(String? date) {
    if (date == null || date.isEmpty) return false;
    try {
      DateTime.parse(date.trim());
      return true;
    } catch (e) {
      return false;
    }
  }

  /// 验证时间格式（HH:MM）
  static bool isValidTime(String? time) {
    if (time == null || time.isEmpty) return false;
    final timeRegex = RegExp(r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$');
    return timeRegex.hasMatch(time.trim());
  }

  /// 验证IP地址
  static bool isValidIP(String? ip) {
    if (ip == null || ip.isEmpty) return false;
    try {
      final address = InternetAddress(ip.trim());
      return address.type == InternetAddressType.IPv4 ||
          address.type == InternetAddressType.IPv6;
    } catch (e) {
      return false;
    }
  }

  /// 验证MAC地址
  static bool isValidMacAddress(String? mac) {
    if (mac == null || mac.isEmpty) return false;
    final macRegex = RegExp(r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$');
    return macRegex.hasMatch(mac.trim());
  }

  /// 验证信用卡号
  static bool isValidCreditCard(String? cardNumber) {
    if (cardNumber == null || cardNumber.isEmpty) return false;
    
    // 移除空格和连字符
    final cleanNumber = cardNumber.replaceAll(RegExp(r'[\s-]'), '');
    
    // 检查是否只包含数字
    if (!RegExp(r'^\d+$').hasMatch(cleanNumber)) return false;
    
    // 检查长度（13-19位）
    if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;
    
    // Luhn算法验证
    return _luhnCheck(cleanNumber);
  }

  /// Luhn算法验证
  static bool _luhnCheck(String cardNumber) {
    int sum = 0;
    bool alternate = false;
    
    for (int i = cardNumber.length - 1; i >= 0; i--) {
      int digit = int.parse(cardNumber[i]);
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return sum % 10 == 0;
  }

  /// 验证中文字符
  static bool isChineseCharacters(String? value) {
    if (value == null || value.isEmpty) return false;
    final chineseRegex = RegExp(r'^[\u4e00-\u9fa5]+$');
    return chineseRegex.hasMatch(value.trim());
  }

  /// 验证英文字符
  static bool isEnglishCharacters(String? value) {
    if (value == null || value.isEmpty) return false;
    final englishRegex = RegExp(r'^[a-zA-Z]+$');
    return englishRegex.hasMatch(value.trim());
  }

  /// 验证字母数字组合
  static bool isAlphanumeric(String? value) {
    if (value == null || value.isEmpty) return false;
    final alphanumericRegex = RegExp(r'^[a-zA-Z0-9]+$');
    return alphanumericRegex.hasMatch(value.trim());
  }

  /// 验证文件扩展名
  static bool isValidFileExtension(String? fileName, List<String> allowedExtensions) {
    if (fileName == null || fileName.isEmpty) return false;
    
    final extension = fileName.split('.').last.toLowerCase();
    return allowedExtensions.map((e) => e.toLowerCase()).contains(extension);
  }

  /// 验证图片文件
  static bool isImageFile(String? fileName) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    return isValidFileExtension(fileName, imageExtensions);
  }

  /// 验证视频文件
  static bool isVideoFile(String? fileName) {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    return isValidFileExtension(fileName, videoExtensions);
  }

  /// 验证音频文件
  static bool isAudioFile(String? fileName) {
    const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'wma'];
    return isValidFileExtension(fileName, audioExtensions);
  }

  /// 验证文档文件
  static bool isDocumentFile(String? fileName) {
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
    return isValidFileExtension(fileName, documentExtensions);
  }

  /// 验证文件大小（字节）
  static bool isValidFileSize(int? fileSize, int maxSizeInBytes) {
    if (fileSize == null) return false;
    return fileSize <= maxSizeInBytes;
  }

  /// 验证坐标
  static bool isValidCoordinates(double? latitude, double? longitude) {
    if (latitude == null || longitude == null) return false;
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  /// 验证颜色值（十六进制）
  static bool isValidHexColor(String? color) {
    if (color == null || color.isEmpty) return false;
    final hexColorRegex = RegExp(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$');
    return hexColorRegex.hasMatch(color.trim());
  }

  /// 验证版本号
  static bool isValidVersion(String? version) {
    if (version == null || version.isEmpty) return false;
    final versionRegex = RegExp(r'^\d+\.\d+\.\d+$');
    return versionRegex.hasMatch(version.trim());
  }

  /// 获取邮箱验证错误信息
  static String? getEmailError(String? email) {
    if (email == null || email.isEmpty) {
      return '请输入邮箱地址';
    }
    if (!isValidEmail(email)) {
      return '请输入有效的邮箱地址';
    }
    return null;
  }

  /// 获取手机号验证错误信息
  static String? getPhoneError(String? phone) {
    if (phone == null || phone.isEmpty) {
      return '请输入手机号';
    }
    if (!isValidPhone(phone)) {
      return '请输入有效的手机号';
    }
    return null;
  }

  /// 获取用户名验证错误信息
  static String? getUsernameError(String? username) {
    if (username == null || username.isEmpty) {
      return '请输入用户名';
    }
    if (!isValidUsername(username)) {
      return '用户名只能包含字母、数字和下划线，长度3-20位';
    }
    return null;
  }

  /// 获取密码验证错误信息
  static String? getPasswordError(String? password) {
    if (password == null || password.isEmpty) {
      return '请输入密码';
    }
    if (!isValidPassword(password)) {
      return '密码至少8位，必须包含字母和数字';
    }
    return null;
  }

  /// 获取确认密码验证错误信息
  static String? getConfirmPasswordError(String? password, String? confirmPassword) {
    if (confirmPassword == null || confirmPassword.isEmpty) {
      return '请确认密码';
    }
    if (password != confirmPassword) {
      return '两次输入的密码不一致';
    }
    return null;
  }

  /// 获取必填字段验证错误信息
  static String? getRequiredError(String? value, String fieldName) {
    if (!isNotEmpty(value)) {
      return '请输入$fieldName';
    }
    return null;
  }

  /// 获取长度验证错误信息
  static String? getLengthError(String? value, int min, int max, String fieldName) {
    if (value == null || value.isEmpty) {
      return '请输入$fieldName';
    }
    if (!isLengthInRange(value, min, max)) {
      return '$fieldName长度应在$min-$max个字符之间';
    }
    return null;
  }

  /// 获取数字验证错误信息
  static String? getNumberError(String? value, String fieldName) {
    if (value == null || value.isEmpty) {
      return '请输入$fieldName';
    }
    if (!isNumeric(value)) {
      return '请输入有效的数字';
    }
    return null;
  }

  /// 获取数字范围验证错误信息
  static String? getNumberRangeError(String? value, double min, double max, String fieldName) {
    if (value == null || value.isEmpty) {
      return '请输入$fieldName';
    }
    if (!isNumberInRange(value, min, max)) {
      return '$fieldName应在$min-$max之间';
    }
    return null;
  }

  /// 组合验证器
  static String? combineValidators(String? value, List<String? Function(String?)> validators) {
    for (final validator in validators) {
      final error = validator(value);
      if (error != null) {
        return error;
      }
    }
    return null;
  }

  /// 创建必填验证器
  static String? Function(String?) required(String fieldName) {
    return (value) => getRequiredError(value, fieldName);
  }

  /// 创建长度验证器
  static String? Function(String?) length(int min, int max, String fieldName) {
    return (value) => getLengthError(value, min, max, fieldName);
  }

  /// 创建邮箱验证器
  static String? Function(String?) email() {
    return (value) => getEmailError(value);
  }

  /// 创建手机号验证器
  static String? Function(String?) phone() {
    return (value) => getPhoneError(value);
  }

  /// 创建密码验证器
  static String? Function(String?) password() {
    return (value) => getPasswordError(value);
  }

  /// 创建确认密码验证器
  static String? Function(String?) confirmPassword(String password) {
    return (value) => getConfirmPasswordError(password, value);
  }
}