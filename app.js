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
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        return this.todos.filter(todo => {
            const todoDate = new Date(todo.completed ? todo.completedTime : todo.plannedTime);
            
            switch(this.currentFilter) {
                case 'today':
                    return todoDate >= today;
                case 'week':
                    return todoDate >= weekStart;
                case 'month':
                    return todoDate >= monthStart;
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
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    loadTodos() {
        const savedTodos = localStorage.getItem('todos');
        this.todos = savedTodos ? JSON.parse(savedTodos) : [];
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});