-- 为sessions表添加type字段的迁移脚本
-- 如果type字段不存在则添加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'type'
    ) THEN
        ALTER TABLE sessions 
        ADD COLUMN type VARCHAR(20) DEFAULT 'other' 
        CHECK (type IN ('wedding', 'event', 'portrait', 'commercial', 'travel', 'other'));
        
        -- 创建type字段的索引
        CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(type);
    END IF;
END $$; 