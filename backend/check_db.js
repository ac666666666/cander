const db = require('./db');

async function checkData() {
  try {
    console.log('--- 正在检查数据库数据 ---');

    // 1. 检查 events 表
    const [events] = await db.query('SELECT id, title, start_time FROM events');
    console.log(`\n[Events 表] 共 ${events.length} 条数据:`);
    events.forEach(e => console.log(` - [${e.id}] ${e.title} (${e.start_time})`));

    // 2. 检查 todos 表
    const [todos] = await db.query('SELECT id, title, priority, done FROM todos');
    console.log(`\n[Todos 表] 共 ${todos.length} 条数据:`);
    todos.forEach(t => console.log(` - [${t.id}] ${t.title} [${t.priority}] (Done: ${t.done})`));

    process.exit(0);
  } catch (err) {
    console.error('查询失败:', err);
    process.exit(1);
  }
}

checkData();
