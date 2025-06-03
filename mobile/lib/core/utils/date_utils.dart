import 'package:intl/intl.dart';

class AppDateUtils {
  // 日期格式化器
  static final DateFormat _dateFormat = DateFormat('yyyy-MM-dd');
  static final DateFormat _timeFormat = DateFormat('HH:mm');
  static final DateFormat _dateTimeFormat = DateFormat('yyyy-MM-dd HH:mm');
  static final DateFormat _fullDateTimeFormat = DateFormat('yyyy-MM-dd HH:mm:ss');
  static final DateFormat _monthDayFormat = DateFormat('MM-dd');
  static final DateFormat _yearMonthFormat = DateFormat('yyyy-MM');
  static final DateFormat _shortDateFormat = DateFormat('MM/dd');
  static final DateFormat _longDateFormat = DateFormat('yyyy年MM月dd日');
  static final DateFormat _longDateTimeFormat = DateFormat('yyyy年MM月dd日 HH:mm');
  
  /// 格式化日期为 yyyy-MM-dd
  static String formatDate(DateTime date) {
    return _dateFormat.format(date);
  }
  
  /// 格式化时间为 HH:mm
  static String formatTime(DateTime date) {
    return _timeFormat.format(date);
  }
  
  /// 格式化日期时间为 yyyy-MM-dd HH:mm
  static String formatDateTime(DateTime date) {
    return _dateTimeFormat.format(date);
  }
  
  /// 格式化完整日期时间为 yyyy-MM-dd HH:mm:ss
  static String formatFullDateTime(DateTime date) {
    return _fullDateTimeFormat.format(date);
  }
  
  /// 格式化为中文日期 yyyy年MM月dd日
  static String formatLongDate(DateTime date) {
    return _longDateFormat.format(date);
  }
  
  /// 格式化为中文日期时间 yyyy年MM月dd日 HH:mm
  static String formatLongDateTime(DateTime date) {
    return _longDateTimeFormat.format(date);
  }
  
  /// 格式化为短日期 MM/dd
  static String formatShortDate(DateTime date) {
    return _shortDateFormat.format(date);
  }
  
  /// 格式化为月日 MM-dd
  static String formatMonthDay(DateTime date) {
    return _monthDayFormat.format(date);
  }
  
  /// 格式化为年月 yyyy-MM
  static String formatYearMonth(DateTime date) {
    return _yearMonthFormat.format(date);
  }
  
  /// 格式化相对时间（如：刚刚、5分钟前、昨天等）
  static String formatRelativeTime(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inSeconds < 60) {
      return '刚刚';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}分钟前';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}小时前';
    } else if (difference.inDays == 1) {
      return '昨天';
    } else if (difference.inDays == 2) {
      return '前天';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}天前';
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return '${weeks}周前';
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).floor();
      return '${months}个月前';
    } else {
      final years = (difference.inDays / 365).floor();
      return '${years}年前';
    }
  }
  
  /// 格式化智能时间显示
  /// 今天显示时间，昨天显示"昨天"，其他显示日期
  static String formatSmartTime(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final dateOnly = DateTime(date.year, date.month, date.day);
    
    if (dateOnly == today) {
      return formatTime(date);
    } else if (dateOnly == yesterday) {
      return '昨天';
    } else if (now.year == date.year) {
      return formatMonthDay(date);
    } else {
      return formatDate(date);
    }
  }
  
  /// 格式化聊天时间显示
  /// 5分钟内不显示，同一天显示时间，不同天显示日期
  static String formatChatTime(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    // 5分钟内不显示时间
    if (difference.inMinutes < 5) {
      return '';
    }
    
    final today = DateTime(now.year, now.month, now.day);
    final dateOnly = DateTime(date.year, date.month, date.day);
    
    if (dateOnly == today) {
      return formatTime(date);
    } else {
      return formatSmartTime(date);
    }
  }
  
  /// 格式化持续时间
  static String formatDuration(Duration duration) {
    if (duration.inDays > 0) {
      return '${duration.inDays}天${duration.inHours % 24}小时';
    } else if (duration.inHours > 0) {
      return '${duration.inHours}小时${duration.inMinutes % 60}分钟';
    } else if (duration.inMinutes > 0) {
      return '${duration.inMinutes}分钟';
    } else {
      return '${duration.inSeconds}秒';
    }
  }
  
  /// 格式化文件大小
  static String formatFileSize(int bytes) {
    if (bytes < 1024) {
      return '${bytes}B';
    } else if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)}KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
    } else {
      return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
    }
  }
  
  /// 判断是否为今天
  static bool isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && 
           date.month == now.month && 
           date.day == now.day;
  }
  
  /// 判断是否为昨天
  static bool isYesterday(DateTime date) {
    final now = DateTime.now();
    final yesterday = now.subtract(const Duration(days: 1));
    return date.year == yesterday.year && 
           date.month == yesterday.month && 
           date.day == yesterday.day;
  }
  
  /// 判断是否为本周
  static bool isThisWeek(DateTime date) {
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
    final endOfWeek = startOfWeek.add(const Duration(days: 6));
    
    return date.isAfter(startOfWeek.subtract(const Duration(days: 1))) &&
           date.isBefore(endOfWeek.add(const Duration(days: 1)));
  }
  
  /// 判断是否为本月
  static bool isThisMonth(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month;
  }
  
  /// 判断是否为本年
  static bool isThisYear(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year;
  }
  
  /// 获取月份的第一天
  static DateTime getFirstDayOfMonth(DateTime date) {
    return DateTime(date.year, date.month, 1);
  }
  
  /// 获取月份的最后一天
  static DateTime getLastDayOfMonth(DateTime date) {
    return DateTime(date.year, date.month + 1, 0);
  }
  
  /// 获取周的第一天（周一）
  static DateTime getFirstDayOfWeek(DateTime date) {
    return date.subtract(Duration(days: date.weekday - 1));
  }
  
  /// 获取周的最后一天（周日）
  static DateTime getLastDayOfWeek(DateTime date) {
    return date.add(Duration(days: 7 - date.weekday));
  }
  
  /// 解析日期字符串
  static DateTime? parseDate(String dateString) {
    try {
      return DateTime.parse(dateString);
    } catch (e) {
      return null;
    }
  }
  
  /// 解析ISO8601日期字符串
  static DateTime? parseIso8601(String dateString) {
    try {
      return DateTime.parse(dateString);
    } catch (e) {
      return null;
    }
  }
  
  /// 获取时间戳（毫秒）
  static int getTimestamp(DateTime date) {
    return date.millisecondsSinceEpoch;
  }
  
  /// 从时间戳创建DateTime（毫秒）
  static DateTime fromTimestamp(int timestamp) {
    return DateTime.fromMillisecondsSinceEpoch(timestamp);
  }
  
  /// 获取UTC时间
  static DateTime getUtcTime(DateTime date) {
    return date.toUtc();
  }
  
  /// 获取本地时间
  static DateTime getLocalTime(DateTime utcDate) {
    return utcDate.toLocal();
  }
  
  /// 计算年龄
  static int calculateAge(DateTime birthDate) {
    final now = DateTime.now();
    int age = now.year - birthDate.year;
    
    if (now.month < birthDate.month || 
        (now.month == birthDate.month && now.day < birthDate.day)) {
      age--;
    }
    
    return age;
  }
  
  /// 获取星期几的中文名称
  static String getWeekdayName(DateTime date) {
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return weekdays[date.weekday - 1];
  }
  
  /// 获取月份的中文名称
  static String getMonthName(DateTime date) {
    const months = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];
    return months[date.month - 1];
  }
  
  /// 格式化倒计时
  static String formatCountdown(Duration duration) {
    if (duration.isNegative) {
      return '已过期';
    }
    
    final days = duration.inDays;
    final hours = duration.inHours % 24;
    final minutes = duration.inMinutes % 60;
    final seconds = duration.inSeconds % 60;
    
    if (days > 0) {
      return '${days}天${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    } else if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    } else {
      return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    }
  }
  
  /// 获取时间范围描述
  static String getTimeRangeDescription(DateTime start, DateTime end) {
    if (isToday(start) && isToday(end)) {
      return '今天 ${formatTime(start)} - ${formatTime(end)}';
    } else if (formatDate(start) == formatDate(end)) {
      return '${formatDate(start)} ${formatTime(start)} - ${formatTime(end)}';
    } else {
      return '${formatDateTime(start)} - ${formatDateTime(end)}';
    }
  }
}