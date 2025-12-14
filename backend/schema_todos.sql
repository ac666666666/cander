-- 创建清单表
CREATE TABLE IF NOT EXISTS todos (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
  deadline VARCHAR(64),
  created_at BIGINT,
  quadrant VARCHAR(10)
);
