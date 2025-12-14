const db = require('./db');

async function addMoreTodos() {
  try {
    console.log('正在添加更多待办事项...');

    const newTodos = [
      { id: `t_${Date.now()}_1`, title: '完成日历应用开发', done: false, priority: 'high', deadline: new Date().toISOString() },
      { id: `t_${Date.now()}_2`, title: '复习期末考试资料', done: false, priority: 'high', deadline: new Date(Date.now() + 86400000).toISOString() },
      { id: `t_${Date.now()}_3`, title: '去超市买点零食', done: false, priority: 'low', deadline: new Date(Date.now() + 172800000).toISOString() },
      { id: `t_${Date.now()}_4`, title: '晚上跑步 5 公里', done: false, priority: 'medium', deadline: new Date().toISOString() },
      { id: `t_${Date.now()}_5`, title: '周末大扫除', done: false, priority: 'medium', deadline: new Date(Date.now() + 86400000 * 5).toISOString() },
    ];

    for (const todo of newTodos) {
      await db.query(
        `INSERT INTO todos (id, title, done, priority, deadline, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [todo.id, todo.title, todo.done, todo.priority, todo.deadline, Date.now()]
      );
      console.log(`已添加: ${todo.title}`);
    }

    console.log('所有新待办事项添加成功！');
    process.exit(0);
  } catch (err) {
    console.error('添加失败:', err);
    process.exit(1);
  }
}

addMoreTodos();
