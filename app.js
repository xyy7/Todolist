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
        const today = new Date().toISOString().split('T')[0];
        this.todoDate.value = today;
    }

    setupEventListeners() {
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
        
        // 检查是否需要转移昨日任务
        this.checkYesterdayTasks();
    }

    checkYesterdayTasks() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // 查找昨日未完成任务
        const yesterdayTasks = this.todos.filter(todo => {
            const plannedDate = new Date(todo.plannedTime);
            return !todo.completed &&
                   plannedDate >= yesterday &&
                   plannedDate < today;
        });

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

    showTransferModal(tasks, todayDate) {
        const modal = document.getElementById('transfer-modal');
        const yesBtn = document.getElementById('transfer-yes');
        const noBtn = document.getElementById('transfer-no');
        const rememberCheck = document.getElementById('remember-choice');

        modal.style.display = 'flex';

        yesBtn.onclick = () => {
            // 转移任务到今日
            tasks.forEach(task => {
                // 更新计划时间为今天并格式化为YYYY-MM-DD
                const today = new Date();
                task.plannedTime = today.toISOString().split('T')[0];
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