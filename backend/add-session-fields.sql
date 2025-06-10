-- 添加相册详细信息字段
-- 在开发环境中直接修改表结构

-- 添加详细描述字段
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS detailed_description TEXT;

-- 添加封面图片字段  
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- 添加地点字段（如果不存在）
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS location VARCHAR(200);

-- 添加活动日期字段
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS event_date DATE;

-- 添加活动开始时间字段
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS event_start_time TIME;

-- 添加活动结束时间字段
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS event_end_time TIME;

-- 查看表结构
\d sessions; 