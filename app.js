/**
 * 待办事项应用主类
 * 功能:
 * - 管理待办任务列表(增删改查)
 * - 支持按日/周/月筛选任务
 * - 自动处理任务重置和转移
 * - 本地存储持久化
 */
class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = localStorage.getItem('currentFilter') || 'today';
        this.initElements();
        this.loadTodos();
        this.setupEventListeners();
        this.setDefaultDate();
        // 初始化时设置按钮高亮
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
        this.renderTodos();
    }

    /**
     * 初始化DOM元素引用
     * 获取页面中所有需要操作的HTML元素
     * 包括:
     * - 输入框(todo-input)
     * - 日期选择器(todo-date)
     * - 添加按钮(add-btn)
     * - 待办/已完成列表容器
     * - 筛选按钮组
     */
    initElements() {
        this.todoInput = document.getElementById('todo-input');
        this.todoDate = document.getElementById('todo-date');
        this.addBtn = document.getElementById('add-btn');
        this.pendingList = document.getElementById('pending-list');
        this.completedList = document.getElementById('completed-list');
        this.filterButtons = document.querySelectorAll('.filter-btn');
    }

    /**
     * 设置默认日期为当前日期(本地时区)
     * 格式: YYYY-MM-DD (如2025-07-10)
     * 注意: 使用本地时区，不考虑UTC
     */
    setDefaultDate() {
        const now = new Date(); // 本地时区当前时间
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份补零
        const day = String(now.getDate()).padStart(2, '0'); // 日期补零
        this.todoDate.value = `${year}-${month}-${day}`; // 格式化为YYYY-MM-DD
    }

    /**
     * 检查日期是否已变更(从昨天到今天)
     * 当页面重新获得焦点时触发(visibilitychange事件)
     * 如果检测到日期变更，则重置为当前日期
     */
    checkDateChange() {
        const currentDate = this.todoDate.value;
        const today = new Date().toISOString().split('T')[0];
        if (currentDate !== today) {
            this.setDefaultDate();
        }
    }

    /**
     * 设置所有事件监听器
     * 包括:
     * 1. 页面可见性变化监听(用于检测日期变更)
     * 2. 添加任务按钮点击事件
     * 3. 输入框回车事件
     * 4. 筛选按钮点击事件
     */
    setupEventListeners() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.checkDateChange();
            }
        });
        this.addBtn.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // 为每个筛选按钮添加点击事件监听器
        // 当按钮被点击时，调用setFilter方法并传入按钮的data-filter属性值
        // 支持的筛选类型包括: today(今日)、week(本周)、month(本月)
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });
    }

    /**
     * 添加新任务
     * 流程:
     * 1. 获取输入内容和计划日期
     * 2. 创建新任务对象(包含唯一ID)
     * 3. 添加到任务数组
     * 4. 保存到本地存储
     * 5. 重新渲染列表
     * 6. 清空输入框并重置日期
     */
    addTodo() {
        const content = this.todoInput.value.trim();
        const plannedTime = this.todoDate.value; // 直接存YYYY-MM-DD
        if (!content) return;
        const newTodo = {
            id: Date.now().toString(),
            content,
            plannedTime,
            completed: false,
            completedTime: null
        };
        this.todos.push(newTodo);
        this.saveTodos();
        this.renderTodos();
        this.todoInput.value = '';
        this.todoInput.focus();
        this.setDefaultDate();
    }

    /**
     * 切换任务完成状态
     * @param {string} id - 任务ID
     * 功能:
     * - 查找对应任务
     * - 反转completed状态
     * - 更新完成时间(如果标记为完成)
     * - 检查是否是最后一个未完成任务
     * - 保存更改并重新渲染
     */
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;
        todo.completed = !todo.completed;
        todo.completedTime = todo.completed ? new Date().toISOString() : null;
        this.saveTodos();
        // 检查是否是最后一个未完成任务被完成
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayTasks = this.todos.filter(todo => {
            const [y, m, d] = todo.plannedTime.split('-').map(Number);
            const plannedDate = new Date(y, m - 1, d);
            return plannedDate >= today && plannedDate < new Date(today.getTime() + 86400000);
        });
        if (todayTasks.length > 0 && todayTasks.every(t => t.completed)) {
            this.showEncouragement(todayTasks.length);
        }
        this.renderTodos();
    }

    /**
     * 删除指定任务
     * @param {string} id - 要删除的任务ID
     * 流程:
     * 1. 过滤掉指定ID的任务
     * 2. 保存到本地存储
     * 3. 重新渲染列表
     */
    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.renderTodos();
    }

    /**
     * 设置当前任务筛选条件
     * @param {string} filter - 筛选类型(today/week/month)
     * 功能:
     * 1. 更新当前筛选状态
     * 2. 持久化到localStorage
     * 3. 更新按钮高亮状态
     * 4. 重新渲染任务列表
     */
    setFilter(filter) {
        this.currentFilter = filter;
        localStorage.setItem('currentFilter', filter);
        console.info(`[调试] 当前过滤条件已记住: ${filter}`);
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderTodos();
    }

    /**
     * 根据当前筛选条件过滤任务
     * 使用本地时区进行日期比较
     * 支持三种筛选模式:
     * - today: 当天任务(本地时区)
     * - week: 本周任务(周一至周日)
     * - month: 当月任务
     *
     * 日期处理说明:
     * 1. 所有日期比较都精确到毫秒级别
     * 2. 周范围: 周一00:00:00.000 到 周日23:59:59.999
     * 3. 日范围: 当天00:00:00.000 到 23:59:59.999
     * 4. 月范围: 1号00:00:00.000 到 月末日23:59:59.999
     */
    filterTodos() {
        const now = new Date(); // 本地时区当前时间
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0); // 当天00:00:00.000
        
        // 计算本周范围(周一00:00:00.000 到 周日23:59:59.999)
        const weekStart = new Date(today);
        // 处理周日(day=0)的特殊情况: 减去6天得到周一
        // 其他情况: 减去(当前星期几-1)天得到周一
        const dayOfWeek = today.getDay();
        weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        weekStart.setHours(0, 0, 0, 0); // 确保设置为周一00:00:00
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // 本周日
        weekEnd.setHours(23, 59, 59, 999); // 确保设置为周日23:59:59.999

        // 月范围(1号00:00:00.000 到 月末日23:59:59.999)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        return this.todos.filter(todo => {
            const plannedDate = new Date(todo.plannedTime);
            
            switch(this.currentFilter) {
                case 'today':
                    return plannedDate >= today && plannedDate < new Date(today.getTime() + 86400000);
                case 'week':
                    // 确保包含整个周的范围
                    return plannedDate >= weekStart && plannedDate <= weekEnd;
                case 'month': {
                    const plannedMonth = plannedDate.getMonth();
                    const plannedYear = plannedDate.getFullYear();
                    const currentMonth = now.getMonth();
                    const currentYear = now.getFullYear();
                    return plannedMonth === currentMonth && plannedYear === currentYear;
                }
                default:
                    return true;
            }
        });
    }

        /**
         * 渲染任务列表
         * 1. 清空现有列表内容
         * 2. 获取筛选后的任务列表
         * 3. 将任务分为待办和已完成两类:
         *    - 待办任务: 按计划时间升序排序
         *    - 已完成任务: 按完成时间降序排序
         * 4. 处理月份标题显示逻辑(仅在月视图显示)
         * 5. 渲染每个任务项到对应列表
         */
        renderTodos() {
            // 清空待办和已完成列表
            this.pendingList.innerHTML = '';
            this.completedList.innerHTML = '';
    
            // 获取筛选后的任务并按状态分类
            const filteredTodos = this.filterTodos();
            const pendingTodos = filteredTodos.filter(t => !t.completed)
                .sort((a, b) => new Date(a.plannedTime) - new Date(b.plannedTime));
            const completedTodos = filteredTodos.filter(t => t.completed)
                .sort((a, b) => new Date(b.completedTime) - new Date(a.completedTime));
    
            // 仅在本月筛选时显示月份标题，且只插入一行
            // 先检查并移除已存在的月份标题(避免重复添加)
            const prev = this.pendingList.previousElementSibling;
            if (prev && prev.classList && prev.classList.contains('month-title')) {
                prev.remove();
            }
            // 如果是月视图，添加当前月份标题
            if (this.currentFilter === 'month') {
                const now = new Date();
                const monthTitle = document.createElement('h3');
                monthTitle.className = 'month-title';
                monthTitle.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月`;
                this.pendingList.before(monthTitle);
            }
    
            // 渲染待办和已完成任务
            pendingTodos.forEach(todo => this.renderTodo(todo, this.pendingList));
            completedTodos.forEach(todo => this.renderTodo(todo, this.completedList));
        }
    
        /**
         * 渲染单个任务项
         * @param {Object} todo - 任务对象
         * @param {HTMLElement} list - 要添加到的列表元素
         * 创建的任务项包含:
         * 1. 复选框 - 用于切换完成状态
         * 2. 任务内容文本
         * 3. 时间显示(计划时间或完成时间)
         * 4. 删除按钮
         */
        renderTodo(todo, list) {
            const li = document.createElement('li');
            
            // 创建复选框并绑定事件
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = todo.completed;
            checkbox.addEventListener('change', () => this.toggleTodo(todo.id));
            
            // 创建任务内容显示区域
            const content = document.createElement('span');
            content.className = 'todo-content' + (todo.completed ? ' completed' : '');
            content.textContent = todo.content;
            
            li.appendChild(checkbox);
            li.appendChild(content);
    
            // 未完成事项显示计划时间
            if (!todo.completed) {
                const time = document.createElement('span');
                time.className = 'todo-time';
                time.textContent = this.formatTime(todo.plannedTime);
                li.appendChild(time);
            }
            // 已完成事项显示完成时间
            if (todo.completed) {
                const time = document.createElement('span');
                time.className = 'todo-time';
                time.textContent = this.formatTime(todo.completedTime);
                li.appendChild(time);
            }
    
            // 添加删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));
            li.appendChild(deleteBtn);
    
            // 将任务项添加到指定列表
            list.appendChild(li);
        }

    /**
     * 格式化日期显示
     * @param {string} isoString - 日期字符串(YYYY-MM-DD或ISO格式)
     * @returns {string} 格式化后的日期字符串(如"7月10日 周四")
     * 注意:
     * - 输入可以是YYYY-MM-DD格式(如2025-07-10)
     * - 或ISO格式(如2025-07-10T16:00:00.000Z)
     * - 输出使用本地时区解析
     */
    formatTime(isoString) {
        if (!isoString) return '';
        // 只处理YYYY-MM-DD或ISO字符串
        let date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
            const [y, m, d] = isoString.split('-').map(Number);
            date = new Date(y, m - 1, d); // 本地时区日期对象
        } else {
            date = new Date(isoString); // 自动解析ISO字符串为本地时区
        }
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[date.getDay()]; // 获取星期几(0-6)
        return `${date.getMonth()+1}月${date.getDate()}日 ${weekday}`; // 格式化为"X月X日 周X"
    }

    /**
     * 将任务列表保存到localStorage
     * 使用JSON序列化存储任务数组
     * 在以下情况调用:
     * - 添加新任务
     * - 切换任务状态
     * - 删除任务
     * - 任务重置/转移
     */
    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    /**
     * 从localStorage加载任务列表
     * 执行以下检查:
     * 1. 周重置检查(每周一)
     * 2. 月重置检查(每月1号)
     * 3. 昨日任务转移检查
     * 如果没有存储数据则初始化空数组
     */
    loadTodos() {
        const savedTodos = localStorage.getItem('todos');
        this.todos = savedTodos ? JSON.parse(savedTodos) : [];
        // 检查是否需要转移昨日任务
        this.checkYesterdayTasks();
    }

    /**
     * 检查昨日未完成任务并处理转移
     * 主要功能:
     * 1. 找出所有计划日期为昨日且未完成的任务
     * 2. 根据用户设置(autoTransfer)处理这些任务:
     *    - 如果autoTransfer为true: 自动将任务转移到今天
     *    - 如果autoTransfer为false: 不做任何操作
     *    - 其他情况: 显示确认对话框让用户选择
     *
     * 处理流程:
     * 1. 计算昨日日期(本地时区)
     * 2. 过滤出计划日期为昨日且未完成的任务
     * 3. 检查localStorage中的autoTransfer设置
     * 4. 根据设置执行自动转移或显示对话框
     *
     * 注意事项:
     * - 所有日期比较都使用本地时区
     * - 任务转移后会立即保存到localStorage
     * - 转移后会重新渲染任务列表
     */
    checkYesterdayTasks() {
        // 获取今日和昨日日期对象(本地时区)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // 过滤出昨日未完成的任务
        const yesterdayTasks = this.todos.filter(todo => {
            // 跳过没有计划日期或已完成的任务
            if (!todo.plannedTime || todo.completed) return false;
            
            // 解析任务计划日期为Date对象
            const [y, m, d] = todo.plannedTime.split('-').map(Number);
            const plannedDate = new Date(y, m - 1, d);
            
            // 比较日期组件(日/月/年)判断是否为昨日
            return plannedDate.getDate() === yesterday.getDate() &&
                   plannedDate.getMonth() === yesterday.getMonth() &&
                   plannedDate.getFullYear() === yesterday.getFullYear();
        });

        // 如果没有昨日未完成任务则直接返回
        if (yesterdayTasks.length === 0) return;
        
        // 获取用户设置的自动转移偏好
        const autoTransfer = localStorage.getItem('autoTransfer');
        
        if (autoTransfer === 'true') {
            // 自动转移模式: 将所有昨日任务转移到今天
            const todayStr = today.toISOString().split('T')[0]; // 格式化为YYYY-MM-DD
            yesterdayTasks.forEach(task => {
                task.plannedTime = todayStr; // 更新计划日期为今天
            });
            this.saveTodos(); // 保存修改
            this.renderTodos(); // 重新渲染列表
        } else if (autoTransfer !== 'false') {
            // 需要用户确认的模式: 显示转移确认对话框
            const todayStr = today.toISOString().split('T')[0];
            this.showTransferModal(yesterdayTasks, todayStr);
        }
    }

    /**
     * 清除指定时间段内的已完成任务
     * @param {string} period - 时间段(today/week/month)
     * 根据时间段计算日期范围并过滤任务
     * 注意: 使用本地时区进行日期比较
     */
    clearCompletedTasks(period) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let startDate, endDate;
        
        switch(period) {
            case 'today':
                startDate = today;
                endDate = new Date(today.getTime() + 86400000);
                break;
            case 'week':
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - startDate.getDay());
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            default:
                return;
        }

        // 过滤出指定时间段内的已完成任务
        const completedTasks = this.todos.filter(todo => {
            const plannedDate = new Date(todo.plannedTime);
            return todo.completed &&
                   plannedDate >= startDate &&
                   plannedDate <= endDate;
        });

        if (completedTasks.length > 0) {
            // 移除已完成任务
            this.todos = this.todos.filter(todo => {
                const plannedDate = new Date(todo.plannedTime);
                return !(todo.completed &&
                        plannedDate >= startDate &&
                        plannedDate <= endDate);
            });
            this.saveTodos();
        }
    }

    /**
     * 显示鼓励消息(当完成当日所有任务时)
     * @param {number} count - 完成的任务数量
     * 1. 随机选择鼓励语
     * 2. 显示消息2秒后自动隐藏
     * 3. 可触发烟花效果
     */
    showEncouragement(count) {
        const messages = [
            `太棒了！完成了${count}个任务！`,
            `完美！今日${count}项任务全部搞定！`,
            `效率真高！已完成${count}项工作！`
        ];
        const text = messages[Math.floor(Math.random() * messages.length)];
        const el = document.getElementById('encouragement');
        const textEl = document.getElementById('encouragement-text');
        textEl.textContent = text;
        el.classList.remove('hidden');
        if (this._encourageTimer) clearTimeout(this._encourageTimer);
        this._encourageTimer = setTimeout(() => {
            el.classList.add('hidden');
        }, 2000);
    }

    /**
     * 创建庆祝烟花效果
     * 使用confetti.js库实现
     * 包含:
     * 1. 中心爆炸效果
     * 2. 两侧飘落的彩带
     */
    createConfetti() {
        // 烟花爆炸效果
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
        });

        // 添加一些飘落的彩带
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#ff0000', '#00ff00', '#0000ff']
            });
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#ffff00', '#ff00ff', '#00ffff']
            });
        }, 250);
    }

    /**
     * 隐藏鼓励消息
     * 手动调用或自动超时后调用
     */
    hideEncouragement() {
        document.getElementById('encouragement').classList.add('hidden');
    }

    /**
     * 显示任务转移确认对话框
     * @param {Array} tasks - 需要转移的任务数组
     * @param {string} todayDate - 今天的日期字符串(YYYY-MM-DD格式)
     *
     * 功能流程:
     * 1. 获取对话框DOM元素和操作按钮
     * 2. 显示对话框(modal.style.display = 'flex')
     * 3. 设置"是"按钮点击事件:
     *    - 转移任务到今日(处理时区偏移)
     *    - 保存到localStorage
     *    - 记住用户选择(如果勾选记住选项)
     *    - 关闭对话框并刷新界面
     * 4. 设置"否"按钮点击事件:
     *    - 记住用户选择(如果勾选记住选项)
     *    - 关闭对话框
     *
     * 时区处理:
     * - 使用本地时区计算当前日期
     * - 避免UTC时区导致的日期偏差
     */
    showTransferModal(tasks, todayDate) {
        // 获取对话框相关DOM元素
        const modal = document.getElementById('transfer-modal');       // 对话框容器
        const yesBtn = document.getElementById('transfer-yes');        // 确认按钮
        const noBtn = document.getElementById('transfer-no');         // 取消按钮
        const rememberCheck = document.getElementById('remember-choice'); // "记住选择"复选框

        // 显示对话框(flex布局居中显示)
        modal.style.display = 'flex';

        // "是"按钮点击事件 - 确认转移任务
        yesBtn.onclick = () => {
            // 遍历所有待转移任务
            tasks.forEach(task => {
                // 处理时区问题: 获取本地时区的当前日期
                const now = new Date();  // 当前时间(可能包含时区偏移)
                // 计算本地时区日期(减去时区偏移分钟数)
                const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                // 更新任务计划时间为今天(格式化为YYYY-MM-DD)
                task.plannedTime = localNow.toISOString().split('T')[0];
                console.log('任务迁移:', task.content, '新日期:', task.plannedTime);
            });

            // 保存修改后的任务列表
            this.saveTodos();

            // 如果用户勾选了"记住选择"，则保存自动转移设置
            if (rememberCheck.checked) {
                localStorage.setItem('autoTransfer', 'true');
            }

            // 关闭对话框
            modal.style.display = 'none';
            
            // 重新渲染任务列表
            this.renderTodos();
            
            // 强制刷新当前筛选条件显示
            this.setFilter(this.currentFilter);
        };

        // "否"按钮点击事件 - 取消转移
        noBtn.onclick = () => {
            // 如果用户勾选了"记住选择"，则保存不自动转移的设置
            if (rememberCheck.checked) {
                localStorage.setItem('autoTransfer', 'false');
            }
            
            // 关闭对话框
            modal.style.display = 'none';
        };
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});

// ====== 调试面板功能 ======
(function() {
    const debugPanel = document.getElementById('debug-panel');
    const debugMessages = document.getElementById('debug-messages');
    const toggleBtn = document.getElementById('toggle-debug');
    const clearBtn = document.getElementById('clear-debug');
    let debugLog = [];
    const MAX_LOG = 200;
    let panelVisible = false;

    function renderDebug() {
        debugMessages.innerHTML = debugLog.map(item => `<div>${item}</div>`).join('');
        debugMessages.scrollTop = debugMessages.scrollHeight;
    }

    function addDebug(msg) {
        debugLog.push(msg);
        if (debugLog.length > MAX_LOG) debugLog = debugLog.slice(-MAX_LOG);
        renderDebug();
    }

    toggleBtn.addEventListener('click', () => {
        panelVisible = !panelVisible;
        debugPanel.classList.toggle('hidden', !panelVisible);
        toggleBtn.textContent = panelVisible ? '隐藏调试面板' : '显示调试面板';
    });
    clearBtn.addEventListener('click', () => {
        debugLog = [];
        renderDebug();
    });

    /**
     * 重写console方法以实现调试面板输出
     * 1. 遍历四种日志类型(log/info/warn/error)
     * 2. 保存原始console方法引用
     * 3. 创建新的console方法实现:
     *    - 保持原有控制台输出功能(raw.apply)
     *    - 将参数转换为可读字符串:
     *      * 对象尝试JSON序列化
     *      * 其他类型直接转为字符串
     *    - 根据日志类型添加不同颜色样式
     *    - 调用addDebug输出到调试面板
     */
    ['log','info','warn','error'].forEach(type => {
        // 保存原始console方法
        const raw = console[type];
        
        // 重写console方法
        console[type] = function(...args) {
            // 1. 保持原始控制台输出
            raw.apply(console, args);
            
            // 2. 处理参数为可读字符串
            const msg = args.map(a => {
                if (typeof a === 'object') {
                    try {
                        return JSON.stringify(a); // 尝试序列化对象
                    } catch {
                        return '[object]'; // 序列化失败时返回占位符
                    }
                }
                return String(a); // 非对象直接转为字符串
            }).join(' '); // 合并所有参数
            
            // 3. 根据日志类型设置颜色并输出到调试面板
            const color = type === 'error' ? '#ff5252' :  // 错误-红色
                          type === 'warn'  ? '#ffd600' :  // 警告-黄色
                          '#fff';                         // 其他-白色
            addDebug(`<span style="color:${color}">[${type}]</span> ${msg}`);
        };
    });
})();