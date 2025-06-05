#!/usr/bin/env node

/**
 * 修复种子数据中的密码哈希
 * 生成正确的bcrypt哈希值对应密码'password123'
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function generatePasswordHash() {
    const password = 'password123';
    const saltRounds = 12;
    
    console.log('🔐 生成密码哈希...');
    const hash = await bcrypt.hash(password, saltRounds);
    console.log(`密码: ${password}`);
    console.log(`哈希: ${hash}`);
    
    return hash;
}

async function updateSeedFile() {
    try {
        const seedFilePath = path.join(__dirname, '../database/seeds/01-sample-data.sql');
        
        // 生成新的密码哈希
        const newHash = await generatePasswordHash();
        
        // 读取种子文件
        let content = fs.readFileSync(seedFilePath, 'utf8');
        
        // 替换所有的密码哈希
        const oldHashPattern = /\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8\/LewdBPj6hsxq\/3Haa/g;
        content = content.replace(oldHashPattern, newHash);
        
        // 写回文件
        fs.writeFileSync(seedFilePath, content, 'utf8');
        
        console.log('✅ 种子文件已更新');
        console.log('📝 所有测试账户的密码都是: password123');
        
    } catch (error) {
        console.error('❌ 更新种子文件失败:', error.message);
        process.exit(1);
    }
}

async function main() {
    console.log('🔧 修复密码哈希工具');
    console.log('='.repeat(50));
    
    await updateSeedFile();
    
    console.log('\n🎉 密码修复完成！');
    console.log('💡 现在需要重新运行种子数据:');
    console.log('   node scripts/reset.js --force');
    console.log('   node scripts/seed.js run');
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ 脚本执行失败:', error.message);
        process.exit(1);
    });
}

module.exports = { generatePasswordHash, updateSeedFile };