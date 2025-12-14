const db = require('./db');

async function seedTodos() {
  try {
    console.log('正在初始化 Todo 表...');

    // 建表
    await db.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        done BOOLEAN DEFAULT FALSE,
        priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
        deadline VARCHAR(64),
        created_at BIGINT,
        quadrant VARCHAR(10)
      )
    `);

    // 插入初始数据
    const todos = [
      { id: 't1', title: '👋 欢迎使用 Canlder 清单', done: false, priority: 'high', created_at: Date.now() },
      { id: 't2', title: '👈 左滑可以删除我', done: false, priority: 'medium', created_at: Date.now() },
      { id: 't3', title: '👉 右滑可以标记重要', done: true, priority: 'low', created_at: Date.now() },
    ];

    for (const todo of todos) {
      // 使用 INSERT IGNORE 避免重复插入报错
      await db.query(
        `INSERT IGNORE INTO todos (id, title, done, priority, created_at) VALUES (?, ?, ?, ?, ?)`,
        [todo.id, todo.title, todo.done, todo.priority, todo.created_at]
      );
    }

    console.log('Todo 表初始化完成，且已插入默认数据！');
    process.exit(0);
  } catch (err) {
    console.error('初始化失败:', err);
    process.exit(1);
  }
}

seedTodos();
