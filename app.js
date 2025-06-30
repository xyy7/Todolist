// 待办事项应用主逻辑
class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'today';
        this.initElements();
        this.loadTodos();
        this.setupEventListeners();
        this.setDefaultDate();
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
        // 处理时区问题，确保获取本地日期
        const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        const today = localDate.toISOString().split('T')[0];
        this.todoDate.value = today;
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
        const plannedTime = this.todoDate.value;
        
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
        this.renderTodos();
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.renderTodos();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderTodos();
    }

    filterTodos() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
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

        // 检查今日任务是否全部完成
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayTasks = this.todos.filter(todo => {
            const plannedDate = new Date(todo.plannedTime);
            return plannedDate >= today && plannedDate < new Date(today.getTime() + 86400000);
        });

        if (todayTasks.length > 0 && todayTasks.every(t => t.completed)) {
            this.showEncouragement(todayTasks.length);
        } else {
            this.hideEncouragement();
        }

        // 移除所有可能存在的月份标题
        const existingTitle = this.pendingList.previousElementSibling;
        if (existingTitle && existingTitle.tagName === 'H3') {
            existingTitle.remove();
        }

        // 仅在本月筛选时显示月份标题
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
        
        const time = document.createElement('span');
        time.className = 'todo-time';
        time.textContent = this.formatTime(todo.completed ? todo.completedTime : todo.plannedTime);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));
        
        li.appendChild(checkbox);
        li.appendChild(content);
        li.appendChild(time);
        li.appendChild(deleteBtn);
        
        list.appendChild(li);
    }

    formatTime(isoString) {
        const date = new Date(isoString);
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
        
        // 清除今日已完成任务
        this.clearCompletedTasks('today');
        
        // 检查是否需要周重置
        this.checkWeekReset();

        // 检查是否需要月重置
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

    // 检查是否为周日或周一
    isNewWeek() {
        const now = new Date();
        const day = now.getDay(); // 0是周日，1是周一
        return day === 0 || day === 1;
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
        if (!this.isNewWeek()) return;

        const currentWeek = this.getCurrentWeekNumber();
        const lastResetWeek = localStorage.getItem('lastResetWeek');
        
        // 如果已经重置过本周，则不再重置
        if (lastResetWeek && parseInt(lastResetWeek) === currentWeek) return;

        // 清除本周已完成任务
        this.clearCompletedTasks('week');

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
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
        // 统一使用本地时区处理
        const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        const today = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // 查找昨日未完成任务
        const yesterdayTasks = this.todos.filter(todo => {
            // 统一使用本地时区处理计划日期
            const plannedDate = new Date(new Date(todo.plannedTime).getTime() - new Date(todo.plannedTime).getTimezoneOffset() * 60000);
            return !todo.completed &&
                   plannedDate >= yesterday &&
                   plannedDate < today;
        });

        console.log('昨日未完成任务:', yesterdayTasks); // 调试日志

        if (yesterdayTasks.length === 0) return;

        // 检查是否有记住的选择
        const autoTransfer = localStorage.getItem('autoTransfer');
        if (autoTransfer === 'true') {
            // 自动转移任务
            const todayStr = today.toISOString().split('T')[0];
            yesterdayTasks.forEach(task => {
                task.plannedTime = todayStr;
            });
            this.saveTodos();
            // 强制刷新显示
            this.setFilter(this.currentFilter);
        } else if (autoTransfer !== 'false') {
            // 显示弹窗询问用户
            this.showTransferModal(yesterdayTasks, today.toISOString().split('T')[0]);
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