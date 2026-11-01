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
        this.searchQuery = '';
        // 批量模式状态
        this.batchMode = false;
        this.selectedIds = new Set();
        this.visibleTodoIds = new Set();
        // 处理视图初始化逻辑
        const defaultView = localStorage.getItem('defaultView');
        const currentFilter = localStorage.getItem('currentFilter');
        const lastUsedFilter = localStorage.getItem('lastUsedFilter');
        
        // 特殊处理'last'默认视图
        if (defaultView === 'last') {
            this.currentFilter = lastUsedFilter || currentFilter || 'today';
        } else {
            // 普通情况：优先使用defaultView，没有则使用currentFilter，最后回退到'today'
            this.currentFilter = defaultView || currentFilter || 'today';
        }
        console.log(`[Init] 初始化视图过滤器: defaultView=${defaultView}, currentFilter=${currentFilter}, lastUsed=${lastUsedFilter}, 最终使用=${this.currentFilter}`);
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
     * - 搜索输入框(search-input)
     */
    initElements() {
        this.todoInput = document.getElementById('todo-input');
        this.todoDate = document.getElementById('todo-date');
        this.addBtn = document.getElementById('add-btn');
        this.pendingList = document.getElementById('pending-list');
        this.completedList = document.getElementById('completed-list');
        this.pinnedSection = document.getElementById('pinned-section');
        this.pinnedList = document.getElementById('pinned-list');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.settingsBtn = document.getElementById('toggle-settings');
        this.settingsPanel = document.getElementById('settings-panel');
        this.autoTransferCheckbox = document.getElementById('auto-transfer');
        this.rememberChoiceCheckbox = document.getElementById('remember-choice'); // 设置面板的复选框
        this.transferRememberCheckbox = document.getElementById('transfer-remember-choice'); // 迁移面板的复选框
        this.defaultViewSelect = document.getElementById('default-view');
        this.debugModeCheckbox = document.getElementById('debug-mode');
        this.saveSettingsBtn = document.getElementById('save-settings');
        
        // 导出控件
        this.exportFormatSelect = document.getElementById('export-format');
        this.exportExecuteBtn = document.getElementById('export-execute');

        // 导入控件
        this.importFileInput = document.getElementById('import-file');
        this.importFileBtn = document.getElementById('import-file-btn');
        this.importPasteBtn = document.getElementById('import-paste-btn');
        this.importTextArea = document.getElementById('import-text');
        this.importTextConfirm = document.getElementById('import-text-confirm');
        
        // 搜索输入框
        this.searchInput = document.getElementById('search-input');
        this.searchClearBtn = document.getElementById('search-clear');
        
        // 搜索框切换控件
        this.toggleSearchBtn = document.getElementById('toggle-search');
        this.searchSection = document.getElementById('search-section');
        
        // 随机迁移按钮
        this.randomTransferBtn = document.getElementById('random-transfer-btn');

        // 批量模式控件
        this.batchModeBtn = document.getElementById('batch-mode-btn');
        this.batchBar = document.getElementById('batch-bar');
        this.batchSelectedCount = document.getElementById('batch-selected-count');
        this.batchSelectAllBtn = document.getElementById('batch-select-all');
        this.batchCompleteBtn = document.getElementById('batch-complete');
        this.batchPinBtn = document.getElementById('batch-pin');
        this.batchStandbyBtn = document.getElementById('batch-standby');
        this.batchDeleteBtn = document.getElementById('batch-delete');
        this.batchExitBtn = document.getElementById('batch-exit');
        this.standbyCountBadge = document.getElementById('standby-count');
        this.listTitle = document.getElementById('list-title');
        this.completedTitle = document.getElementById('completed-title');
        
        // 初始化调试按钮状态
        const isDebugMode = localStorage.getItem('debugMode') === 'true';
        document.getElementById('toggle-debug').textContent =
            isDebugMode ? '隐藏调试面板' : '显示调试面板';
    }

    /**
     * 设置默认日期为当前日期(本地时区)
     * 格式: YYYY-MM-DD (如2025-07-10)
     * 注意: 使用本地时区，不考虑UTC
     */
    setDefaultDate() {
        this.todoDate.value = this.getTodayStr();
    }

    /**
     * 检查日期是否已变更(从昨天到今天)
     * 当页面重新获得焦点时触发(visibilitychange事件)
     * 如果检测到日期变更，则重置为当前日期
     */
    checkDateChange() {
        const currentDate = this.todoDate.value;
        const today = this.getTodayStr();
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
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });

        // 设置按钮事件
        this.settingsBtn.addEventListener('click', () => {
            this.settingsPanel.classList.toggle('hidden');
            this.loadSettings();
        });

        // 关闭按钮事件(现在同时保存设置)
        document.getElementById('close-settings').addEventListener('click', () => {
            this.saveSettings();
            this.settingsPanel.classList.add('hidden');
        });

        // 为两个"记住选择"复选框添加同步事件
        const syncRememberChoice = (e) => {
            const isChecked = e.target.checked;
            localStorage.setItem('rememberChoice', isChecked ? 'true' : 'false');
            // 同步两个面板的checkbox状态
            if (this.rememberChoiceCheckbox) {
                this.rememberChoiceCheckbox.checked = isChecked;
            }
            if (this.transferRememberCheckbox) {
                this.transferRememberCheckbox.checked = isChecked;
            }
            console.log(`[DEBUG ${new Date().toLocaleString('zh-CN', {hour12: false})}] 记住选择状态更新为: ${isChecked}`);
            console.log(`[DEBUG ${new Date().toLocaleString('zh-CN', {hour12: false})}] 设置面板状态: ${this.rememberChoiceCheckbox?.checked}, 迁移面板状态: ${this.transferRememberCheckbox?.checked}`);
        };

        if (this.rememberChoiceCheckbox) {
            this.rememberChoiceCheckbox.addEventListener('change', syncRememberChoice);
        }
        if (this.transferRememberCheckbox) {
            this.transferRememberCheckbox.addEventListener('change', syncRememberChoice);
        }

        // 导出按钮事件监听
        if (this.exportExecuteBtn) {
            this.exportExecuteBtn.addEventListener('click', () => this.handleExport());
        }

        // 导入：选择文件 / 粘贴文本
        if (this.importFileBtn && this.importFileInput) {
            this.importFileBtn.addEventListener('click', () => this.importFileInput.click());
            this.importFileInput.addEventListener('change', () => {
                const file = this.importFileInput.files && this.importFileInput.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    this.importFromText(String(reader.result || ''));
                    this.importFileInput.value = '';
                };
                reader.onerror = () => alert('读取文件失败，请重试。');
                reader.readAsText(file, 'utf-8');
            });
        }
        if (this.importPasteBtn && this.importTextArea && this.importTextConfirm) {
            this.importPasteBtn.addEventListener('click', () => {
                const willShow = this.importTextArea.classList.contains('hidden');
                this.importTextArea.classList.toggle('hidden', !willShow);
                this.importTextConfirm.classList.toggle('hidden', !willShow);
                if (willShow) this.importTextArea.focus();
            });
            this.importTextConfirm.addEventListener('click', () => {
                const text = this.importTextArea.value;
                if (!text.trim()) {
                    alert('请先粘贴要导入的内容。');
                    return;
                }
                this.importFromText(text);
            });
        }

        // 搜索输入框事件监听
        if (this.searchInput) {
            const updateSearch = () => {
                this.searchQuery = this.searchInput.value.trim().toLowerCase();
                this.updateClearButtonVisibility();
                this.clearSelection();
                this.renderTodos();
            };
            this.searchInput.addEventListener('input', updateSearch);
            // 初始更新
            updateSearch();
        }

        // 清除按钮事件监听
        if (this.searchClearBtn) {
            this.searchClearBtn.addEventListener('click', () => {
                this.searchInput.value = '';
                this.searchQuery = '';
                this.updateClearButtonVisibility();
                this.clearSelection();
                this.renderTodos();
                this.searchInput.focus();
            });
        }

        // 搜索框切换按钮事件监听
        if (this.toggleSearchBtn && this.searchSection) {
            // 初始化搜索框状态
            const isSearchVisible = localStorage.getItem('searchVisible') !== 'false';
            this.searchSection.classList.toggle('collapsed', !isSearchVisible);
            this.searchSection.classList.toggle('expanded', isSearchVisible);
            
            this.toggleSearchBtn.addEventListener('click', () => {
                const isCollapsed = this.searchSection.classList.contains('collapsed');
                this.searchSection.classList.toggle('collapsed', !isCollapsed);
                this.searchSection.classList.toggle('expanded', isCollapsed);
                
                if (isCollapsed) {
                    // 如果展开，聚焦到搜索输入框
                    setTimeout(() => {
                        this.searchInput.focus();
                    }, 100);
                }
                
                // 保存状态到本地存储
                localStorage.setItem('searchVisible', isCollapsed);
                console.log(`[Search] 搜索框 ${isCollapsed ? '显示' : '隐藏'}`);
            });
            
            // 键盘快捷键支持 (Ctrl+K 或 /)
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey && e.key === 'k') || e.key === '/') {
                    e.preventDefault();
                    this.toggleSearchBtn.click();
                }
                
                // ESC键关闭搜索框
                if (e.key === 'Escape' && this.searchSection.classList.contains('expanded')) {
                    this.searchSection.classList.add('collapsed');
                    this.searchSection.classList.remove('expanded');
                    localStorage.setItem('searchVisible', 'false');
                }
            });
        }

        // 随机迁移按钮事件
        if (this.randomTransferBtn) {
            this.randomTransferBtn.addEventListener('click', () => this.handleRandomTransfer());
        }

        // 批量模式事件
        if (this.batchModeBtn) {
            this.batchModeBtn.addEventListener('click', () => this.toggleBatchMode());
        }
        if (this.batchExitBtn) {
            this.batchExitBtn.addEventListener('click', () => this.exitBatchMode());
        }
        if (this.batchSelectAllBtn) {
            this.batchSelectAllBtn.addEventListener('click', () => this.toggleSelectAllVisible());
        }
        if (this.batchCompleteBtn) {
            this.batchCompleteBtn.addEventListener('click', () => this.batchComplete());
        }
        if (this.batchPinBtn) {
            this.batchPinBtn.addEventListener('click', () => this.batchTogglePin());
        }
        if (this.batchStandbyBtn) {
            this.batchStandbyBtn.addEventListener('click', () => this.batchStandby());
        }
        if (this.batchDeleteBtn) {
            this.batchDeleteBtn.addEventListener('click', () => this.batchDelete());
        }
    }

    /**
     * 更新清除按钮的可见性
     */
    updateClearButtonVisibility() {
        if (this.searchClearBtn) {
            const hasText = this.searchInput.value.trim().length > 0;
            this.searchClearBtn.classList.toggle('hidden', !hasText);
        }
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
            completedTime: null,
            pinned: false,
            standby: false
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
        // 保存当前滚动位置
        const scrollY = window.scrollY;
        // 完成前记录今日活动任务是否已全部完成，避免重复鼓励
        const wasAllDone = this.isAllTodayActiveDone();
        todo.completed = !todo.completed;
        todo.completedTime = todo.completed ? new Date().toISOString() : null;
        this.normalizeTodoState(todo);
        this.saveTodos();
        if (todo.completed) {
            this.maybeCelebrateToday([todo.id], wasAllDone);
        }
        this.renderTodos();
        // 在下一帧恢复滚动位置
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
        });
    }

    /**
     * 切换任务置顶状态
     * @param {string} id - 任务ID
     * 置顶任务会跨视图显示在所有列表顶部，按计划日期从早到晚排序
     */
    toggleTodoPin(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;
        // 已完成或待机任务不允许置顶
        if (todo.completed || todo.standby) return;
        const scrollY = window.scrollY;
        todo.pinned = !todo.pinned;
        this.saveTodos();
        this.renderTodos();
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
        });
    }

    /**
     * 删除指定任务
     * @param {string} id - 要删除的任务ID
     * 流程:
     * 1. 保存当前滚动位置
     * 2. 过滤掉指定ID的任务
     * 3. 保存到本地存储
     * 4. 重新渲染列表
     * 5. 恢复滚动位置
     */
    deleteTodo(id) {
        // 保存当前滚动位置
        const scrollY = window.scrollY;
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.renderTodos();
        // 在下一帧恢复滚动位置
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
        });
    }

    /**
     * 生成今天的本地日期字符串(YYYY-MM-DD)
     */
    getTodayStr() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    /**
     * 把任务计划时间转成本地日期字符串(YYYY-MM-DD)
     * 兼容 YYYY-MM-DD 和历史 ISO 时间戳；无效日期返回空字符串
     */
    getTodoLocalDateStr(value) {
        const raw = typeof value === 'string' ? value : (value && value.plannedTime);
        if (!raw) return '';
        const date = this.parseTodoDate(raw);
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    /**
     * 获取所有过期未完成任务，排除待机任务
     */
    getOverdueUnfinishedTodos() {
        const todayStr = this.getTodayStr();
        return this.todos.filter(todo => {
            if (todo.completed || todo.standby) return false;
            const plannedDateStr = this.getTodoLocalDateStr(todo);
            return plannedDateStr !== '' && plannedDateStr < todayStr;
        });
    }

    /**
     * 统一维护任务状态不变量：
     * - 已完成任务不能待机或置顶
     * - 待机任务不能置顶
     */
    normalizeTodoState(todo) {
        todo.standby = todo.standby === true;
        if (todo.completed) {
            todo.standby = false;
            todo.pinned = false;
        } else if (todo.standby) {
            todo.pinned = false;
        }
        return todo;
    }

    /**
     * 今天是否还有未完成的非待机任务；当天没有活动任务时返回 false
     */
    isAllTodayActiveDone() {
        const todayStr = this.getTodayStr();
        const active = this.todos.filter(todo =>
            !todo.standby && this.getTodoLocalDateStr(todo) === todayStr
        );
        return active.length > 0 && active.every(todo => todo.completed);
    }

    /**
     * 从未全部完成变成全部完成时触发一次鼓励
     * @param {Array<string>} completedIds - 本次完成的任务ID
     * @param {boolean} wasAllDone - 修改前的状态
     */
    maybeCelebrateToday(completedIds, wasAllDone) {
        if (wasAllDone || !this.isAllTodayActiveDone()) return;
        const todayStr = this.getTodayStr();
        const completedToday = completedIds.some(id => {
            const todo = this.todos.find(t => t.id === id);
            return todo && this.getTodoLocalDateStr(todo) === todayStr;
        });
        if (!completedToday) return;
        const count = this.todos.filter(todo =>
            !todo.standby && this.getTodoLocalDateStr(todo) === todayStr
        ).length;
        this.showEncouragement(count);
    }

    /**
     * 进入/退出批量模式
     */
    toggleBatchMode() {
        if (this.batchMode) {
            this.exitBatchMode();
            return;
        }
        const scrollY = window.scrollY;
        this.batchMode = true;
        this.selectedIds.clear();
        document.body.classList.add('batch-mode');
        if (this.batchModeBtn) {
            this.batchModeBtn.textContent = '退出批量';
            this.batchModeBtn.classList.add('active');
        }
        if (this.batchBar) this.batchBar.classList.remove('hidden');
        this.renderTodos();
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
        });
    }

    exitBatchMode() {
        const scrollY = window.scrollY;
        this.batchMode = false;
        this.selectedIds.clear();
        document.body.classList.remove('batch-mode');
        if (this.batchModeBtn) {
            this.batchModeBtn.textContent = '批量';
            this.batchModeBtn.classList.remove('active');
        }
        if (this.batchBar) this.batchBar.classList.add('hidden');
        this.renderTodos();
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
        });
    }

    /**
     * 清空批量选择
     */
    clearSelection() {
        // 没有选择时无需扫描 DOM；后续 renderTodos 会重算按钮状态
        if (!this.batchMode || this.selectedIds.size === 0) return;
        this.selectedIds.clear();
        this.refreshSelectionDom();
        this.updateBatchBar();
    }

    /**
     * 把选择集合收敛到当前实际渲染的任务
     */
    getScopedSelectedIds() {
        const scoped = new Set();
        this.selectedIds.forEach(id => {
            if (this.visibleTodoIds.has(id)) scoped.add(id);
        });
        return scoped;
    }

    toggleSelect(id) {
        if (!this.batchMode || !this.visibleTodoIds.has(id)) return;
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }
        this.refreshSelectionDom();
        this.updateBatchBar();
    }

    toggleSelectAllVisible() {
        const visibleIds = Array.from(this.visibleTodoIds);
        const scoped = this.getScopedSelectedIds();
        const allSelected = visibleIds.length > 0 && visibleIds.every(id => scoped.has(id));
        if (allSelected) {
            visibleIds.forEach(id => this.selectedIds.delete(id));
        } else {
            visibleIds.forEach(id => this.selectedIds.add(id));
        }
        this.refreshSelectionDom();
        this.updateBatchBar();
    }

    /**
     * 刷新列表行的选中样式，不整表重绘
     */
    refreshSelectionDom() {
        document.querySelectorAll('#pending-list li, #completed-list li, #pinned-list li').forEach(li => {
            const id = li.dataset.todoId;
            if (!id) return;
            const selected = this.batchMode && this.selectedIds.has(id);
            li.classList.toggle('selected', selected);
            li.setAttribute('aria-selected', selected ? 'true' : 'false');
            const checkbox = li.querySelector('input[type="checkbox"]');
            if (checkbox && this.batchMode) checkbox.checked = selected;
        });
    }

    /**
     * 更新底部批量操作栏和待机数量角标
     */
    /**
     * 获取当前选中且满足条件的任务
     */
    getSelectedTodos(predicate) {
        const scoped = this.getScopedSelectedIds();
        return this.todos.filter(todo => scoped.has(todo.id) && predicate(todo));
    }

    getCompleteTargets() {
        return this.getSelectedTodos(todo => !todo.completed);
    }

    getPinTargets() {
        return this.getSelectedTodos(todo => !todo.completed && !todo.standby);
    }

    getStandbyTargets() {
        const inStandbyView = this.currentFilter === 'standby';
        return this.getSelectedTodos(todo =>
            !todo.completed && (inStandbyView ? todo.standby : !todo.standby)
        );
    }

    /**
     * 统一执行批量修改：一次保存、一次渲染，并保持滚动位置
     */
    runBatchMutation(mutate, afterSave) {
        const scrollY = window.scrollY;
        mutate();
        this.saveTodos();
        if (afterSave) afterSave();
        this.selectedIds.clear();
        this.renderTodos();
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
        });
    }

    updateBatchBar() {
        if (this.standbyCountBadge) {
            const standbyCount = this.todos.filter(todo => todo.standby && !todo.completed).length;
            this.standbyCountBadge.textContent = String(standbyCount);
            this.standbyCountBadge.classList.toggle('hidden', standbyCount === 0);
        }
        // 批量栏隐藏时无需计算各按钮状态
        if (!this.batchMode) return;

        const scoped = this.getScopedSelectedIds();
        const count = scoped.size;
        if (this.batchSelectedCount) {
            this.batchSelectedCount.textContent = `已选 ${count}`;
        }

        const completeTargets = this.getCompleteTargets();
        const pinTargets = this.getPinTargets();
        const standbyTargets = this.getStandbyTargets();

        if (this.batchCompleteBtn) this.batchCompleteBtn.disabled = completeTargets.length === 0;
        if (this.batchDeleteBtn) this.batchDeleteBtn.disabled = count === 0;
        if (this.batchPinBtn) {
            this.batchPinBtn.classList.toggle('hidden', this.currentFilter === 'standby');
            this.batchPinBtn.disabled = pinTargets.length === 0;
            this.batchPinBtn.textContent = pinTargets.length > 0 && pinTargets.every(todo => todo.pinned)
                ? '取消置顶'
                : '置顶';
        }
        if (this.batchStandbyBtn) {
            this.batchStandbyBtn.textContent = this.currentFilter === 'standby' ? '移出待机' : '待机';
            this.batchStandbyBtn.disabled = standbyTargets.length === 0;
        }
        if (this.batchSelectAllBtn) {
            const visibleIds = Array.from(this.visibleTodoIds);
            const allSelected = visibleIds.length > 0 && visibleIds.every(id => scoped.has(id));
            this.batchSelectAllBtn.textContent = allSelected ? '取消全选' : '全选';
            this.batchSelectAllBtn.disabled = visibleIds.length === 0;
        }
    }

    batchComplete() {
        const targets = this.getCompleteTargets();
        if (!targets.length) return;
        const wasAllDone = this.isAllTodayActiveDone();
        const completedTime = new Date().toISOString();
        this.runBatchMutation(() => {
            targets.forEach(todo => {
                todo.completed = true;
                todo.completedTime = completedTime;
                this.normalizeTodoState(todo);
            });
        }, () => this.maybeCelebrateToday(targets.map(todo => todo.id), wasAllDone));
    }

    batchTogglePin() {
        const targets = this.getPinTargets();
        if (!targets.length) return;
        const allPinned = targets.every(todo => todo.pinned);
        this.runBatchMutation(() => {
            targets.forEach(todo => {
                todo.pinned = !allPinned;
            });
        });
    }

    batchStandby() {
        const targets = this.getStandbyTargets();
        if (!targets.length) return;
        const inStandbyView = this.currentFilter === 'standby';
        this.runBatchMutation(() => {
            if (inStandbyView) {
                const todayStr = this.getTodayStr();
                targets.forEach(todo => {
                    todo.standby = false;
                    todo.plannedTime = todayStr;
                    this.normalizeTodoState(todo);
                });
            } else {
                targets.forEach(todo => {
                    todo.standby = true;
                    this.normalizeTodoState(todo);
                });
            }
        });
    }

    batchDelete() {
        const scoped = this.getScopedSelectedIds();
        if (!scoped.size) return;
        if (!window.confirm(`确定删除选中的 ${scoped.size} 个任务？`)) return;
        this.runBatchMutation(() => {
            this.todos = this.todos.filter(todo => !scoped.has(todo.id));
        });
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
        // 处理"打开上次退出视图"选项
        const actualFilter = filter === 'last' ?
            localStorage.getItem('lastUsedFilter') || 'today' :
            filter;
            
        this.currentFilter = actualFilter;
        // 保存原始选择(currentFilter)和实际使用的过滤器(lastUsedFilter)
        localStorage.setItem('currentFilter', filter);
        // 只有当不是'last'时才更新lastUsedFilter
        if (filter !== 'last') {
            localStorage.setItem('lastUsedFilter', actualFilter);
        }
        
        console.info(`[DEBUG] 过滤器更新:
           选择: ${filter}
           实际使用: ${actualFilter}
           默认视图: ${localStorage.getItem('defaultView')}
           当前过滤器: ${this.currentFilter}`);
        
        // 更新按钮高亮状态
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === actualFilter);
        });

        // 切换视图后清空批量选择，避免操作到不可见任务
        this.clearSelection();
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

        // 待机视图：只显示未完成的待机任务，忽略日期范围
        if (this.currentFilter === 'standby') {
            return this.todos.filter(todo =>
                todo.standby && !todo.completed && this.matchesSearch(todo)
            );
        }

        // 首先根据日期筛选
        const dateFiltered = this.todos.filter(todo => {
            // 待机任务只在待机视图显示
            if (todo.standby) return false;
            const plannedDate = this.parseTodoDate(todo.plannedTime); // 本地时区解析日期
            
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

        // 然后根据搜索词筛选
        return dateFiltered.filter(todo => this.matchesSearch(todo));
    }

    /**
     * 判断任务内容是否匹配当前搜索词
     * @param {Object} todo - 任务对象
     * @returns {boolean} 匹配结果(无搜索词时始终为true)
     */
    matchesSearch(todo) {
        if (!this.searchQuery) return true;
        return todo.content.toLowerCase().includes(this.searchQuery);
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
            if (this.pinnedList) this.pinnedList.innerHTML = '';
            // 记录本次实际渲染的任务，批量操作只作用于这些任务
            this.visibleTodoIds = new Set();

            const inStandbyView = this.currentFilter === 'standby';
            // 获取筛选后的任务并按状态分类
            const filteredTodos = this.filterTodos();
            console.log(`[DEBUG] 过滤后的任务:`, filteredTodos);
            // 置顶区容器缺失时，置顶任务回退到普通待办列表，避免任务凭空消失
            const pinnedSectionAvailable = !!(this.pinnedSection && this.pinnedList);
            // 置顶任务跨视图显示，按计划日期从早到晚排序；待机视图不显示置顶区
            const pinnedTodos = pinnedSectionAvailable && !inStandbyView
                ? this.todos
                    .filter(t => t.pinned && !t.completed && !t.standby && this.matchesSearch(t))
                    .sort((a, b) => new Date(a.plannedTime) - new Date(b.plannedTime))
                : [];
            const pinnedIds = new Set(pinnedTodos.map(t => t.id));
            const pendingTodos = filteredTodos.filter(t => !t.completed && !pinnedIds.has(t.id))
                .sort((a, b) => new Date(a.plannedTime) - new Date(b.plannedTime));
            const completedTodos = filteredTodos.filter(t => t.completed)
                .sort((a, b) => new Date(b.completedTime) - new Date(a.completedTime));
            console.log(`[DEBUG] 置顶任务数: ${pinnedTodos.length}, 待办任务数: ${pendingTodos.length}, 已完成任务数: ${completedTodos.length}`);

            // 渲染置顶区(无置顶任务或待机视图时隐藏)
            if (this.pinnedSection && this.pinnedList) {
                this.pinnedSection.classList.toggle('hidden', inStandbyView || pinnedTodos.length === 0);
                pinnedTodos.forEach(todo => this.renderTodo(todo, this.pinnedList));
            }

            if (this.listTitle) {
                this.listTitle.textContent = inStandbyView ? '待机事项' : '待办事项';
            }
            if (this.completedTitle) {
                this.completedTitle.classList.toggle('hidden', inStandbyView);
            }

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
            // pendingTodos.forEach(todo => this.renderTodo(todo, this.pendingList));
            pendingTodos.reverse().forEach(todo => this.renderTodo(todo, this.pendingList));
            completedTodos.forEach(todo => this.renderTodo(todo, this.completedList));

            if (inStandbyView && pendingTodos.length === 0 && completedTodos.length === 0) {
                const empty = document.createElement('li');
                empty.className = 'empty-state';
                empty.textContent = this.searchQuery ? '没有匹配的待机任务' : '暂无待机任务';
                this.pendingList.appendChild(empty);
            }

            // 任何路径改变可见性后，把选择收敛到仍然可见的任务
            this.selectedIds.forEach(id => {
                if (!this.visibleTodoIds.has(id)) this.selectedIds.delete(id);
            });

            this.updateBatchBar();
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
            li.dataset.todoId = todo.id;
            const isSelected = this.batchMode && this.selectedIds.has(todo.id);
            if (isSelected) li.classList.add('selected');
            li.setAttribute('aria-selected', isSelected ? 'true' : 'false');

            // 创建复选框；批量模式下用于选择，普通模式下用于切换完成状态
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            if (this.batchMode) {
                checkbox.checked = isSelected;
                checkbox.addEventListener('click', (e) => e.stopPropagation());
                checkbox.addEventListener('change', () => this.toggleSelect(todo.id));
            } else {
                checkbox.checked = todo.completed;
                checkbox.addEventListener('change', () => this.toggleTodo(todo.id));
            }

            // 创建任务内容显示区域（可编辑）
            const content = document.createElement('span');
            content.className = 'todo-content' + (todo.completed ? ' completed' : '');
            content.textContent = todo.content;
            content.contentEditable = !this.batchMode; // 批量模式下不允许编辑
            content.addEventListener('blur', () => {
                todo.content = content.textContent.trim();
                this.saveTodos();
            });

            // 批量模式下点击整行选中/取消选中
            if (this.batchMode) {
                li.addEventListener('click', (e) => {
                    if (e.target.closest('input, button')) return;
                    this.toggleSelect(todo.id);
                });
            }

            li.appendChild(checkbox);
            li.appendChild(content);

            // 未完成事项显示计划时间，已完成事项显示完成时间
            li.appendChild(this.createTimeElement(todo.completed ? todo.completedTime : todo.plannedTime));

            // 添加置顶按钮(已完成或待机任务不显示)
            if (!todo.completed && !todo.standby) {
                const pinBtn = document.createElement('button');
                pinBtn.className = 'pin-btn' + (todo.pinned ? ' pinned' : '');
                pinBtn.type = 'button';
                pinBtn.textContent = '📌';
                pinBtn.title = todo.pinned ? '取消置顶' : '置顶';
                pinBtn.setAttribute('aria-label', `置顶: ${todo.content}`);
                pinBtn.setAttribute('aria-pressed', String(!!todo.pinned));
                pinBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleTodoPin(todo.id);
                });
                li.appendChild(pinBtn);
            }

            // 添加删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.type = 'button';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteTodo(todo.id);
            });
            li.appendChild(deleteBtn);

            // 将任务项添加到指定列表，并记录到可见集合
            list.appendChild(li);
            this.visibleTodoIds.add(todo.id);
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
        return this.formatFullDate(this.parseTodoDate(isoString));
    }

    /**
     * 将Date对象格式化为完整日期
     * @param {Date} date - 日期对象
     * @returns {string} 如"7月10日 周四"
     */
    formatFullDate(date) {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[date.getDay()]; // 获取星期几(0-6)
        return `${date.getMonth()+1}月${date.getDate()}日 ${weekday}`;
    }

    /**
     * 格式化简短日期显示（窄屏使用）
     * @param {string} isoString - 日期字符串(YYYY-MM-DD或ISO格式)
     * @returns {string} 格式化后的日期字符串(如"10/25")
     */
    formatShortTime(isoString) {
        if (!isoString) return '';
        return this.formatShortDate(this.parseTodoDate(isoString));
    }

    /**
     * 将Date对象格式化为简短日期
     * @param {Date} date - 日期对象
     * @returns {string} 如"7/10"
     */
    formatShortDate(date) {
        return `${date.getMonth()+1}/${date.getDate()}`;
    }

    /**
     * 解析任务日期字符串为本地时区Date对象
     * @param {string} isoString - YYYY-MM-DD或ISO格式日期
     * @returns {Date} 日期对象
     */
    parseTodoDate(isoString) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
            const [y, m, d] = isoString.split('-').map(Number);
            return new Date(y, m - 1, d); // 本地时区日期对象
        }
        return new Date(isoString); // 自动解析ISO字符串为本地时区
    }

    /**
     * 创建时间显示元素
     * 同时输出完整日期和简短日期，窄屏时由CSS切换为简短格式
     * @param {string} isoString - 要显示的日期
     * @returns {HTMLElement} 时间显示元素
     */
    createTimeElement(isoString) {
        const time = document.createElement('span');
        time.className = 'todo-time';

        const long = document.createElement('span');
        long.className = 'time-long';

        const short = document.createElement('span');
        short.className = 'time-short';

        // 只解析一次日期，同时生成宽屏/窄屏两种文本
        if (isoString) {
            const date = this.parseTodoDate(isoString);
            long.textContent = this.formatFullDate(date);
            short.textContent = this.formatShortDate(date);
        }

        time.appendChild(long);
        time.appendChild(short);
        return time;
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
     * 昨日任务转移检查
     * 如果没有存储数据则初始化空数组
     */
    loadTodos() {
        const savedTodos = localStorage.getItem('todos');
        this.todos = savedTodos ? JSON.parse(savedTodos) : [];
        // 检查是否需要转移昨日任务
        this.checkYesterdayTasks();
        // 加载设置
        this.loadSettings();
    }

    /**
     * 检查并处理所有过去未完成任务
     * 1. 检测所有未完成且计划时间为过去时间的任务
     * 2. 根据用户设置自动转移或显示确认对话框
     */
    checkYesterdayTasks() {
        const rememberChoice = localStorage.getItem('rememberChoice');
        const autoTransfer = localStorage.getItem('autoTransfer');

        // 过期未完成任务：已排除待机任务，日期按本地时区判断
        const unfinishedTasks = this.getOverdueUnfinishedTodos();
        console.log(`[DEBUG ${new Date().toLocaleString('zh-CN', {hour12: false})}] 检测到 ${unfinishedTasks.length} 个过期未完成任务(已排除待机)`);
        if (unfinishedTasks.length === 0) return;

        const todayStr = this.getTodayStr();
        if (rememberChoice === 'true') {
            if (autoTransfer === 'true') {
                this.transferTasksToToday(unfinishedTasks, todayStr);
            }
            return;
        }

        // 没有记住选择时，显示转移确认对话框
        this.showTransferModal(unfinishedTasks, todayStr);
    }

    /**
     * 从任务数组中随机挑选指定数量的任务
     * @param {Array} tasks - 任务数组
     * @param {number} count - 要挑选的数量
     * @returns {Array} 随机挑选的任务数组
     */
    pickRandomTasks(tasks, count) {
        if (tasks.length <= count) return [...tasks];
        const shuffled = [...tasks];
        // Fisher-Yates 洗牌算法
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, count);
    }

    /**
     * 将指定任务列表的计划日期更新为今天
     * @param {Array} tasks - 要转移的任务列表
     * @param {string} todayStr - 今天的日期字符串(YYYY-MM-DD)
     */
    transferTasksToToday(tasks, todayStr) {
        console.log(`[DEBUG ${new Date().toLocaleString('zh-CN', {hour12: false})}] 转移 ${tasks.length} 个任务到今日`);
        tasks.forEach(task => {
            console.log(`[DEBUG] 转移任务: ${task.content} (原日期: ${task.plannedTime})`);
            task.plannedTime = todayStr;
        });
        this.saveTodos();
        console.log(`[DEBUG] 保存后的任务列表:`, this.todos);
        this.renderTodos();
        console.log(`[DEBUG] 当前过滤器: ${this.currentFilter}, 渲染任务数: ${this.filterTodos().length}`);
    }

    /**
     * 处理随机迁移按钮点击事件
     * 从过去未完成的任务中随机挑选5个转移到今天
     */
    handleRandomTransfer() {
        const todayStr = this.getTodayStr();

        // 过期未完成任务：已排除待机任务，日期按本地时区判断
        const unfinishedTasks = this.getOverdueUnfinishedTodos();

        if (unfinishedTasks.length === 0) {
            // 没有过期任务时给出提示
            const feedback = document.createElement('div');
            feedback.textContent = '没有需要迁移的过期任务！';
            feedback.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--secondary-color, #34a853);
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                z-index: 1000;
                font-size: 14px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(feedback);
            setTimeout(() => feedback.remove(), 2000);
            return;
        }

        // 随机挑选最多5个任务
        const tasksToTransfer = this.pickRandomTasks(unfinishedTasks, 5);
        
        console.log(`[DEBUG ${new Date().toLocaleString('zh-CN', {hour12: false})}] 随机迁移: 从 ${unfinishedTasks.length} 个过期任务中挑选了 ${tasksToTransfer.length} 个`);
        
        // 转移任务到今天；迁移会改变可见性，先清空批量选择
        this.clearSelection();
        this.transferTasksToToday(tasksToTransfer, todayStr);
        
        // 显示成功提示
        const feedback = document.createElement('div');
        feedback.textContent = `✅ 已随机迁移 ${tasksToTransfer.length} 个任务到今天！`;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--secondary-color, #34a853);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 2000);
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
            const plannedDate = this.parseTodoDate(todo.plannedTime);
            return todo.completed &&
                   plannedDate >= startDate &&
                   plannedDate <= endDate;
        });

        if (completedTasks.length > 0) {
            // 移除已完成任务
            this.todos = this.todos.filter(todo => {
                const plannedDate = this.parseTodoDate(todo.plannedTime);
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
        // 如果已经记住选择，不应该显示modal
        if (localStorage.getItem('rememberChoice') === 'true') {
            console.log(`[DEBUG ${new Date().toLocaleString('zh-CN', {hour12: false})}] 已记住选择，跳过modal显示`);
            return;
        }

        // 获取对话框相关DOM元素
        const modal = document.getElementById('transfer-modal');       // 对话框容器
        const yesBtn = document.getElementById('transfer-yes');        // 确认按钮
        const noBtn = document.getElementById('transfer-no');         // 取消按钮
        const rememberCheck = document.getElementById('remember-choice'); // "记住选择"复选框

        // 同步设置面板中的checkbox状态
        rememberCheck.checked = localStorage.getItem('rememberChoice') === 'true';
        
        // 显示对话框(flex布局居中显示)
        modal.style.display = 'flex';
        console.log(`[DEBUG ${new Date().toLocaleString('zh-CN', {hour12: false})}] 显示转移确认对话框（${tasks.length}个未完成任务）`);

        // "是"按钮点击事件 - 确认转移任务
        yesBtn.onclick = () => {
            const todayStr = this.getTodayStr();
            // 遍历所有待转移任务
            tasks.forEach(task => {
                task.plannedTime = todayStr;
                console.log('任务迁移:', task.content, '新日期:', task.plannedTime);
            });

            // 保存修改后的任务列表
            this.saveTodos();

            // 更新设置面板中的"转移昨日任务到今天"复选框
            this.autoTransferCheckbox.checked = true;
            localStorage.setItem('autoTransfer', 'true');

            // 如果用户勾选了"记住选择"，则保存设置
            if (rememberCheck.checked) {
                localStorage.setItem('rememberChoice', 'true');
            }

            // 关闭对话框
            modal.style.display = 'none';

            // 转移会改变可见性，切换/刷新视图前清空批量选择
            this.selectedIds.clear();
            // 强制刷新当前筛选条件显示（内部会重新渲染）
            this.setFilter(this.currentFilter);
        };

        // "否"按钮点击事件 - 取消转移
        noBtn.onclick = () => {
            // 更新设置面板中的"转移昨日任务到今天"复选框
            this.autoTransferCheckbox.checked = false;
            localStorage.setItem('autoTransfer', 'false');

            // 如果用户勾选了"记住选择"，则保存设置
            if (rememberCheck.checked) {
                localStorage.setItem('rememberChoice', 'true');
            }
            
            // 关闭对话框
            modal.style.display = 'none';
        };
    }

    /**
     * 加载设置
     */
    loadSettings() {
        // 确保从localStorage获取最新设置
        const autoTransfer = localStorage.getItem('autoTransfer');
        const rememberChoice = localStorage.getItem('rememberChoice');
        const defaultView = localStorage.getItem('defaultView');
        const currentFilter = localStorage.getItem('currentFilter');
        const debugMode = localStorage.getItem('debugMode');
        const lastUsedFilter = localStorage.getItem('lastUsedFilter') || 'today';

        console.log('[DEBUG] 加载设置:', {
            autoTransfer,
            rememberChoice,
            defaultView,
            currentFilter,
            debugMode,
            lastUsedFilter
        });

        // 初始化变量
        const rememberChecked = rememberChoice === 'true';
        const transferRememberCheck = document.getElementById('remember-choice');

        // 同步所有相关UI元素状态
        if (this.rememberChoiceCheckbox) {
            this.rememberChoiceCheckbox.checked = rememberChecked;
            console.log('[DEBUG] 设置面板记住选择状态:', rememberChecked);
        }

        if (transferRememberCheck) {
            transferRememberCheck.checked = rememberChecked;
            console.log('[DEBUG] 迁移面板记住选择状态:', rememberChecked);
        }

        if (this.autoTransferCheckbox) {
            this.autoTransferCheckbox.checked = autoTransfer === 'true';
            console.log('[DEBUG] 自动迁移状态:', autoTransfer === 'true');
        }

        if (this.defaultViewSelect) {
            this.defaultViewSelect.value = defaultView || 'today';
            console.log('[DEBUG] 默认视图设置:', defaultView);
        }

    }

    /**
     * 保存设置
     */
    saveSettings() {
        localStorage.setItem('autoTransfer', String(this.autoTransferCheckbox.checked));
        localStorage.setItem('rememberChoice', String(this.rememberChoiceCheckbox.checked));
        localStorage.setItem('currentFilter', this.defaultViewSelect.value);
        localStorage.setItem('debugMode', String(this.debugModeCheckbox.checked));
        
        // 保存默认视图设置(不修改当前过滤器)
        const newDefaultView = this.defaultViewSelect.value;
        localStorage.setItem('defaultView', newDefaultView);
        
        // 保存当前过滤器(保持原有行为)
        localStorage.setItem('currentFilter', this.currentFilter);
        
        console.log(`[Settings] 默认视图已保存为: ${newDefaultView} (下次启动生效), 当前过滤器保持为: ${this.currentFilter}`);
        
        // 控制调试面板
        const isDebugMode = this.debugModeCheckbox.checked;
        document.getElementById('debug-panel').classList.toggle('hidden', !isDebugMode);
        
        // 同步主界面调试按钮状态
        const toggleBtn = document.getElementById('toggle-debug');
        if (toggleBtn) {
            toggleBtn.textContent = isDebugMode ? '隐藏调试面板' : '显示调试面板';
        }
    }

    /**
     * 导出任务数据为JSON文件
     * 生成包含所有任务数据的JSON文件并触发下载
     */
    exportToJSON() {
        const data = JSON.stringify(this.todos, null, 2);
        this.saveTextFile(this.buildExportName('json'), data, 'application/json');
        console.log(`[Export] 已导出 ${this.todos.length} 个任务为JSON文件`);
    }

    /**
     * 生成导出文件名（本地时区）
     */
    buildExportName(extension) {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `todo-export-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.${extension}`;
    }

    /**
     * 显示一条短提示
     */
    showToast(text, duration = 2500) {
        const feedback = document.createElement('div');
        feedback.textContent = text;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 80vw;
            background: var(--secondary-color, #34a853);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 14px;
            line-height: 1.4;
            white-space: normal;
            word-break: break-all;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), duration);
    }

    /**
     * 是否运行在 HBuilder 打包的 App 内（有 plus 运行时）
     */
    isAppRuntime() {
        return typeof window.plus !== 'undefined' && !!window.plus.io;
    }

    /**
     * 保存文本文件：App 内写入系统「下载」目录，浏览器内用 Blob 下载。
     * Android WebView 不支持 blob: 下载链接，所以不能只靠 <a download>。
     */
    saveTextFile(filename, content, mimeType) {
        // 本地打包的 APK：由原生桥写入系统「下载」目录
        if (window.AndroidBridge && typeof window.AndroidBridge.saveFile === 'function') {
            try {
                const path = window.AndroidBridge.saveFile(filename, content);
                this.showToast(path ? `已保存：${path}` : '保存失败，请检查存储空间', 4000);
            } catch (e) {
                console.error('[Export] 原生保存失败:', e);
                this.showToast('保存失败，请检查存储空间', 4000);
            }
            return;
        }

        if (this.isAppRuntime()) {
            this.saveTextFileInApp(filename, content)
                .then(path => this.showToast(`已保存：${path}`, 4000))
                .catch(err => {
                    console.error('[Export] App 内保存失败:', err);
                    this.showToast('保存失败，请允许存储权限后重试', 4000);
                });
            return;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 申请存储权限（旧版 Android 写公共目录需要）
     */
    requestStoragePermission() {
        return new Promise((resolve, reject) => {
            if (typeof plus === 'undefined' || !plus.android || !plus.android.requestPermissions) {
                resolve();
                return;
            }
            plus.android.requestPermissions(
                ['android.permission.WRITE_EXTERNAL_STORAGE'],
                result => {
                    if (result.granted && result.granted.length) resolve();
                    else reject(new Error('未获得存储权限'));
                },
                reject
            );
        });
    }

    /**
     * 用 HBuilder 的 plus.io 写文件到「下载」目录
     */
    saveTextFileInApp(filename, content) {
        return this.requestStoragePermission().then(() => new Promise((resolve, reject) => {
            plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, fs => {
                fs.root.getFile(filename, { create: true }, entry => {
                    entry.createWriter(writer => {
                        writer.onerror = reject;
                        // 先清空，避免同名文件残留上次的尾巴
                        writer.onwrite = () => {
                            writer.onwrite = () => resolve(entry.fullPath || filename);
                            writer.write(content);
                        };
                        writer.truncate(0);
                    }, reject);
                }, reject);
            }, reject);
        }));
    }

    /**
     * 导出任务数据为CSV文件
     * 生成CSV格式的数据，包含表头：ID,内容,计划时间,完成状态,完成时间,置顶,待机
     */
    exportToCSV() {
        const headers = ['ID', '内容', '计划时间', '完成状态', '完成时间', '置顶', '待机'];
        const rows = this.todos.map(todo => [
            todo.id,
            `"${todo.content.replace(/"/g, '""')}"`, // 转义引号
            todo.plannedTime,
            todo.completed ? '是' : '否',
            todo.completedTime || '',
            todo.pinned ? '是' : '否',
            todo.standby ? '是' : '否'
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        this.saveTextFile(this.buildExportName('csv'), csvContent, 'text/csv;charset=utf-8;');
        console.log(`[Export] 已导出 ${this.todos.length} 个任务为CSV文件`);
    }

    /**
     * 复制任务数据到剪贴板
     * 将任务摘要复制为文本格式，便于粘贴到其他应用
     */
    copyToClipboard() {
        const summary = this.todos.map(todo => {
            const status = todo.completed ? '✅' : '⬜';
            const pinned = !todo.standby && todo.pinned ? '📌 ' : '';
            const standby = todo.standby ? '💤 ' : '';
            const date = this.formatTime(todo.plannedTime);
            const completed = todo.completed ? ` (完成于 ${this.formatTime(todo.completedTime)})` : '';
            return `${status} ${standby}${pinned}${todo.content} - ${date}${completed}`;
        }).join('\n');
        
        // 剪贴板受系统限制（过大时粘贴会失败或被截断），数据多时引导改用文件
        const sizeKB = Math.round(new Blob([summary]).size / 1024);
        if (summary.length > 100000) {
            alert(`任务数据较大（约 ${sizeKB} KB），剪贴板可能放不下或粘贴不完整。\n建议改用「导出 JSON 文件」，再在另一台设备选择文件导入。`);
            return;
        }

        this.copyText(summary)
            .then(() => {
                console.log('[Export] 任务摘要已复制到剪贴板');
                this.showToast(`已复制到剪贴板！约 ${sizeKB} KB`);
            })
            .catch(err => {
                console.error('[Export] 复制到剪贴板失败:', err);
                alert('复制失败，请改用导出文件。');
            });
    }

    /**
     * 复制文本：优先 Clipboard API，失败时退回 execCommand / Android 剪贴板
     */
    copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text)
                .catch(() => this.copyTextFallback(text));
        }
        return this.copyTextFallback(text);
    }

    copyTextFallback(text) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok) return Promise.resolve();
        } catch (e) {
            console.warn('[Export] execCommand 复制失败:', e);
        }

        // App 内再退回 Android 原生剪贴板
        if (this.isAppRuntime() && window.plus.android) {
            try {
                const main = plus.android.runtimeMainActivity();
                const Context = plus.android.importClass('android.content.Context');
                const clip = main.getSystemService(Context.CLIPBOARD_SERVICE);
                plus.android.importClass(clip);
                const ClipData = plus.android.importClass('android.content.ClipData');
                clip.setPrimaryClip(ClipData.newPlainText('待办', text));
                return Promise.resolve();
            } catch (e) {
                console.error('[Export] 原生剪贴板复制失败:', e);
            }
        }

        return Promise.reject(new Error('clipboard unavailable'));
    }

    /**
     * 处理导入文本：优先按 JSON 解析，失败后按任务摘要文本解析
     */
    importFromText(text) {
        const input = String(text || '').trim();
        if (!input) return;

        let parsed = null;
        try {
            const data = JSON.parse(input);
            parsed = Array.isArray(data) ? data : (data && Array.isArray(data.todos) ? data.todos : null);
        } catch (e) {
            parsed = null;
        }

        const result = parsed
            ? this.normalizeImportedTodos(parsed)
            : this.parseTodoSummary(input);

        if (!result.todos.length) {
            alert('没有识别到可导入的任务。请确认内容是本应用导出的 JSON 或任务摘要。');
            return;
        }

        const existing = new Map(this.todos.map(todo => [String(todo.id), todo]));
        let added = 0;
        let updated = 0;
        result.todos.forEach(todo => {
            const prev = existing.get(todo.id);
            if (prev) {
                const hasStandbyField = Object.prototype.hasOwnProperty.call(todo, 'standby');
                const prevStandby = prev.standby === true;
                Object.assign(prev, todo);
                // 旧版 JSON 没有 standby 字段时不覆盖已有待机状态
                if (!hasStandbyField && !prev.completed) prev.standby = prevStandby;
                this.normalizeTodoState(prev);
                updated++;
            } else {
                this.todos.push(this.normalizeTodoState(todo));
                existing.set(todo.id, todo);
                added++;
            }
        });

        this.selectedIds.clear();
        this.saveTodos();
        this.renderTodos();
        alert(`导入完成：新增 ${added} 条，更新 ${updated} 条，跳过 ${result.skipped} 条。`);
    }

    /**
     * 规范化 JSON 导入的任务，过滤无效数据并补齐字段
     */
    normalizeImportedTodos(list) {
        const todos = [];
        let skipped = 0;
        list.forEach((raw, index) => {
            if (!raw || typeof raw !== 'object') {
                skipped++;
                return;
            }
            const content = typeof raw.content === 'string' ? raw.content.trim() : '';
            const plannedTime = this.normalizeImportDate(raw.plannedTime);
            if (!content || !plannedTime) {
                skipped++;
                return;
            }
            const completed = !!raw.completed;
            const completedTime = completed ? this.normalizeImportDateTime(raw.completedTime, plannedTime) : null;
            const hasStandbyField = Object.prototype.hasOwnProperty.call(raw, 'standby');
            const standby = hasStandbyField && raw.standby === true && !completed;
            const id = raw.id !== undefined && raw.id !== null && String(raw.id).trim()
                ? String(raw.id)
                : `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
            const todo = {
                id,
                content,
                plannedTime,
                completed,
                completedTime,
                pinned: !!raw.pinned && !completed && !standby
            };
            // 源数据没有 standby 字段时不写入，导入合并时保留原状态
            if (hasStandbyField) todo.standby = standby;
            todos.push(todo);
        });
        return { todos, skipped };
    }

    /**
     * 解析「复制到剪贴板」得到的任务摘要（无年份，按最接近今天的日期推断）
     */
    parseTodoSummary(text) {
        const todos = [];
        let skipped = 0;
        const linePattern = /^(✅|⬜)\s*((?:📌|💤)\s*)?(.+?)\s+-\s+(\d{1,2})月(\d{1,2})日\s+周[一二三四五六日](?:\s*\(完成于\s+(.+?)\))?$/;
        const datePattern = /(\d{1,2})月(\d{1,2})日/;

        text.split(/\r?\n/).forEach((line, index) => {
            const line_ = line.trim();
            if (!line_) return;
            const match = line_.match(linePattern);
            if (!match) {
                skipped++;
                return;
            }
            const completed = match[1] === '✅';
            const plannedTime = this.guessLocalDate(Number(match[4]), Number(match[5]), false);
            if (!plannedTime) {
                skipped++;
                return;
            }
            let completedTime = null;
            if (completed) {
                const completedMatch = match[6] && match[6].match(datePattern);
                const completedDate = completedMatch
                    ? this.guessLocalDate(Number(completedMatch[1]), Number(completedMatch[2]), true)
                    : plannedTime;
                completedTime = this.localDateToNoonIso(completedDate || plannedTime);
            }
            const marker = (match[2] || '').trim();
            const standby = marker === '💤' && !completed;
            todos.push({
                id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                content: match[3].trim(),
                plannedTime,
                completed,
                completedTime,
                pinned: marker === '📌' && !completed && !standby,
                standby
            });
        });
        return { todos, skipped };
    }

    normalizeImportDate(value) {
        if (typeof value !== 'string') return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    normalizeImportDateTime(value, fallbackDate) {
        const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
        if (date && !Number.isNaN(date.getTime())) return date.toISOString();
        return this.localDateToNoonIso(fallbackDate);
    }

    /**
     * 摘要文本没有年份：在前后一年中选择最接近今天的日期，
     * 已完成时间则选择不晚于今天的最近日期。
     */
    guessLocalDate(month, day, preferPast) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let best = null;
        let bestDiff = Infinity;
        for (let year = today.getFullYear() - 1; year <= today.getFullYear() + 1; year++) {
            const date = new Date(year, month - 1, day);
            if (date.getMonth() !== month - 1 || date.getDate() !== day) continue;
            const diff = date.getTime() - today.getTime();
            if (preferPast && diff > 86400000) continue;
            if (Math.abs(diff) < bestDiff) {
                best = date;
                bestDiff = Math.abs(diff);
            }
        }
        if (!best) {
            const date = new Date(today.getFullYear(), month - 1, day);
            if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
            best = date;
        }
        return `${best.getFullYear()}-${String(best.getMonth() + 1).padStart(2, '0')}-${String(best.getDate()).padStart(2, '0')}`;
    }

    localDateToNoonIso(localDate) {
        const [year, month, day] = localDate.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0).toISOString();
    }

    /**
     * 处理导出操作，根据选择的格式调用相应的导出方法
     */
    handleExport() {
        if (!this.exportFormatSelect) {
            console.error('[Export] 导出格式选择元素未找到');
            return;
        }
        const format = this.exportFormatSelect.value;
        switch (format) {
            case 'json':
                this.exportToJSON();
                break;
            case 'csv':
                this.exportToCSV();
                break;
            case 'clipboard':
                this.copyToClipboard();
                break;
            default:
                console.warn(`[Export] 未知的导出格式: ${format}`);
                alert('请选择有效的导出格式');
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.todoApp = new TodoApp();
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

    // 同步调试状态到设置面板
    function syncDebugState(isVisible) {
        const debugCheckbox = document.getElementById('debug-mode');
        if (debugCheckbox) {
            debugCheckbox.checked = isVisible;
            localStorage.setItem('debugMode', String(isVisible));
        }
    }

    toggleBtn.addEventListener('click', () => {
        // 根据按钮当前文字决定操作
        const shouldShow = toggleBtn.textContent === '显示调试面板';
        
        // 设置面板可见状态
        panelVisible = shouldShow;
        debugPanel.classList.toggle('hidden', !shouldShow);
        
        // 更新按钮文本
        toggleBtn.textContent = shouldShow ? '隐藏调试面板' : '显示调试面板';
        
        // 同步所有相关状态
        syncDebugState(shouldShow);
        const debugCheckbox = document.getElementById('debug-mode');
        if (debugCheckbox) {
            debugCheckbox.checked = shouldShow;
            localStorage.setItem('debugMode', String(shouldShow));
        }
        
        console.log(`[DEBUG] 调试面板状态更新: ${shouldShow ? '显示' : '隐藏'}`);
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