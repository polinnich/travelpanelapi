import { UIComponent } from './ui-component.js';

/**
 * Виджет списка дел.
 * Наследует UIComponent.
 */
export class ToDoWidget extends UIComponent {
  constructor({ id, title = 'Список дел', onRemove = null, onChange = null, collapsed = false, tasks = [] }) {
    super({
      id,
      title,
      type: 'tasks',
      icon: '✓',
      onRemove,
      onChange,
      collapsed
    });

    this.tasks = Array.isArray(tasks) ? [...tasks] : [];
  }

  renderContent() {
    const form = document.createElement('div');
    form.className = 'todo-form';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-input';
    input.placeholder = 'Новая задача…';
    input.maxLength = 120;
    input.setAttribute('aria-label', 'Текст новой задачи');

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'todo-add-btn';
    addBtn.textContent = 'Добавить';

    form.append(input, addBtn);

    const list = document.createElement('ul');
    list.className = 'todo-list';
    list.setAttribute('aria-label', 'Список задач');

    this.body.append(form, list);

    this.input = input;
    this.listEl = list;

    const addHandler = () => this.addTask();
    addBtn.addEventListener('click', addHandler);
    this._handlers.push({ el: addBtn, type: 'click', fn: addHandler });

    const keyHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTask();
      }
    };
    input.addEventListener('keydown', keyHandler);
    this._handlers.push({ el: input, type: 'keydown', fn: keyHandler });

    this.renderTasks();
  }

  addTask() {
    const text = this.input.value.trim();
    if (!text) return;

    const task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      done: false
    };

    this.tasks.push(task);
    this.input.value = '';
    this.renderTasks();
    this.input.focus();
    this.notifyChange();
  }

  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.done = !task.done;
      this.renderTasks();
      this.notifyChange();
    }
  }

  removeTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.renderTasks();
    this.notifyChange();
  }

  renderTasks() {
    while (this.listEl.firstChild) {
      this.listEl.removeChild(this.listEl.firstChild);
    }

    if (this.tasks.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'todo-empty';
      empty.textContent = 'Пока нет задач. Добавьте первую!';
      this.listEl.append(empty);
      return;
    }

    this.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'todo-item' + (task.done ? ' todo-item--done' : '');
      li.dataset.taskId = task.id;

      const check = document.createElement('button');
      check.type = 'button';
      check.className = 'todo-check';
      check.setAttribute('aria-label', task.done ? 'Отметить как невыполненную' : 'Отметить как выполненную');
      check.title = task.done ? 'Снять отметку' : 'Выполнено';
      check.textContent = task.done ? '✓' : '';

      const textSpan = document.createElement('span');
      textSpan.className = 'todo-text';
      textSpan.textContent = task.text;

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'todo-delete';
      delBtn.setAttribute('aria-label', 'Удалить задачу');
      delBtn.title = 'Удалить';
      delBtn.textContent = '×';

      li.append(check, textSpan, delBtn);

      const toggleFn = () => this.toggleTask(task.id);
      check.addEventListener('click', toggleFn);
      this._handlers.push({ el: check, type: 'click', fn: toggleFn });

      const removeFn = () => this.removeTask(task.id);
      delBtn.addEventListener('click', removeFn);
      this._handlers.push({ el: delBtn, type: 'click', fn: removeFn });

      this.listEl.append(li);
    });
  }

  /** Добавляем задачи в сериализацию */
  toJSON() {
    return {
      ...super.toJSON(),
      tasks: this.tasks
    };
  }
}
