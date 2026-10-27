import { UIComponent } from './ui-component.js';
import { ToDoWidget } from './todo-widget.js';
import { WeatherWidget } from './weather-widget.js';
import { CurrencyWidget } from './currency-widget.js';

const STORAGE_KEY = 'traveler-panel-state';

// ---------- Управление панелью ----------
const grid = document.querySelector('#widget-grid');
const countLabel = document.querySelector('#widget-count');
const emptyState = document.querySelector('#empty-state');

const widgets = new Map();

function updateDashboard() {
  const count = widgets.size;
  countLabel.textContent = `${count} ${pluralize(count, 'карточка', 'карточки', 'карточек')}`;
  emptyState.hidden = count !== 0;
}

function pluralize(number, one, few, many) {
  if (number % 10 === 1 && number % 100 !== 11) return one;
  if ([2, 3, 4].includes(number % 10) && ![12, 13, 14].includes(number % 100)) return few;
  return many;
}

function generateId(prefix = 'w') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function saveState() {
  const data = {
    widgets: Array.from(widgets.values()).map(w => w.toJSON())
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Не удалось сохранить состояние:', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Не удалось загрузить состояние:', e);
    return null;
  }
}

function onWidgetRemove(widget) {
  widgets.delete(widget.id);
  updateDashboard();
  saveState();
}

function onWidgetChange() {
  saveState();
}

function createWidget(type, saved = {}) {
  const id = saved.id || generateId(type);
  const collapsed = Boolean(saved.collapsed);
  const common = {
    id,
    collapsed,
    onRemove: onWidgetRemove,
    onChange: onWidgetChange
  };

  if (type === 'tasks') {
    return new ToDoWidget({
      ...common,
      tasks: saved.tasks || []
    });
  }

  if (type === 'weather') {
    return new WeatherWidget(common);
  }

  if (type === 'currency') {
    return new CurrencyWidget(common);
  }

  return null;
}

function addWidget(type, saved = null) {
  const widget = createWidget(type, saved || {});
  if (!widget) return;

  widgets.set(widget.id, widget);
  grid.append(widget.render());
  updateDashboard();

  if (!saved) {
    saveState();
  }
}

document.querySelectorAll('[data-add]').forEach(button => {
  button.addEventListener('click', () => addWidget(button.dataset.add));
});

// ---------- Инициализация ----------
const saved = loadState();

if (saved && Array.isArray(saved.widgets) && saved.widgets.length > 0) {
  saved.widgets.forEach(item => {
    if (item && item.type) {
      addWidget(item.type, item);
    }
  });
} else {
  addWidget('tasks');
  addWidget('weather');
  addWidget('currency');
}
