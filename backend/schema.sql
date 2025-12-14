-- 创建数据库
CREATE DATABASE IF NOT EXISTS caldaner;
USE caldaner;

-- 创建事件表
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  start_time VARCHAR(64) NOT NULL, -- 存储 ISO 字符串
  end_time VARCHAR(64) NOT NULL,   -- 存储 ISO 字符串
  timezone VARCHAR(64),
  all_day BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,      -- 存储 recurrence.rrule 字符串
  recurrence_exdates TEXT,   -- 存储 recurrence.exdates (JSON 数组字符串)
  alarms JSON,               -- 存储 alarms (JSON 数组)
  notification_ids JSON,     -- 存储 notificationIds (JSON 数组)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
