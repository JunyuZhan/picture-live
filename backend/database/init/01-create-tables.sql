-- 个人照片直播应用数据库初始化脚本
-- 创建时间: 2024-01-01
-- 版本: 1.0.0

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'photographer' CHECK (role IN ('photographer', 'admin')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建拍摄相册表
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    detailed_description TEXT,
    cover_image TEXT,
    location VARCHAR(200),
    event_date DATE,
    event_start_time TIME,
    event_end_time TIME,
    type VARCHAR(20) DEFAULT 'other' CHECK (type IN ('wedding', 'event', 'portrait', 'commercial', 'travel', 'other')),
    access_code VARCHAR(20),
    is_public BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended', 'archived')),
    
    -- 相册配置
    settings JSONB DEFAULT '{}',
    watermark_enabled BOOLEAN DEFAULT false,
    watermark_text VARCHAR(255),
    watermark_opacity DECIMAL(3,2) DEFAULT 0.3,
    review_mode BOOLEAN DEFAULT false,
    auto_tag_enabled BOOLEAN DEFAULT false,
    multi_resolution BOOLEAN DEFAULT true,
    webp_compression BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'zh-CN',
    
    -- 统计信息
    total_photos INTEGER DEFAULT 0,
    published_photos INTEGER DEFAULT 0,
    pending_photos INTEGER DEFAULT 0,
    rejected_photos INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    
    -- 时间戳
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建照片表
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 文件信息
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- 图片信息
    width INTEGER,
    height INTEGER,
    aspect_ratio DECIMAL(10,8),
    
    -- 多分辨率版本
    versions JSONB DEFAULT '{}', -- 存储不同分辨率版本的路径
    
    -- 元数据
    exif_data JSONB,
    camera_info JSONB,
    location_data JSONB,
    
    -- 标签和分类
    tags TEXT[],
    auto_tags TEXT[],
    manual_tags TEXT[],
    category VARCHAR(50),
    
    -- 状态管理
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected', 'archived')),
    review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    review_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- 水印信息
    watermark_applied BOOLEAN DEFAULT false,
    watermark_text VARCHAR(255),
    
    -- 统计信息
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- 排序和显示
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_cover BOOLEAN DEFAULT false,
    
    -- 时间戳
    captured_at TIMESTAMP WITH TIME ZONE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建相册访问记录表
CREATE TABLE IF NOT EXISTS session_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    user_agent TEXT,
    access_code_used VARCHAR(20),
    access_granted BOOLEAN DEFAULT false,
    client_type VARCHAR(20) CHECK (client_type IN ('photographer', 'viewer', 'admin')),
    session_duration INTEGER, -- 相册持续时间（秒）
    pages_viewed INTEGER DEFAULT 0,
    photos_viewed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建照片查看记录表
CREATE TABLE IF NOT EXISTS photo_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    user_agent TEXT,
    view_duration INTEGER, -- 查看持续时间（秒）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建上传任务表（用于断点续传）
CREATE TABLE IF NOT EXISTS upload_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 文件信息
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- 上传进度
    chunks_total INTEGER NOT NULL,
    chunks_uploaded INTEGER DEFAULT 0,
    bytes_uploaded BIGINT DEFAULT 0,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    
    -- 临时文件路径
    temp_path TEXT,
    
    -- 时间戳
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建API密钥表
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 相册表索引
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_access_code ON sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(type);
CREATE INDEX IF NOT EXISTS idx_sessions_is_public ON sessions(is_public);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

-- 照片表索引
CREATE INDEX IF NOT EXISTS idx_photos_session_id ON photos(session_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_review_status ON photos(review_status);
CREATE INDEX IF NOT EXISTS idx_photos_tags ON photos USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_photos_auto_tags ON photos USING GIN(auto_tags);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category);
CREATE INDEX IF NOT EXISTS idx_photos_is_featured ON photos(is_featured);
CREATE INDEX IF NOT EXISTS idx_photos_captured_at ON photos(captured_at);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_photos_published_at ON photos(published_at);
CREATE INDEX IF NOT EXISTS idx_photos_sort_order ON photos(sort_order);

-- 访问日志索引
CREATE INDEX IF NOT EXISTS idx_session_access_logs_session_id ON session_access_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_access_logs_ip_address ON session_access_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_session_access_logs_created_at ON session_access_logs(created_at);

-- 照片查看记录索引
CREATE INDEX IF NOT EXISTS idx_photo_views_photo_id ON photo_views(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_views_session_id ON photo_views(session_id);
CREATE INDEX IF NOT EXISTS idx_photo_views_created_at ON photo_views(created_at);

-- 上传任务索引
CREATE INDEX IF NOT EXISTS idx_upload_tasks_session_id ON upload_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_upload_tasks_user_id ON upload_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_tasks_status ON upload_tasks(status);
CREATE INDEX IF NOT EXISTS idx_upload_tasks_expires_at ON upload_tasks(expires_at);

-- 系统配置索引
CREATE INDEX IF NOT EXISTS idx_system_configs_config_key ON system_configs(config_key);
CREATE INDEX IF NOT EXISTS idx_system_configs_is_public ON system_configs(is_public);

-- API密钥索引
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- 创建触发器函数：更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表创建updated_at触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_upload_tasks_updated_at BEFORE UPDATE ON upload_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建触发器函数：更新相册统计信息
CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE sessions SET 
            total_photos = total_photos + 1,
            pending_photos = CASE WHEN NEW.status = 'pending' THEN pending_photos + 1 ELSE pending_photos END,
            published_photos = CASE WHEN NEW.status = 'published' THEN published_photos + 1 ELSE published_photos END,
            rejected_photos = CASE WHEN NEW.status = 'rejected' THEN rejected_photos + 1 ELSE rejected_photos END
        WHERE id = NEW.session_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 如果状态发生变化，更新统计
        IF OLD.status != NEW.status THEN
            UPDATE sessions SET 
                pending_photos = pending_photos + 
                    CASE WHEN NEW.status = 'pending' THEN 1 ELSE 0 END -
                    CASE WHEN OLD.status = 'pending' THEN 1 ELSE 0 END,
                published_photos = published_photos + 
                    CASE WHEN NEW.status = 'published' THEN 1 ELSE 0 END -
                    CASE WHEN OLD.status = 'published' THEN 1 ELSE 0 END,
                rejected_photos = rejected_photos + 
                    CASE WHEN NEW.status = 'rejected' THEN 1 ELSE 0 END -
                    CASE WHEN OLD.status = 'rejected' THEN 1 ELSE 0 END
            WHERE id = NEW.session_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE sessions SET 
            total_photos = total_photos - 1,
            pending_photos = CASE WHEN OLD.status = 'pending' THEN pending_photos - 1 ELSE pending_photos END,
            published_photos = CASE WHEN OLD.status = 'published' THEN published_photos - 1 ELSE published_photos END,
            rejected_photos = CASE WHEN OLD.status = 'rejected' THEN rejected_photos - 1 ELSE rejected_photos END
        WHERE id = OLD.session_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 创建照片统计触发器
CREATE TRIGGER trigger_update_session_stats 
    AFTER INSERT OR UPDATE OR DELETE ON photos 
    FOR EACH ROW EXECUTE FUNCTION update_session_stats();

-- 插入默认系统配置
INSERT INTO system_configs (config_key, config_value, description, is_public) VALUES
('app_name', '"照片直播"', '应用名称', true),
('app_version', '"1.0.0"', '应用版本', true),
('max_file_size', '52428800', '最大文件大小（字节）', true),
('allowed_file_types', '["image/jpeg", "image/png", "image/webp"]', '允许的文件类型', true),
('default_watermark_opacity', '0.3', '默认水印透明度', true),
('default_image_quality', '{"thumbnail": 60, "medium": 80, "original": 90}', '默认图片质量设置', true),
('ai_tagging_enabled', 'true', '是否启用AI标签功能', true),
('review_mode_default', 'false', '默认审核模式', true),
('session_expiry_hours', '168', '相册过期时间（小时）', true),
('upload_chunk_size', '1048576', '上传分块大小（字节）', true)
ON CONFLICT (config_key) DO NOTHING;

-- 创建默认管理员用户（密码: admin123）
INSERT INTO users (username, email, password_hash, display_name, role, is_active, email_verified) VALUES
('admin', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/3Haa', '系统管理员', 'admin', true, true)
ON CONFLICT (username) DO NOTHING;

-- 创建视图：相册详细信息
CREATE OR REPLACE VIEW session_details AS
SELECT 
    s.*,
    u.username as creator_username,
    u.display_name as creator_display_name,
    u.avatar_url as creator_avatar_url,
    CASE 
        WHEN s.ended_at IS NOT NULL THEN s.ended_at - s.started_at
        ELSE CURRENT_TIMESTAMP - s.started_at
    END as duration
FROM sessions s
JOIN users u ON s.user_id = u.id;

-- 创建视图：照片详细信息
CREATE OR REPLACE VIEW photo_details AS
SELECT 
    p.*,
    s.title as session_title,
    s.access_code as session_access_code,
    u.username as uploader_username,
    u.display_name as uploader_display_name,
    reviewer.username as reviewer_username,
    reviewer.display_name as reviewer_display_name
FROM photos p
JOIN sessions s ON p.session_id = s.id
JOIN users u ON p.user_id = u.id
LEFT JOIN users reviewer ON p.reviewed_by = reviewer.id;

-- 创建函数：清理过期的上传任务
CREATE OR REPLACE FUNCTION cleanup_expired_upload_tasks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM upload_tasks 
    WHERE expires_at < CURRENT_TIMESTAMP 
    AND status IN ('pending', 'failed', 'cancelled');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取相册统计信息
CREATE OR REPLACE FUNCTION get_session_stats(session_uuid UUID)
RETURNS TABLE(
    total_photos INTEGER,
    published_photos INTEGER,
    pending_photos INTEGER,
    rejected_photos INTEGER,
    total_views BIGINT,
    unique_viewers BIGINT,
    avg_view_duration DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.total_photos,
        s.published_photos,
        s.pending_photos,
        s.rejected_photos,
        COALESCE(SUM(p.view_count), 0)::BIGINT as total_views,
        COUNT(DISTINCT sal.ip_address)::BIGINT as unique_viewers,
        COALESCE(AVG(pv.view_duration), 0)::DECIMAL as avg_view_duration
    FROM sessions s
    LEFT JOIN photos p ON s.id = p.session_id
    LEFT JOIN session_access_logs sal ON s.id = sal.session_id AND sal.access_granted = true
    LEFT JOIN photo_views pv ON s.id = pv.session_id
    WHERE s.id = session_uuid
    GROUP BY s.id, s.total_photos, s.published_photos, s.pending_photos, s.rejected_photos;
END;
$$ LANGUAGE plpgsql;

-- 完成初始化
SELECT 'Database initialization completed successfully!' as status;