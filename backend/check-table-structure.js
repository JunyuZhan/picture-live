const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'picture_live',
    password: process.env.DB_PASSWORD || 'postgres123',
    port: process.env.DB_PORT || 5432,
});

async function checkTableStructure() {
    const client = await pool.connect();
    
    try {
        console.log('检查sessions表结构...');
        
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'sessions' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);
        
        console.log('Sessions表字段:');
        result.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
    } catch (error) {
        console.error('❌ 检查失败:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTableStructure().catch(console.error); 