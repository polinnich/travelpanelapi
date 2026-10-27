import { UIComponent } from './ui-component.js';

/**
 * Виджет курса EUR → USD через Frankfurter API.
 * Работает независимо от погоды.
 */
export class CurrencyWidget extends UIComponent {
  constructor({ id, title = 'Курсы валют', onRemove = null, onChange = null, collapsed = false }) {
    super({
      id,
      title,
      type: 'currency',
      icon: '⇄',
      onRemove,
      onChange,
      collapsed
    });

    this.controller = null;
    this.status = 'idle'; // idle | loading | success | error
    this.data = null;
    this.errorMessage = '';
  }

  renderContent() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'currency-content';
    this.body.append(this.contentEl);

    this.fetchRate();
  }

  /** Запрос к Frankfurter: EUR → USD */
  async fetchRate() {
    if (this.controller) {
      this.controller.abort();
    }

    this.controller = new AbortController();
    this.status = 'loading';
    this.data = null;
    this.errorMessage = '';
    this.renderState();

    // Прямой endpoint Frankfurter v1 (без редиректа)
    // Пример ответа: { "amount": 1.0, "base": "EUR", "date": "2026-10-27", "rates": { "USD": 1.115 } }
    const url = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD';

    try {
      const response = await fetch(url, { signal: this.controller.signal });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const json = await response.json();

      if (!json.rates || typeof json.rates.USD !== 'number') {
        throw new Error('Нет данных о курсе USD');
      }

      this.data = {
        base: json.base || 'EUR',
        quote: 'USD',
        rate: json.rates.USD,
        date: json.date || ''
      };

      this.status = 'success';
      this.renderState();
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      this.status = 'error';
      const raw = err.message || '';
      if (/networkerror|failed to fetch|load failed|network request failed/i.test(raw)) {
        this.errorMessage = 'Нет сети или запрос заблокирован. Открой через Live Server и проверь интернет.';
      } else {
        this.errorMessage = raw || 'Не удалось загрузить курс';
      }
      this.renderState();
    } finally {
      this.controller = null;
    }
  }

  renderState() {
    while (this.contentEl.firstChild) {
      this.contentEl.removeChild(this.contentEl.firstChild);
    }

    if (this.status === 'loading') {
      const loading = document.createElement('div');
      loading.className = 'widget-state widget-state--loading';
      loading.innerHTML = `
        <div class="spinner"></div>
        <p>Загружаем курс…</p>
      `;
      this.contentEl.append(loading);
      return;
    }

    if (this.status === 'error') {
      const errBox = document.createElement('div');
      errBox.className = 'widget-state widget-state--error';

      const msg = document.createElement('p');
      msg.className = 'widget-state__msg';
      msg.textContent = this.errorMessage;

      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'retry-btn';
      retryBtn.textContent = 'Повторить';

      const retryHandler = () => this.fetchRate();
      retryBtn.addEventListener('click', retryHandler);
      this._handlers.push({ el: retryBtn, type: 'click', fn: retryHandler });

      errBox.append(msg, retryBtn);
      this.contentEl.append(errBox);
      return;
    }

    if (this.status === 'success' && this.data) {
      const tag = document.createElement('div');
      tag.className = 'widget__tag';
      tag.textContent = this.data.date
        ? `Курс на ${this.data.date}`
        : 'Актуальный курс';

      const row = document.createElement('div');
      row.className = 'currency-preview';

      const from = document.createElement('span');
      from.textContent = '🇪🇺 EUR';

      const arrow = document.createElement('span');
      arrow.textContent = '→';

      const to = document.createElement('span');
      to.textContent = '🇺🇸 USD';

      row.append(from, arrow, to);

      const rateBlock = document.createElement('div');
      rateBlock.className = 'currency-rate';
      rateBlock.innerHTML = `
        <strong>1 ${this.data.base} = ${this.data.rate.toFixed(4)} ${this.data.quote}</strong>
      `;

      const footnote = document.createElement('p');
      footnote.className = 'widget__footnote';
      footnote.textContent = 'Данные: Frankfurter API (ECB)';

      this.contentEl.append(tag, row, rateBlock, footnote);
    }
  }

  /** При удалении карточки — отменяем запрос */
  destroy() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    super.destroy();
  }
}
