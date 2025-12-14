const db = require('./db');

async function fixBadData() {
  try {
    console.log('正在修复标题为空的脏数据...');

    // 修复 t1, t2, t3
    await db.query(`UPDATE todos SET title = '欢迎使用 Canlder 清单' WHERE id = 't1' AND (title = '' OR title IS NULL)`);
    await db.query(`UPDATE todos SET title = '左滑可以删除我' WHERE id = 't2' AND (title = '' OR title IS NULL)`);
    await db.query(`UPDATE todos SET title = '右滑可以标记重要' WHERE id = 't3' AND (title = '' OR title IS NULL)`);

    console.log('数据修复完成！');
    process.exit(0);
  } catch (err) {
    console.error('修复失败:', err);
    process.exit(1);
  }
}

fixBadData();
