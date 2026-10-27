import { UIComponent } from './ui-component.js';

/**
 * Виджет погоды через Open-Meteo (Санкт-Петербург).
 * Без API-ключа.
 */
export class WeatherWidget extends UIComponent {
  constructor({ id, title = 'Погода', onRemove = null, onChange = null, collapsed = false }) {
    super({
      id,
      title,
      type: 'weather',
      icon: '☀',
      onRemove,
      onChange,
      collapsed
    });

    this.controller = null; // AbortController для отмены запроса
    this.status = 'idle';   // idle | loading | success | error
    this.data = null;
    this.errorMessage = '';
  }

  renderContent() {
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'weather-content';
    this.body.append(this.contentEl);

    this.fetchWeather();
  }

  /** Запрос к Open-Meteo */
  async fetchWeather() {
    // Отменяем предыдущий запрос, если он ещё идёт
    if (this.controller) {
      this.controller.abort();
    }

    this.controller = new AbortController();
    this.status = 'loading';
    this.data = null;
    this.errorMessage = '';
    this.renderState();

    const lat = 59.9386;
    const lon = 30.3141;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe%2FMoscow`;

    try {
      const response = await fetch(url, { signal: this.controller.signal });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const json = await response.json();

      if (!json.current) {
        throw new Error('Нет данных о текущей погоде');
      }

      this.data = {
        temperature: json.current.temperature_2m,
        unit: json.current_units?.temperature_2m || '°C',
        humidity: json.current.relative_humidity_2m,
        wind: json.current.wind_speed_10m,
        windUnit: json.current_units?.wind_speed_10m || 'км/ч',
        weatherCode: json.current.weather_code,
        time: json.current.time
      };

      this.status = 'success';
      this.renderState();
    } catch (err) {
      if (err.name === 'AbortError') {
        // Запрос отменён — ничего не делаем
        return;
      }
      this.status = 'error';
      this.errorMessage = err.message || 'Не удалось загрузить погоду';
      this.renderState();
    } finally {
      this.controller = null;
    }
  }

  /** Описание по коду Open-Meteo */
  getWeatherInfo(code) {
    const map = {
      0:  { text: 'Ясно', icon: '☀️' },
      1:  { text: 'Преимущественно ясно', icon: '🌤' },
      2:  { text: 'Переменная облачность', icon: '⛅' },
      3:  { text: 'Пасмурно', icon: '☁️' },
      45: { text: 'Туман', icon: '🌫' },
      48: { text: 'Изморозь', icon: '🌫' },
      51: { text: 'Морось', icon: '🌦' },
      53: { text: 'Морось', icon: '🌦' },
      55: { text: 'Сильная морось', icon: '🌧' },
      61: { text: 'Небольшой дождь', icon: '🌦' },
      63: { text: 'Дождь', icon: '🌧' },
      65: { text: 'Сильный дождь', icon: '🌧' },
      71: { text: 'Небольшой снег', icon: '🌨' },
      73: { text: 'Снег', icon: '❄️' },
      75: { text: 'Сильный снег', icon: '❄️' },
      80: { text: 'Ливень', icon: '🌧' },
      81: { text: 'Ливень', icon: '🌧' },
      82: { text: 'Сильный ливень', icon: '⛈' },
      95: { text: 'Гроза', icon: '⛈' },
      96: { text: 'Гроза с градом', icon: '⛈' },
      99: { text: 'Гроза с градом', icon: '⛈' }
    };
    return map[code] || { text: 'Неизвестно', icon: '🌡' };
  }

  renderState() {
    // Очищаем
    while (this.contentEl.firstChild) {
      this.contentEl.removeChild(this.contentEl.firstChild);
    }

    if (this.status === 'loading') {
      const loading = document.createElement('div');
      loading.className = 'widget-state widget-state--loading';
      loading.innerHTML = `
        <div class="spinner"></div>
        <p>Загружаем погоду…</p>
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

      const retryHandler = () => this.fetchWeather();
      retryBtn.addEventListener('click', retryHandler);
      this._handlers.push({ el: retryBtn, type: 'click', fn: retryHandler });

      errBox.append(msg, retryBtn);
      this.contentEl.append(errBox);
      return;
    }

    if (this.status === 'success' && this.data) {
      const info = this.getWeatherInfo(this.data.weatherCode);

      const tag = document.createElement('div');
      tag.className = 'widget__tag';
      tag.textContent = 'Санкт-Петербург · сейчас';

      const main = document.createElement('div');
      main.className = 'weather-preview';

      const icon = document.createElement('span');
      icon.textContent = info.icon;

      const temp = document.createElement('strong');
      temp.textContent = `${Math.round(this.data.temperature)}${this.data.unit}`;

      main.append(icon, temp);

      const desc = document.createElement('p');
      desc.className = 'weather-preview__city';
      desc.textContent = info.text;

      const details = document.createElement('div');
      details.className = 'weather-details';

      const humidity = document.createElement('span');
      humidity.textContent = `💧 ${this.data.humidity}%`;

      const wind = document.createElement('span');
      wind.textContent = `💨 ${Math.round(this.data.wind)} ${this.data.windUnit}`;

      details.append(humidity, wind);

      this.contentEl.append(tag, main, desc, details);
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
