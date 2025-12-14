const db = require('./db');
const { v4: uuidv4 } = require('uuid'); // 需要先处理 uuid 生成，这里简单用 Math.random 或者手动生成，避免引入新包导致报错，或者直接用时间戳

async function seed() {
  try {
    console.log('开始插入测试数据...');

    // 清空现有数据（可选，这里为了演示纯净效果先不清空，直接追加，或者为了避免主键冲突最好用新 ID）
    // await db.query('DELETE FROM events');

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = [
      {
        id: `seed_${Date.now()}_1`,
        title: '项目启动会议',
        description: '讨论前后端接口联调细节',
        location: '线上会议室',
        start_time: now.toISOString(), // ISO 格式
        end_time: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        timezone: 'Asia/Shanghai',
        all_day: false,
        alarms: JSON.stringify([{ offsetMinutes: 10 }]),
        notification_ids: JSON.stringify([])
      },
      {
        id: `seed_${Date.now()}_2`,
        title: '提交代码审核',
        description: '检查代码规范',
        location: '工位',
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
        timezone: 'Asia/Shanghai',
        all_day: false,
        alarms: JSON.stringify([]),
        notification_ids: JSON.stringify([])
      }
    ];

    for (const event of events) {
      await db.query(
        `INSERT INTO events 
        (id, title, description, location, start_time, end_time, timezone, all_day, alarms, notification_ids) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.title,
          event.description,
          event.location,
          event.start_time,
          event.end_time,
          event.timezone,
          event.all_day,
          event.alarms,
          event.notification_ids
        ]
      );
      console.log(`已插入事件: ${event.title}`);
    }

    console.log('测试数据插入成功！');
    process.exit(0);
  } catch (err) {
    console.error('插入失败:', err);
    process.exit(1);
  }
}

seed();
