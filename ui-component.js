// Базовый класс для любой карточки-виджета
export class UIComponent {
  constructor({ id, title, type = 'default', icon = '•', onRemove = null, onChange = null, collapsed = false }) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.icon = icon;
    this.onRemove = onRemove;
    this.onChange = onChange; // вызывается при любом изменении состояния
    this.collapsed = collapsed;
    this.element = null;
    this._handlers = [];
  }

  /** Создаёт DOM-карточку и возвращает её */
  render() {
    const card = document.createElement('article');
    card.className = `widget widget--${this.type}`;
    card.dataset.widgetId = this.id;

    card.innerHTML = `
      <div class="widget__top">
        <div class="widget__title">
          <span class="widget__icon">${this.icon}</span>
          <h3></h3>
        </div>
        <div class="widget__actions">
          <button class="icon-button" type="button" data-action="toggle" aria-label="Свернуть виджет" aria-expanded="true" title="Свернуть">−</button>
          <button class="icon-button icon-button--danger" type="button" data-action="remove" aria-label="Удалить виджет" title="Удалить">×</button>
        </div>
      </div>
      <div class="widget__body"></div>
    `;

    card.querySelector('h3').textContent = this.title;

    this.element = card;
    this.body = card.querySelector('.widget__body');

    const toggleBtn = card.querySelector('[data-action="toggle"]');
    const toggleHandler = () => this.toggle();
    toggleBtn.addEventListener('click', toggleHandler);
    this._handlers.push({ el: toggleBtn, type: 'click', fn: toggleHandler });

    const removeBtn = card.querySelector('[data-action="remove"]');
    const removeHandler = () => this.destroy();
    removeBtn.addEventListener('click', removeHandler);
    this._handlers.push({ el: removeBtn, type: 'click', fn: removeHandler });

    this.renderContent();

    // Восстанавливаем свёрнутое состояние
    if (this.collapsed) {
      this.body.hidden = true;
      toggleBtn.textContent = '+';
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-label', 'Развернуть виджет');
      toggleBtn.title = 'Развернуть';
    }

    return card;
  }

  /** Переопределяется в наследниках */
  renderContent() {}

  toggle() {
    this.collapsed = !this.collapsed;
    this.body.hidden = this.collapsed;

    const toggleBtn = this.element.querySelector('[data-action="toggle"]');
    if (toggleBtn) {
      toggleBtn.textContent = this.collapsed ? '+' : '−';
      toggleBtn.setAttribute('aria-expanded', String(!this.collapsed));
      toggleBtn.setAttribute('aria-label', this.collapsed ? 'Развернуть виджет' : 'Свернуть виджет');
      toggleBtn.title = this.collapsed ? 'Развернуть' : 'Свернуть';
    }

    this.notifyChange();
  }

  /** Сообщает панели, что состояние изменилось */
  notifyChange() {
    if (typeof this.onChange === 'function') {
      this.onChange(this);
    }
  }

  /** Сериализация для localStorage */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      collapsed: this.collapsed
    };
  }

  destroy() {
    this._handlers.forEach(({ el, type, fn }) => {
      el.removeEventListener(type, fn);
    });
    this._handlers = [];

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    if (typeof this.onRemove === 'function') {
      this.onRemove(this);
    }
  }
}
