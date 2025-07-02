// 待办事项应用主逻辑
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

    initElements() {
        this.todoInput = document.getElementById('todo-input');
        this.todoDate = document.getElementById('todo-date');
        this.addBtn = document.getElementById('add-btn');
        this.pendingList = document.getElementById('pending-list');
        this.completedList = document.getElementById('completed-list');
        this.filterButtons = document.querySelectorAll('.filter-btn');
    }

    setDefaultDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        this.todoDate.value = `${year}-${month}-${day}`;
    }

    checkDateChange() {
        const currentDate = this.todoDate.value;
        const today = new Date().toISOString().split('T')[0];
        if (currentDate !== today) {
            this.setDefaultDate();
        }
    }

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

        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });
    }

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

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.renderTodos();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        localStorage.setItem('currentFilter', filter);
        console.info(`[调试] 当前过滤条件已记住: ${filter}`);
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderTodos();
    }

    filterTodos() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // 计算本周一作为周开始(day=1)
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        return this.todos.filter(todo => {
            const plannedDate = new Date(todo.plannedTime);
            
            switch(this.currentFilter) {
                case 'today':
                    return plannedDate >= today && plannedDate < new Date(today.getTime() + 86400000);
                case 'week':
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

    renderTodos() {
        this.pendingList.innerHTML = '';
        this.completedList.innerHTML = '';

        const filteredTodos = this.filterTodos();
        const pendingTodos = filteredTodos.filter(t => !t.completed)
            .sort((a, b) => new Date(a.plannedTime) - new Date(b.plannedTime));
        const completedTodos = filteredTodos.filter(t => t.completed)
            .sort((a, b) => new Date(b.completedTime) - new Date(a.completedTime));

        // 仅在本月筛选时显示月份标题，且只插入一行
        // 先移除所有已存在的月份标题
        const prev = this.pendingList.previousElementSibling;
        if (prev && prev.classList && prev.classList.contains('month-title')) {
            prev.remove();
        }
        if (this.currentFilter === 'month') {
            const now = new Date();
            const monthTitle = document.createElement('h3');
            monthTitle.className = 'month-title';
            monthTitle.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月`;
            this.pendingList.before(monthTitle);
        }
        pendingTodos.forEach(todo => this.renderTodo(todo, this.pendingList));
        completedTodos.forEach(todo => this.renderTodo(todo, this.completedList));
    }

    renderTodo(todo, list) {
        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => this.toggleTodo(todo.id));
        const content = document.createElement('span');
        content.className = 'todo-content' + (todo.completed ? ' completed' : '');
        content.textContent = todo.content;
        li.appendChild(checkbox);
        li.appendChild(content);
        // 未完成事项在所有筛选下都显示时间
        if (!todo.completed) {
            const time = document.createElement('span');
            time.className = 'todo-time';
            time.textContent = this.formatTime(todo.plannedTime);
            li.appendChild(time);
        }
        if (todo.completed) {
            const time = document.createElement('span');
            time.className = 'todo-time';
            time.textContent = this.formatTime(todo.completedTime);
            li.appendChild(time);
        }
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));
        li.appendChild(deleteBtn);
        list.appendChild(li);
    }

    formatTime(isoString) {
        if (!isoString) return '';
        // 只处理YYYY-MM-DD或ISO字符串
        let date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
            const [y, m, d] = isoString.split('-').map(Number);
            date = new Date(y, m - 1, d);
        } else {
            date = new Date(isoString);
        }
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[date.getDay()];
        return `${date.getMonth()+1}月${date.getDate()}日 ${weekday}`;
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    loadTodos() {
        const savedTodos = localStorage.getItem('todos');
        this.todos = savedTodos ? JSON.parse(savedTodos) : [];
        
        // 检查是否需要周重置(周一)
        this.checkWeekReset();

        // 检查是否需要月重置(1号)
        this.checkMonthReset();
        
        // 检查是否需要转移昨日任务
        this.checkYesterdayTasks();
    }

    // 检查并执行月重置
    checkMonthReset() {
        const now = new Date();
        // 如果不是1号，则不处理
        if (now.getDate() !== 1) return;

        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastResetMonth = localStorage.getItem('lastResetMonth');

        // 如果已经重置过本月，则不再重置
        if (lastResetMonth && lastResetMonth === `${currentYear}-${currentMonth}`) return;

        // 清除本月已完成任务
        this.clearCompletedTasks('month');

        // 计算本月开始和结束日期
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);

        // 过滤出本月范围内的未完成任务
        const monthTasks = this.todos.filter(todo => {
            const plannedDate = new Date(todo.plannedTime);
            return !todo.completed && plannedDate >= monthStart && plannedDate <= monthEnd;
        });

        if (monthTasks.length > 0) {
            // 移除本月未完成任务
            this.todos = this.todos.filter(todo => {
                const plannedDate = new Date(todo.plannedTime);
                return !(plannedDate >= monthStart && plannedDate <= monthEnd);
            });
            this.saveTodos();
        }

        // 记录本月已重置
        localStorage.setItem('lastResetMonth', `${currentYear}-${currentMonth}`);
    }

    // 检查是否为周一(每周的第一天)
    isNewWeek() {
        const now = new Date();
        const day = now.getDay(); // 1是周一
        return day === 1;
    }

    // 获取当前周数(基于年份和周数)
    getCurrentWeekNumber() {
        const now = new Date();
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
        const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    // 检查并执行周重置
    checkWeekReset() {
        // 检查是否为周一且不是本周已重置过
        const currentDate = new Date();
        const day = currentDate.getDay();
        if (day !== 1) return; // 只在周一重置
        
        const currentWeek = this.getCurrentWeekNumber();
        const lastResetWeek = localStorage.getItem('lastResetWeek');
        
        // 如果已经重置过本周，则不再重置
        if (lastResetWeek && parseInt(lastResetWeek) === currentWeek) return;

        // 清除本周已完成任务
        this.clearCompletedTasks('week');

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // 计算本周一作为周开始(day=1)
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // 过滤出本周范围内的未完成任务
        const weekTasks = this.todos.filter(todo => {
            const plannedDate = new Date(todo.plannedTime);
            return !todo.completed && plannedDate >= weekStart && plannedDate <= weekEnd;
        });

        if (weekTasks.length > 0) {
            // 移除本周未完成任务
            this.todos = this.todos.filter(todo => {
                const plannedDate = new Date(todo.plannedTime);
                return !(plannedDate >= weekStart && plannedDate <= weekEnd);
            });
            this.saveTodos();
        }

        // 记录本周已重置
        localStorage.setItem('lastResetWeek', currentWeek.toString());
    }

    checkYesterdayTasks() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const today = new Date(year, month - 1, day);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        console.log('[调试] 系统当前日期:', todayStr, '昨日:', yesterdayStr);
        const yesterdayTasks = this.todos.filter(todo => {
            if (!todo.plannedTime) return false;
            const [y, m, d] = todo.plannedTime.split('-').map(Number);
            const plannedDate = new Date(y, m - 1, d);
            const plannedDateStr = `${plannedDate.getFullYear()}-${String(plannedDate.getMonth() + 1).padStart(2, '0')}-${String(plannedDate.getDate()).padStart(2, '0')}`;
            console.log(`[调试] 任务:${todo.content}, plannedDate(本地):`, plannedDateStr);
            return !todo.completed &&
                   plannedDate.getTime() === yesterday.getTime();
        });
        if (yesterdayTasks.length === 0) {
            console.info('昨日没有未完成的任务。');
        } else {
            console.warn(`昨日有${yesterdayTasks.length}个未完成任务：`, yesterdayTasks.map(t => t.content));
        }
        if (yesterdayTasks.length === 0) return;
        const autoTransfer = localStorage.getItem('autoTransfer');
        if (autoTransfer === 'true') {
            yesterdayTasks.forEach(task => {
                task.plannedTime = todayStr;
            });
            this.saveTodos();
            this.setFilter(this.currentFilter);
        } else if (autoTransfer !== 'false') {
            this.showTransferModal(yesterdayTasks, todayStr);
        }
    }

    // 清除已完成任务
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

    hideEncouragement() {
        document.getElementById('encouragement').classList.add('hidden');
    }

    showTransferModal(tasks, todayDate) {
        const modal = document.getElementById('transfer-modal');
        const yesBtn = document.getElementById('transfer-yes');
        const noBtn = document.getElementById('transfer-no');
        const rememberCheck = document.getElementById('remember-choice');

        modal.style.display = 'flex';

        yesBtn.onclick = () => {
            // 转移任务到今日
            tasks.forEach(task => {
                // 使用本地时区更新计划时间为今天
                const now = new Date();
                const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                task.plannedTime = localNow.toISOString().split('T')[0];
                console.log('任务迁移:', task.content, '新日期:', task.plannedTime); // 调试日志
            });
            this.saveTodos();
            if (rememberCheck.checked) {
                localStorage.setItem('autoTransfer', 'true');
            }
            modal.style.display = 'none';
            this.renderTodos();
            // 强制刷新显示
            this.setFilter(this.currentFilter);
        };

        noBtn.onclick = () => {
            if (rememberCheck.checked) {
                localStorage.setItem('autoTransfer', 'false');
            }
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

    // 重写console方法
    ['log','info','warn','error'].forEach(type => {
        const raw = console[type];
        console[type] = function(...args) {
            raw.apply(console, args);
            const msg = args.map(a => {
                if (typeof a === 'object') {
                    try { return JSON.stringify(a); } catch { return '[object]'; }
                }
                return String(a);
            }).join(' ');
            addDebug(`<span style="color:${type==='error'?'#ff5252':type==='warn'?'#ffd600':'#fff'}">[${type}]</span> ${msg}`);
        };
    });
})();