# 移动端待办事项应用HTML设计方案

## 整体结构
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>待办事项</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- 顶部输入区域 -->
    <header class="todo-header">
        <h1 class="app-title">待办事项</h1>
        
        <div class="input-group">
            <input type="text" id="todo-input" class="todo-input" placeholder="添加新事项...">
            <select id="quick-select" class="quick-select">
                <option value="">快速选择</option>
                <option value="会议">会议</option>
                <option value="购物">购物</option>
            </select>
        </div>
        
        <div class="date-picker">
            <label for="todo-date">日期:</label>
            <input type="date" id="todo-date" class="todo-date" value="">
        </div>
    </header>

    <!-- 主要内容区 -->
    <main class="todo-container">
        <!-- 时间筛选按钮 -->
        <div class="filter-buttons">
            <button class="filter-btn active" data-filter="today">今天</button>
            <button class="filter-btn" data-filter="week">本周</button>
            <button class="filter-btn" data-filter="month">本月</button>
            <button class="filter-btn" data-filter="all">全部</button>
        </div>

        <!-- 待办事项列表 -->
        <section class="todo-list-section">
            <h2 class="section-title">待办事项</h2>
            <ul id="pending-list" class="todo-list">
                <!-- 示例项目 -->
                <li class="todo-item" data-date="2025-06-30" data-time="09:00">
                    <input type="checkbox" class="todo-check">
                    <span class="todo-text">完成项目设计</span>
                    <span class="todo-time">09:00</span>
                    <button class="delete-btn">×</button>
                </li>
            </ul>
        </section>

        <!-- 已完成事项列表 -->
        <section class="completed-list-section">
            <h2 class="section-title">已完成</h2>
            <ul id="completed-list" class="todo-list completed">
                <!-- 示例项目 -->
                <li class="todo-item completed" data-date="2025-06-29" data-completed="2025-06-29 15:30">
                    <input type="checkbox" class="todo-check" checked>
                    <span class="todo-text">购买食材</span>
                    <span class="completed-time">15:30完成</span>
                    <button class="delete-btn">×</button>
                </li>
            </ul>
        </section>
    </main>

    <script src="app.js"></script>
</body>
</html>