-- 个人照片直播应用种子数据
-- 创建时间: 2024-01-01
-- 版本: 1.0.0
-- 用途: 开发和测试环境的示例数据

-- 注意：此脚本仅用于开发和测试环境，请勿在生产环境中运行

-- 插入测试用户
INSERT INTO users (id, username, email, password_hash, display_name, avatar_url, role, is_active, email_verified) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'photographer1', 'photographer1@example.com', '$2a$12$S6Ry0tDbx2n6BAw48Y6aEuUCbRnCCF2xmk.QR.smlYNh5s/uK5FE2', '张摄影师', '/avatars/photographer1.jpg', 'photographer', true, true),
('550e8400-e29b-41d4-a716-446655440002', 'photographer2', 'photographer2@example.com', '$2a$12$S6Ry0tDbx2n6BAw48Y6aEuUCbRnCCF2xmk.QR.smlYNh5s/uK5FE2', '李摄影师', '/avatars/photographer2.jpg', 'photographer', true, true),
('550e8400-e29b-41d4-a716-446655440003', 'testuser', 'testuser@example.com', '$2a$12$S6Ry0tDbx2n6BAw48Y6aEuUCbRnCCF2xmk.QR.smlYNh5s/uK5FE2', '测试用户', '/avatars/testuser.jpg', 'photographer', true, false)
ON CONFLICT (id) DO NOTHING;

-- 插入测试会话
INSERT INTO sessions (id, user_id, title, description, access_code, is_public, status, settings, watermark_enabled, watermark_text, review_mode, auto_tag_enabled, language, started_at) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '婚礼现场直播', '张先生和李女士的婚礼现场照片直播，记录美好时刻', 'WEDDING2024', false, 'active', 
 '{
   "max_photos": 500,
   "auto_publish": false,
   "notification_enabled": true,
   "download_enabled": true,
   "comment_enabled": false
 }', 
 true, '© 张摄影工作室', true, true, 'zh-CN', CURRENT_TIMESTAMP - INTERVAL '2 hours'),

('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '生日派对拍摄', '小明10岁生日派对照片分享', 'BIRTHDAY10', true, 'active',
 '{
   "max_photos": 200,
   "auto_publish": true,
   "notification_enabled": false,
   "download_enabled": true,
   "comment_enabled": true
 }',
 false, '', false, true, 'zh-CN', CURRENT_TIMESTAMP - INTERVAL '1 hour'),

('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '企业年会摄影', 'ABC公司2024年度年会活动照片', 'COMPANY2024', false, 'paused',
 '{
   "max_photos": 1000,
   "auto_publish": false,
   "notification_enabled": true,
   "download_enabled": false,
   "comment_enabled": false
 }',
 true, '© 李摄影工作室', true, false, 'zh-CN', CURRENT_TIMESTAMP - INTERVAL '3 hours'),

('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', '毕业典礼记录', '2024届毕业典礼照片直播', 'GRAD2024', true, 'ended',
 '{
   "max_photos": 300,
   "auto_publish": true,
   "notification_enabled": true,
   "download_enabled": true,
   "comment_enabled": true
 }',
 false, '', false, true, 'zh-CN', CURRENT_TIMESTAMP - INTERVAL '5 hours')
ON CONFLICT (id) DO NOTHING;

-- 更新会话结束时间
UPDATE sessions SET ended_at = CURRENT_TIMESTAMP - INTERVAL '1 hour' WHERE id = '660e8400-e29b-41d4-a716-446655440004';

-- 插入测试照片
INSERT INTO photos (id, session_id, user_id, filename, original_filename, file_path, file_size, mime_type, width, height, aspect_ratio, versions, exif_data, tags, auto_tags, manual_tags, category, status, review_status, watermark_applied, view_count, sort_order, is_featured, captured_at, uploaded_at, published_at) VALUES

-- 婚礼现场直播的照片
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 
 'wedding_001_1704067200.jpg', 'IMG_0001.jpg', '/uploads/2024/01/wedding_001_1704067200.jpg', 2048576, 'image/jpeg', 4000, 3000, 1.33333333,
 '{
   "thumbnail": "/uploads/2024/01/thumbs/wedding_001_1704067200_thumb.jpg",
   "medium": "/uploads/2024/01/medium/wedding_001_1704067200_medium.jpg",
   "large": "/uploads/2024/01/large/wedding_001_1704067200_large.jpg"
 }',
 '{
   "camera": "Canon EOS R5",
   "lens": "RF 24-70mm f/2.8L IS USM",
   "focal_length": "50mm",
   "aperture": "f/2.8",
   "shutter_speed": "1/125",
   "iso": "800"
 }',
 '{"婚礼", "新郎", "新娘", "仪式", "幸福"}', '{"人物", "室内", "正式", "情感"}', '{"重要时刻"}', '婚礼', 'published', 'approved', true, 45, 1, true, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes'),

('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001',
 'wedding_002_1704067260.jpg', 'IMG_0002.jpg', '/uploads/2024/01/wedding_002_1704067260.jpg', 1876543, 'image/jpeg', 4000, 3000, 1.33333333,
 '{
   "thumbnail": "/uploads/2024/01/thumbs/wedding_002_1704067260_thumb.jpg",
   "medium": "/uploads/2024/01/medium/wedding_002_1704067260_medium.jpg",
   "large": "/uploads/2024/01/large/wedding_002_1704067260_large.jpg"
 }',
 '{
   "camera": "Canon EOS R5",
   "lens": "RF 24-70mm f/2.8L IS USM",
   "focal_length": "35mm",
   "aperture": "f/2.8",
   "shutter_speed": "1/100",
   "iso": "640"
 }',
 '{"婚礼", "交换戒指", "仪式", "爱情"}', '{"人物", "室内", "特写", "情感"}', '{"经典瞬间"}', '婚礼', 'published', 'approved', true, 32, 2, false, CURRENT_TIMESTAMP - INTERVAL '1 hour 55 minutes', CURRENT_TIMESTAMP - INTERVAL '1 hour 55 minutes', CURRENT_TIMESTAMP - INTERVAL '1 hour 45 minutes'),

('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001',
 'wedding_003_1704067320.jpg', 'IMG_0003.jpg', '/uploads/2024/01/wedding_003_1704067320.jpg', 2234567, 'image/jpeg', 3000, 4000, 0.75,
 '{
   "thumbnail": "/uploads/2024/01/thumbs/wedding_003_1704067320_thumb.jpg",
   "medium": "/uploads/2024/01/medium/wedding_003_1704067320_medium.jpg",
   "large": "/uploads/2024/01/large/wedding_003_1704067320_large.jpg"
 }',
 '{
   "camera": "Canon EOS R5",
   "lens": "RF 85mm f/1.2L USM",
   "focal_length": "85mm",
   "aperture": "f/1.8",
   "shutter_speed": "1/160",
   "iso": "400"
 }',
 '{"婚礼", "新娘", "婚纱", "美丽"}', '{"人物", "室内", "肖像", "优雅"}', '{"新娘特写"}', '婚礼', 'pending', 'pending', false, 0, 3, false, CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes', CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes', NULL),

-- 生日派对的照片
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001',
 'birthday_001_1704070800.jpg', 'DSC_0001.jpg', '/uploads/2024/01/birthday_001_1704070800.jpg', 1654321, 'image/jpeg', 4000, 3000, 1.33333333,
 '{
   "thumbnail": "/uploads/2024/01/thumbs/birthday_001_1704070800_thumb.jpg",
   "medium": "/uploads/2024/01/medium/birthday_001_1704070800_medium.jpg",
   "large": "/uploads/2024/01/large/birthday_001_1704070800_large.jpg"
 }',
 '{
   "camera": "Nikon D850",
   "lens": "24-120mm f/4G ED VR",
   "focal_length": "35mm",
   "aperture": "f/4.0",
   "shutter_speed": "1/80",
   "iso": "800"
 }',
 '{"生日", "派对", "蛋糕", "庆祝", "儿童"}', '{"人物", "室内", "庆祝", "快乐"}', '{"生日蛋糕"}', '生日', 'published', 'approved', false, 28, 1, true, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '55 minutes'),

('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001',
 'birthday_002_1704070860.jpg', 'DSC_0002.jpg', '/uploads/2024/01/birthday_002_1704070860.jpg', 1789012, 'image/jpeg', 4000, 3000, 1.33333333,
 '{
   "thumbnail": "/uploads/2024/01/thumbs/birthday_002_1704070860_thumb.jpg",
   "medium": "/uploads/2024/01/medium/birthday_002_1704070860_medium.jpg",
   "large": "/uploads/2024/01/large/birthday_002_1704070860_large.jpg"
 }',
 '{
   "camera": "Nikon D850",
   "lens": "24-120mm f/4G ED VR",
   "focal_length": "50mm",
   "aperture": "f/4.0",
   "shutter_speed": "1/100",
   "iso": "640"
 }',
 '{"生日", "派对", "朋友", "游戏", "快乐"}', '{"人物", "室内", "群体", "活动"}', '{"派对游戏"}', '生日', 'published', 'approved', false, 19, 2, false, CURRENT_TIMESTAMP - INTERVAL '59 minutes', CURRENT_TIMESTAMP - INTERVAL '59 minutes', CURRENT_TIMESTAMP - INTERVAL '54 minutes'),

-- 企业年会的照片
('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002',
 'company_001_1704064200.jpg', 'CORP_0001.jpg', '/uploads/2024/01/company_001_1704064200.jpg', 2345678, 'image/jpeg', 5000, 3333, 1.5,
 '{
   "thumbnail": "/uploads/2024/01/thumbs/company_001_1704064200_thumb.jpg",
   "medium": "/uploads/2024/01/medium/company_001_1704064200_medium.jpg",
   "large": "/uploads/2024/01/large/company_001_1704064200_large.jpg"
 }',
 '{
   "camera": "Sony A7R IV",
   "lens": "FE 24-70mm f/2.8 GM",
   "focal_length": "24mm",
   "aperture": "f/5.6",
   "shutter_speed": "1/60",
   "iso": "1600"
 }',
 '{"年会", "企业", "员工", "庆祝", "团队"}', '{"人物", "室内", "商务", "正式"}', '{"开场致辞"}', '企业活动', 'pending', 'pending', true, 0, 1, false, CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours', NULL),

-- 毕业典礼的照片
('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002',
 'graduation_001_1704056400.jpg', 'GRAD_0001.jpg', '/uploads/2024/01/graduation_001_1704056400.jpg', 1987654, 'image/jpeg', 4000, 3000, 1.33333333,
 '{
   "thumbnail": "/uploads/2024/01/thumbs/graduation_001_1704056400_thumb.jpg",
   "medium": "/uploads/2024/01/medium/graduation_001_1704056400_medium.jpg",
   "large": "/uploads/2024/01/large/graduation_001_1704056400_large.jpg"
 }',
 '{
   "camera": "Sony A7R IV",
   "lens": "FE 70-200mm f/2.8 GM OSS",
   "focal_length": "135mm",
   "aperture": "f/4.0",
   "shutter_speed": "1/200",
   "iso": "400"
 }',
 '{"毕业", "典礼", "学生", "成就", "未来"}', '{"人物", "室外", "正式", "庆祝"}', '{"毕业典礼"}', '毕业', 'published', 'approved', false, 67, 1, true, CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours 30 minutes')
ON CONFLICT (id) DO NOTHING;

-- 插入会话访问记录
INSERT INTO session_access_logs (session_id, ip_address, user_agent, access_code_used, access_granted, client_type, session_duration, pages_viewed, photos_viewed) VALUES
('660e8400-e29b-41d4-a716-446655440001', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'WEDDING2024', true, 'viewer', 1800, 5, 15),
('660e8400-e29b-41d4-a716-446655440001', '192.168.1.101', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'WEDDING2024', true, 'viewer', 2400, 3, 12),
('660e8400-e29b-41d4-a716-446655440001', '192.168.1.102', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'WEDDING2024', true, 'viewer', 3600, 8, 25),
('660e8400-e29b-41d4-a716-446655440002', '10.0.0.50', 'Mozilla/5.0 (Android 13; Mobile; rv:109.0)', NULL, true, 'viewer', 900, 2, 8),
('660e8400-e29b-41d4-a716-446655440002', '10.0.0.51', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NULL, true, 'viewer', 1200, 4, 6),
('660e8400-e29b-41d4-a716-446655440004', '203.0.113.10', 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 'GRAD2024', true, 'viewer', 2700, 6, 18);

-- 插入照片查看记录
INSERT INTO photo_views (photo_id, session_id, ip_address, user_agent, view_duration) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 15),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '192.168.1.101', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 12),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '192.168.1.102', 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', 18),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 8),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '192.168.1.102', 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', 10),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '10.0.0.50', 'Mozilla/5.0 (Android 13; Mobile)', 6),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '10.0.0.51', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 9),
('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', '10.0.0.50', 'Mozilla/5.0 (Android 13; Mobile)', 4),
('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440004', '203.0.113.10', 'Mozilla/5.0 (iPad; CPU OS 17_0)', 22);

-- 插入API密钥
INSERT INTO api_keys (user_id, key_name, api_key, permissions, is_active, expires_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', '移动应用API', 'pk_live_51234567890abcdef1234567890abcdef12345678', '{"sessions:read", "sessions:write", "photos:upload", "photos:read"}', true, CURRENT_TIMESTAMP + INTERVAL '1 year'),
('550e8400-e29b-41d4-a716-446655440002', '第三方集成', 'pk_test_abcdef1234567890abcdef1234567890abcdef12', '{"sessions:read", "photos:read"}', true, CURRENT_TIMESTAMP + INTERVAL '6 months'),
('550e8400-e29b-41d4-a716-446655440001', '备用密钥', 'pk_backup_9876543210fedcba9876543210fedcba98765432', '{"sessions:read", "photos:read", "photos:upload"}', false, CURRENT_TIMESTAMP + INTERVAL '3 months');

-- 更新会话统计信息（触发器会自动更新，这里手动确保数据一致性）
UPDATE sessions SET 
    total_photos = (SELECT COUNT(*) FROM photos WHERE session_id = sessions.id),
    published_photos = (SELECT COUNT(*) FROM photos WHERE session_id = sessions.id AND status = 'published'),
    pending_photos = (SELECT COUNT(*) FROM photos WHERE session_id = sessions.id AND status = 'pending'),
    rejected_photos = (SELECT COUNT(*) FROM photos WHERE session_id = sessions.id AND status = 'rejected'),
    total_views = (SELECT COALESCE(SUM(view_count), 0) FROM photos WHERE session_id = sessions.id),
    unique_viewers = (SELECT COUNT(DISTINCT ip_address) FROM session_access_logs WHERE session_id = sessions.id AND access_granted = true);

-- 插入额外的系统配置（开发环境专用）
INSERT INTO system_configs (config_key, config_value, description, is_public) VALUES
('dev_mode', 'true', '开发模式标识', false),
('debug_logging', 'true', '调试日志开关', false),
('sample_data_loaded', 'true', '示例数据已加载标识', false),
('test_email_domain', '"example.com"', '测试邮箱域名', false),
('mock_ai_tagging', 'true', '模拟AI标签功能', false),
('upload_simulation', 'false', '上传模拟模式', false)
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = CURRENT_TIMESTAMP;

-- 创建开发环境专用的测试函数
CREATE OR REPLACE FUNCTION reset_demo_data()
RETURNS TEXT AS $$
BEGIN
    -- 重置照片查看次数
    UPDATE photos SET view_count = FLOOR(RANDOM() * 100) WHERE session_id IN (
        SELECT id FROM sessions WHERE user_id IN (
            SELECT id FROM users WHERE username LIKE 'photographer%'
        )
    );
    
    -- 重置会话统计
    UPDATE sessions SET 
        total_views = (SELECT COALESCE(SUM(view_count), 0) FROM photos WHERE session_id = sessions.id),
        unique_viewers = FLOOR(RANDOM() * 50) + 1
    WHERE user_id IN (
        SELECT id FROM users WHERE username LIKE 'photographer%'
    );
    
    RETURN 'Demo data reset successfully!';
END;
$$ LANGUAGE plpgsql;

-- 创建生成随机访问记录的函数
CREATE OR REPLACE FUNCTION generate_random_views(session_uuid UUID, view_count INTEGER DEFAULT 10)
RETURNS TEXT AS $$
DECLARE
    i INTEGER;
    random_ip INET;
    random_duration INTEGER;
BEGIN
    FOR i IN 1..view_count LOOP
        -- 生成随机IP地址
        random_ip := ('192.168.' || FLOOR(RANDOM() * 255) || '.' || FLOOR(RANDOM() * 255))::INET;
        random_duration := FLOOR(RANDOM() * 300) + 10; -- 10-310秒
        
        INSERT INTO session_access_logs (session_id, ip_address, user_agent, access_granted, client_type, session_duration, pages_viewed, photos_viewed)
        VALUES (
            session_uuid,
            random_ip,
            'Mozilla/5.0 (Test Browser)',
            true,
            'viewer',
            random_duration,
            FLOOR(RANDOM() * 10) + 1,
            FLOOR(RANDOM() * 20) + 1
        );
    END LOOP;
    
    RETURN 'Generated ' || view_count || ' random views for session ' || session_uuid;
END;
$$ LANGUAGE plpgsql;

-- 完成种子数据插入
SELECT 'Sample data inserted successfully!' as status;
SELECT 'Total users: ' || COUNT(*) as user_count FROM users;
SELECT 'Total sessions: ' || COUNT(*) as session_count FROM sessions;
SELECT 'Total photos: ' || COUNT(*) as photo_count FROM photos;
SELECT 'Total access logs: ' || COUNT(*) as access_log_count FROM session_access_logs;