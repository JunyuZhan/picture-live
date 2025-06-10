const { Client } = require('pg');

async function checkUser() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'picture_live',
    user: 'postgres',
    password: 'postgres123'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // 查询testuser
    const testUserQuery = 'SELECT id, username, email, display_name, role, is_active, email_verified FROM users WHERE email = $1';
    const testUserResult = await client.query(testUserQuery, ['testuser@example.com']);
    
    console.log('\n=== TestUser 数据 ===');
    if (testUserResult.rows.length > 0) {
      console.log(testUserResult.rows[0]);
    } else {
      console.log('未找到 testuser@example.com');
    }

    // 查询所有用户
    const allUsersQuery = 'SELECT id, username, email, display_name, role, is_active, email_verified FROM users ORDER BY created_at';
    const allUsersResult = await client.query(allUsersQuery);
    
    console.log('\n=== 所有用户 ===');
    allUsersResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - ${user.role} - Active:${user.is_active} - Verified:${user.email_verified}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkUser(); 