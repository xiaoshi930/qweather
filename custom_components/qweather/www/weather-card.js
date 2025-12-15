console.info("%c 天气卡片 \n%c   v 2.1   ", "color: red; font-weight: bold; background: black", "color: white; font-weight: bold; background: black");
import { LitElement, html, css } from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class XiaoshiWeatherPhoneEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  static get styles() {
    return css`
      .form {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      label {
        font-weight: bold;
      }
      select, input {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        width: 100%;
        box-sizing: border-box;
      }
      input[type="number"] {
        width: 100px;
      }
      .conditional-field {
        display: none;
      }
      .conditional-field.visible {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .entity-search-container {
        position: relative;
        width: 100%;
      }
      .entity-search-container input {
        width: 100%;
        min-width: 200px;
      }
      datalist {
        max-height: 200px;
        overflow-y: auto;
      }
    `;
  }

  render() {
    if (!this.hass) return html``;

    return html`
      <div class="form">
        <div class="form-group">
          <label>天气实体</label>
          <select 
            @change=${this._entityChanged}
            .value=${this.config.entity || ''}
            name="entity"
          >
            <option value="">选择天气实体</option>
            ${Object.keys(this.hass.states)
              .filter(entityId => entityId.startsWith('weather.'))
              .map(entityId => html`
                <option value="${entityId}" 
                  .selected=${entityId === this.config.entity}>
                  ${this.hass.states[entityId].attributes.friendly_name || entityId} ${this.hass.states[entityId].attributes.friendly_name ? '(' + entityId + ')' : ''}
                </option>
              `)}
          </select>
        </div>
        
        <div class="form-group">
          <label>视觉样式</label>
          <select 
            @change=${this._entityChanged}
            .value=${this.config.visual_style !== undefined ? this.config.visual_style : 'button'}
            name="visual_style"
          >
            <option value="button">按钮模式</option>
            <option value="dot">圆点模式</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>主题</label>
          <select 
            @change=${this._entityChanged}
            .value=${this.config.theme !== undefined ? this.config.theme : 'on'}
            name="theme"
          >
            <option value="on">浅色主题（白底黑字）</option>
            <option value="off">深色主题（深灰底白字）</option>
          </select>
        </div>

        <div class="form-group">
          <label>预报列数</label>
          <select 
            @change=${this._entityChanged}
            .value=${this.config.columns !== undefined ? this.config.columns : 9}
            name="columns"
          >
            <option value="7">7列</option>
            <option value="8">8列</option>
            <option value="9">9列</option>
            <option value="10">10列</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>图标模式</label>
          <select 
            @change=${this._entityChanged}
            .value=${this.config.mode !== undefined ? this.config.mode : '家'}
            name="mode"
          >
            <option value="家">家</option>
            <option value="手机定位">手机定位</option>
            <option value="搜索城市">搜索城市</option>
          </select>
        </div>
        



        
        <div class="form-group">
          <label>是否实体替换实时温湿度</label>
          <select 
            @change=${this._entityChanged}
            .value=${this.config.use_custom_entities !== undefined ? this.config.use_custom_entities : false}
            name="use_custom_entities"
          >
            <option value=false>否（使用天气实体的温湿度）</option>
            <option value=true>是（使用自定义实体）</option>
          </select>
        </div>
        
        <div class="form-group conditional-field ${this.config.use_custom_entities ? 'visible' : ''}" id="temperature-entity-group">
          <label>温度实体</label>
          <div class="entity-search-container">
            <input 
              type="text" 
              .value=${this.config.temperature_entity || ''}
              @input=${this._onTemperatureEntityInput}
              @change=${this._entityChanged}
              name="temperature_entity"
              placeholder="搜索温度实体（如 sensor.temperature）"
              list="temperature-entities"
            />
            <datalist id="temperature-entities">
              ${Object.keys(this.hass.states)
                .filter(entityId => 
                  this.hass.states[entityId].attributes?.unit_of_measurement === '°C' ||
                  this.hass.states[entityId].attributes?.device_class === 'temperature' ||
                  entityId.toLowerCase().includes('temp')
                )
                .map(entityId => html`
                  <option value="${entityId}">
                    ${this.hass.states[entityId].attributes.friendly_name || entityId}
                  </option>
                `)}
            </datalist>
          </div>
        </div>
        
        <div class="form-group conditional-field ${this.config.use_custom_entities ? 'visible' : ''}" id="humidity-entity-group">
          <label>湿度实体</label>
          <div class="entity-search-container">
            <input 
              type="text" 
              .value=${this.config.humidity_entity || ''}
              @input=${this._onHumidityEntityInput}
              @change=${this._entityChanged}
              name="humidity_entity"
              placeholder="搜索湿度实体（如 sensor.humidity）"
              list="humidity-entities"
            />
            <datalist id="humidity-entities">
              ${Object.keys(this.hass.states)
                .filter(entityId => 
                  this.hass.states[entityId].attributes?.unit_of_measurement === '%' ||
                  this.hass.states[entityId].attributes?.device_class === 'humidity' ||
                  entityId.toLowerCase().includes('humid')
                )
                .map(entityId => html`
                  <option value="${entityId}">
                    ${this.hass.states[entityId].attributes.friendly_name || entityId}
                  </option>
                `)}
            </datalist>
          </div>
        </div>
         
      </div>
    `;
  }

  _entityChanged(e) {
    const { name, value } = e.target;
    if (!value && name !== 'theme' && name !== 'mode' && name !== 'columns' && name !== 'use_custom_entities' && name !== 'temperature_entity' && name !== 'humidity_entity' && name !== 'visual_style') return;

    let processedValue = value;
    if (name === 'columns' ) {
      processedValue = parseInt(value);
    } else if (name === 'use_custom_entities') {
      processedValue = value === 'true';
    }
    
    this.config = {
      ...this.config,
      [name]: processedValue
    };

    // 处理条件字段的显示/隐藏
    if (name === 'use_custom_entities') {
      this._updateConditionalFields();
    }

    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true
    }));
  } 

  _updateConditionalFields() {
    // 更新条件字段的显示状态
    const useCustomEntities = this.config.use_custom_entities;
    
    // 获取条件字段元素
    const tempGroup = this.shadowRoot?.getElementById('temperature-entity-group');
    const humidityGroup = this.shadowRoot?.getElementById('humidity-entity-group');
    
    if (tempGroup) {
      if (useCustomEntities) {
        tempGroup.classList.add('visible');
      } else {
        tempGroup.classList.remove('visible');
        // 如果禁用，清空配置
        delete this.config.temperature_entity;
      }
    }
    
    if (humidityGroup) {
      if (useCustomEntities) {
        humidityGroup.classList.add('visible');
      } else {
        humidityGroup.classList.remove('visible');
        // 如果禁用，清空配置
        delete this.config.humidity_entity;
      }
    }
  }

  _onTemperatureEntityInput(e) {
    // 实时更新配置值，但不触发配置更改事件
    this.config = {
      ...this.config,
      temperature_entity: e.target.value
    };
  }

  _onHumidityEntityInput(e) {
    // 实时更新配置值，但不触发配置更改事件
    this.config = {
      ...this.config,
      humidity_entity: e.target.value
    };
  }

  setConfig(config) {
    this.config = config;
    // 在配置设置后更新条件字段
    setTimeout(() => {
      this._updateConditionalFields();
    }, 0);
  }
}
customElements.define('xiaoshi-weather-phone-editor', XiaoshiWeatherPhoneEditor);

class XiaoshiWeatherPhoneCard extends LitElement {
  // 温度计算常量
  static get TEMPERATURE_CONSTANTS() {
    return {
      BUTTON_HEIGHT_VW: 3.4,        // 温度矩形高度（vw）
      CONTAINER_HEIGHT_VW: 25,       // 温度容器总高度（vw）
      FORECAST_COLUMNS: 9,          // 预报列数
    };
  }

  // 图标路径常量 - 方便调试修改
  static get ICON_PATH() {
    return '/qweather/icon';
  }

  static getConfigElement() {
    return document.createElement("xiaoshi-weather-phone-editor");
  }

  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      entity: { type: Object },
      mode: { type: String },
      forecastMode: { type: String }, // 'daily' 或 'hourly'
      showWarningDetails: { type: Boolean } // 是否显示预警详情
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      /*主卡片样式*/
      .weather-card {
        position: relative;
        border-radius: 3vw;
        padding: 1.6vw;
        font-family: sans-serif;
        overflow: hidden;
      }

      /*主卡片样式*/
      .weather-card.dark-theme {
      }

      .main-content {
        position: relative;
        z-index: 2;
      }

      /*天气头部*/
      .weather-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-top: 0px;
        margin-bottom: 0px;
      }

      .weather-left {
        display: flex;
        align-items: center;
      }

      /*天气头部 图标*/
      .weather-icon {
        width: 10vw;
        height: 10vw;
        margin-right: 16px;
        margin-bottom: 0px;
      }

      /*天气头部 图标*/
      .weather-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      /*天气头部 温度*/
      .weather-temperature {
        height: 7vw;
        font-size: 5vw;
        font-weight: bold;
        margin-top: 0;
        margin-bottom: 0;
      }

      /*天气头部 天气信息*/
      .weather-info {
        height: 3vw;
        font-size: 3vw;
        margin-top: -1vw;
      }

      /*天气头部 城市信息*/
      .city-info {
        text-align: right;
        margin-top: 0.5vw;
        font-size: 4vw;
        font-weight: bold;
        white-space: nowrap;
      }

      /*天气右侧容器*/
      .weather-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: space-between;
        min-height: 10vw;
      }

      .forecast-toggle-button {
        margin-top: auto;
      }

      .toggle-btn {
        padding: 0.6vw 2vw;
        border: none;
        border-radius: 1.2vw;
        font-size: 1.8vw;
        cursor: pointer;
        transition: all 0.3s ease;
        color: white;
        font-weight: bold;
      }

      .toggle-btn.daily-mode {
        background: #03A9F4; /* 蓝色 */
      }

      .toggle-btn.hourly-mode {
        background: #9C27B0; /* 紫色 */
      }

      /*小时天气温度样式*/
      .temp-curve-hourly {
        position: absolute;
        left: 0;
        right: 0;
        height: 3.5vw;
        background: linear-gradient(to bottom, 
          rgba(156, 39, 176) 0%, 
          rgba(103, 58, 183) 100%);
        border-radius: 0.5vw;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 2vw;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 3;
      }

      /*9日天气部分*/
      .forecast-container {
        display: grid;
        gap: 0.4vw;
        margin-top: 2vw;
        position: relative;
      }

      /*小时天气滑动容器*/
      .hourly-forecast-scroll-container {
        overflow-x: auto;
        overflow-y: hidden;
        margin-top: 2vw;
        position: relative;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none;  /* IE and Edge */
      }

      .hourly-forecast-scroll-container::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Opera */
      }

      /*启用触摸滑动和平滑滚动*/
      .hourly-forecast-scroll-container {
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x;
        cursor: grab;
      }

      .hourly-forecast-scroll-container:active {
        cursor: grabbing;
      }

      /*小时天气内容容器*/
      .hourly-forecast-container {
        display: grid;
        gap: 0.4vw;
        position: relative;
        min-width: max-content;
      }

      /*9日天气部分*/
      .forecast-day {
        grid-row: 1;
        text-align: center;
        position: relative;
        z-index: 2;
        border-radius: 8px;
        padding: 1vw;
        position: relative;
      }

      /*9日天气部分 星期*/
      .forecast-weekday {
        font-size: 2.2vw;
        height: 2.8vw;
        margin-top: -1vw;
        margin-bottom: 0.2vw;
        font-weight: 500;
        white-space: nowrap;
      }
      
      /*9日天气部分 日期*/
      .forecast-date {
        font-size: 1.6vw;
        margin-bottom: 3vw;
        margin-left: 0vw;
        margin-right: 0vw;
        height: 2vw;
        white-space: nowrap;
      }

      /*9日天气部分 温度区域*/
      .forecast-temp-container {
        position: relative;
        height: 25vw;
        margin-top: 0;
        margin-bottom: 0;
      }

      /*9日天气部分 温度区域*/
      .forecast-temp-null {
        position: relative;
        height: 2vw;
      }

      /*9日天气部分 雨量容器*/
      .forecast-rainfall-container {
        text-align: center;
        position: relative;
        z-index: 3;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 2.5vw;
        margin-top: -2vw;
        margin-bottom: 0;
      }

      /*9日天气部分 雨量标签*/
      .forecast-rainfall {
        background: rgba(80, 177, 200, 0.8);
        color: white;
        font-size: 1.4vw;
        font-weight: bold;
        height: 2.5vw;
        min-width: 80% ;
        border-radius: 1.2vw;
        width: fit-content;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        padding: 0 0.5vw;
        display: flex;
        align-items: center;
        justify-content: center;
      }
 
      /*雨量填充矩形*/
      .rainfall-fill {
        position: absolute;
        left: 0;
        right: 0;
        background: rgba(80, 177, 200, 0.8);
        border-radius: 0.5vw;
        z-index: 0;
        margin: 0 -1vw;
        bottom: -3vw;
        transition: all 0.3s ease;
      }

      /*9日天气部分 图标*/
      .forecast-icon-container {
        text-align: center;
        position: relative;
        z-index: 2;
      }

      /*9日天气部分 图标*/
      .forecast-icon {
        width: 5vw;
        height: 5vw;
        margin: 0px auto;
        margin-top: 0;
      }

      /*9日天气部分 图标*/
      .forecast-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      /*9日天气部分 风速*/
      .forecast-wind-container {
        grid-row: 4;
        text-align: center;
        position: relative;
        z-index: 2;
        height: 3vw;
        margin-top: -1vw;
      }

      /*9日天气部分 风速*/
      .forecast-wind {
        font-size: 2vw;
        margin-top: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        height: 3vw;
      }

      /*9日天气部分 风速*/
      .wind-direction {
        font-size: 1.8vw;
      }

      /*9日天气部分 温度曲线 Canvas*/
      .temp-line-canvas {
        position: absolute;
        left: 0;
        width: 100%;
        pointer-events: none;
        z-index: 2;
      }

      .temp-line-canvas-high {
        top: 7.7vw;
        height: 25vw; 
      }

      .temp-line-canvas-low {
        top: 7.7vw;
        height: 25vw; 
      }

      .temp-curve-high {
        position: absolute;
        left: 0;
        right: 0;
        height: 3.5vw;
        background: linear-gradient(to bottom, 
          rgba(255, 87, 34) 0%, 
          rgba(255, 152, 0) 100%);
        border-radius: 0.5vw;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 2.2vw;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 3;
      }

      .temp-curve-low {
        position: absolute;
        left: 0;
        right: 0;
        height: 3.5vw;
        background: linear-gradient(to bottom, 
          rgba(3, 169, 243) 0%, 
          rgba(33, 150, 243) 100%);
        border-radius: 0.5vw;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 2.2vw;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 2;
      }

      /* 圆点模式样式 */
      .dot-mode .temp-curve-high,
      .dot-mode .temp-curve-low,
      .dot-mode .temp-curve-hourly {
        width: 1vw;
        height: 1vw;
        border-radius: 50%;
        left: calc(50% - 0.5vw);
        margin-top: -0.5vw;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2vw;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }

      .dot-mode .temp-curve-high {
        background: rgba(255, 87, 34);
      }

      .dot-mode .temp-curve-low {
        background: rgba(3, 169, 243);
      }

      .dot-mode .temp-curve-hourly {
        background: rgba(156, 39, 176);
      }

      /* 圆点上方的温度文字 */
      .dot-mode .temp-text {
        position: absolute;
        top: -4vw;
        left: 50%;
        transform: translateX(-50%);
        font-size: 2vw;
        font-weight: 600;
        white-space: nowrap;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 4;
      }

      .dot-mode .temp-curve-high .temp-text {
        color: rgba(255, 87, 34);
      }

      .dot-mode .temp-curve-low .temp-text {
        color: rgba(3, 169, 243);
      }

      .dot-mode .temp-curve-hourly .temp-text {
        color: rgba(156, 39, 176);
      }


      .unavailable {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 0;
        min-height: 0;
        max-height: 0;
        margin: 0;
        padding: 0;
      }

      /*预警图标和文字样式*/
      .warning-icon-text {
        color: #FFA726;
        height: 7vw;
        font-size: 4vw;
        font-weight: bold;
        margin-left: 3vw;
        cursor: pointer;
        transition: transform 0.2s ease;
      }

      .warning-icon-text:hover {
        transform: scale(1.1);
      }

      /*预警详情卡片样式*/
      .warning-details-card {
        position: relative;
        border-radius: 2vw;
        margin-top: 1vw;
        padding: 2vw;
        color: white;
        overflow: hidden;
        backdrop-filter: blur(5px);
        transition: all 0.3s ease;
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /*预警标题样式*/
      .warning-title-line {
        font-size: 2.5vw;
        font-weight: bold;
        white-space: nowrap;
        height: 4vw;
        margin-bottom: 0.5vw;
      }

      /*预警文本滚动容器*/
      .warning-text-container {
        display: flex;
        overflow: hidden;
        white-space: nowrap;
        width: 100%;
        height: 3vw;
        font-size: 2.5vw;
        align-items: center;
        margin-bottom: 1vw;
      }

      /*预警文本滚动内容*/
      .warning-text-scroll {
        display: inline-block;
        padding-left: 100%;
        animation: scroll linear infinite;
      }

      @keyframes scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-100%); }
      }
    `;
  }

  constructor() {
    super();
    this.mode = '家';
    this.forecastMode = 'daily'; // 默认显示每日天气
    this.showWarningDetails = false;
    this.warningTimer = null;
  }
  
  _evaluateTheme() {
    try {
      if (!this._config || !this._config.theme) return 'on';
      if (typeof this._config.theme === 'function') {
          return this._config.theme();
      }
      if (typeof this._config.theme === 'string' && 
              (this._config.theme.includes('return') || this._config.theme.includes('=>'))) {
          return (new Function(`return ${this._config.theme}`))();
      }
      return this._config.theme;
    } catch(e) {
      console.error('计算主题时出错:', e);
      return 'on';
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._updateEntities();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('config') || changedProperties.has('hass')) {
      this._updateEntities();
    }
  }

  _updateEntities() {
    if (!this.hass || !this.config) return;

    this.entity = this.hass.states[this.config.entity];
    this._config = this.config; // 保存配置供 _evaluateTheme 使用
    this.mode = this.config.mode || 'home';
  }

  _getWeatherIcon(condition) {
    const sunState = this.hass?.states['sun.sun']?.state || 'above_horizon';
    const theme = this._evaluateTheme();
    const isDark = theme === 'on';
    const iconPath = XiaoshiWeatherPhoneCard.ICON_PATH;
    
    const iconMap = {
      '晴': isDark ? 
        (sunState === 'above_horizon' ? `${iconPath}/晴-白天-暗黑.svg` : `${iconPath}/晴-夜晚-暗黑.svg`) :
        (sunState === 'above_horizon' ? `${iconPath}/晴-白天.svg` : `${iconPath}/晴-夜晚.svg`),
      '少云': isDark ?
        (sunState === 'above_horizon' ? `${iconPath}/少云-白天-暗黑.svg` : `${iconPath}/少云-夜晚-暗黑.svg`) :
        (sunState === 'above_horizon' ? `${iconPath}/少云-白天.svg` : `${iconPath}/少云-夜晚.svg`),
      '多云': isDark ?
        (sunState === 'above_horizon' ? `${iconPath}/多云-白天-暗黑.svg` : `${iconPath}/多云-夜晚-暗黑.svg`) :
        (sunState === 'above_horizon' ? `${iconPath}/多云-白天.svg` : `${iconPath}/多云-夜晚.svg`),
      '阴': isDark ? `${iconPath}/阴-暗黑.svg` : `${iconPath}/阴.svg`,
      '雨夹雪': isDark ? `${iconPath}/雨夹雪-暗黑.svg` : `${iconPath}/雨夹雪.svg`,
      '小雨': isDark ? `${iconPath}/小雨-暗黑.svg` : `${iconPath}/小雨.svg`,
      '小雪': isDark ? `${iconPath}/小雪-暗黑.svg` : `${iconPath}/小雪.svg`,
      'clear-night': isDark ? `${iconPath}/晴-夜晚-暗黑.svg` : `${iconPath}/晴-夜晚.svg`,
      'cloudy': isDark ? `${iconPath}/多云-暗黑.svg` : `${iconPath}/多云.svg`,
      'partlycloudy': isDark ? `${iconPath}/少云-暗黑.svg` : `${iconPath}/少云.svg`,
      'sunny': isDark ? `${iconPath}/晴-白天-暗黑.svg` : `${iconPath}/晴-白天.svg`,
      'rainy': isDark ? `${iconPath}/小雨-暗黑.svg` : `${iconPath}/小雨.svg`,
      'snowy': isDark ? `${iconPath}/小雪-暗黑.svg` : `${iconPath}/小雪.svg`,
      'snowy-rainy': isDark ? `${iconPath}/雨夹雪-暗黑.svg` : `${iconPath}/雨夹雪.svg`
    };

    return iconMap[condition] || (isDark ? `${iconPath}/${condition}-暗黑.svg` : `${iconPath}/${condition}.svg`);
  }

  _formatTemperature(temp) {
    if (temp === undefined || temp === null) return '--';
    return temp.toString().includes('.') ? temp : temp;
  }

  _getCityIcon() {
    const icons = {
      '家': '🏠',
      '搜索城市': '🔍',
      '手机定位': '📍'
    };
    return icons[this.mode] || '🏠';
  }

  _getWeekday(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }

  _getForecastDays() {
    const columns = this.config?.columns || XiaoshiWeatherPhoneCard.TEMPERATURE_CONSTANTS.FORECAST_COLUMNS;
    if (!this.entity?.attributes?.daily_forecast) return [];
    return this.entity.attributes.daily_forecast.slice(0, columns);
  }

  _getHourlyForecast() {
    if (!this.entity?.attributes?.hourly_forecast) return [];
    
    // 直接取前24小时数据，用于滑动显示
    return this.entity.attributes.hourly_forecast.slice(0, 24);
  }

  _toggleForecastMode(mode) {
    this.forecastMode = mode;
    this.requestUpdate();
  }

  _toggleWarningDetails() {
    if (this.showWarningDetails) {
      // 如果当前显示，则隐藏并清除定时器
      this._hideWarningDetails();
    } else {
      // 如果当前隐藏，则显示并设置20秒定时器
      this.showWarningDetails = true;
      this.requestUpdate();
      
      // 清除之前的定时器
      if (this.warningTimer) {
        clearTimeout(this.warningTimer);
      }
      
      // 设置20秒后自动隐藏
      this.warningTimer = setTimeout(() => {
        this._hideWarningDetails();
      }, 20000);
    }
  }

  _hideWarningDetails() {
    this.showWarningDetails = false;
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    this.requestUpdate();
  }

  _formatHourlyTime(datetime) {
    const date = new Date(datetime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  _formatHourlyDate(datetime) {
    const date = new Date(datetime);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}月${day}日`;
  }


  _getCustomTemperature() {
    if (!this.config?.use_custom_entities || !this.config?.temperature_entity || !this.hass?.states[this.config.temperature_entity]) {
      return null;
    }
    
    const temp = this.hass.states[this.config.temperature_entity].state;
    const tempValue = parseFloat(temp);
    
    if (isNaN(tempValue)) {
      return null;
    }
    
    // 保留1位小数
    return tempValue.toFixed(1);
  }

  _getCustomHumidity() {
    if (!this.config?.use_custom_entities || !this.config?.humidity_entity || !this.hass?.states[this.config.humidity_entity]) {
      return null;
    }
    
    const humidity = this.hass.states[this.config.humidity_entity].state;
    const humidityValue = parseFloat(humidity);
    
    if (isNaN(humidityValue)) {
      return null;
    }
    
    // 保留1位小数
    return humidityValue.toFixed(1);
  }

  _getTemperatureExtremes() {
    let temperatures = [];
    
    if (this.forecastMode === 'daily') {
      const forecastDays = this._getForecastDays();
      if (forecastDays.length === 0) {
        return { minTemp: 0, maxTemp: 0, range: 0 };
      }
      temperatures = forecastDays.flatMap(day => [
        parseFloat(day.native_temp_low) || 0,
        parseFloat(day.native_temperature) || 0
      ]);
    } else {
      const hourlyForecast = this._getHourlyForecast();
      if (hourlyForecast.length === 0) {
        return { minTemp: 0, maxTemp: 0, range: 0 };
      }
      temperatures = hourlyForecast.map(hour => parseFloat(hour.native_temperature) || 0);
    }

    const minTemp = Math.min(...temperatures);
    const maxTemp = Math.max(...temperatures);
    const range = maxTemp - minTemp;
    
    // 检查是否所有温度都相等
    const allEqual = temperatures.every(temp => temp === temperatures[0]);
    
    return { minTemp, maxTemp, range, allEqual };
  }

  _calculateTemperatureBounds(day, extremes) {
    const { minTemp, maxTemp, range } = extremes;
    const highTemp = parseFloat(day.native_temperature) || 0;
    const lowTemp = parseFloat(day.native_temp_low) || 0;
    
    // 使用常量
    const { BUTTON_HEIGHT_VW, CONTAINER_HEIGHT_VW } = XiaoshiWeatherPhoneCard.TEMPERATURE_CONSTANTS;
    
    // 最终分配的区间高度
    const availableHeight = CONTAINER_HEIGHT_VW - BUTTON_HEIGHT_VW;
    
    if (range === 0) {
      return { highTop: 2, lowTop: 10 }; // 默认位置
    }
    
    // 每个温度值对应top位置 = (max-当前温度值) * availableHeight / range
    const unitPosition = availableHeight / range;
    
    // 高温矩形的上边界位置（温度越高，top值越小）
    const highTop = (maxTemp - highTemp) * unitPosition;
    
    // 低温矩形的上边界位置（温度越低，top值越大）
    const lowTop = availableHeight - (lowTemp - minTemp) * unitPosition;
    
    const finalHighTop = Math.max(0, Math.min(highTop, CONTAINER_HEIGHT_VW - BUTTON_HEIGHT_VW));
    const finalLowTop = Math.max(0, Math.min(lowTop, CONTAINER_HEIGHT_VW - BUTTON_HEIGHT_VW));
    
    return { 
      highTop: finalHighTop, 
      lowTop: finalLowTop
    };
  } 

  _generateTemperatureLine(forecastData, extremes, isHigh = true) {
    if (forecastData.length === 0) return { points: [], curveHeight: 0, curveTop: 0 };
    
    const { BUTTON_HEIGHT_VW, FORECAST_COLUMNS } = XiaoshiWeatherPhoneCard.TEMPERATURE_CONSTANTS;
    
    // 动态计算实际列数
    const actualColumns = this.forecastMode === 'daily' ? 
      (this.config?.columns || FORECAST_COLUMNS) : 
      forecastData.length;
    
    let boundsList;
    if (this.forecastMode === 'daily') {
      // 每日天气使用现有的计算方法
      boundsList = forecastData.map(day => this._calculateTemperatureBounds(day, extremes));
    } else {
      // 小时天气只需要一个温度，简化计算
      const { minTemp, maxTemp, range, allEqual } = extremes;
      const { BUTTON_HEIGHT_VW, CONTAINER_HEIGHT_VW } = XiaoshiWeatherPhoneCard.TEMPERATURE_CONSTANTS;
      const availableHeight = CONTAINER_HEIGHT_VW - BUTTON_HEIGHT_VW;
      
      // 如果所有温度相等，将位置设置在中间
      if (allEqual) {
        const middlePosition = (CONTAINER_HEIGHT_VW - BUTTON_HEIGHT_VW) / 2;
        boundsList = forecastData.map(() => ({
          highTop: middlePosition,
          lowTop: middlePosition
        }));
      } else {
        const unitPosition = range === 0 ? 0 : availableHeight / range;
        boundsList = forecastData.map(hour => {
          const temp = parseFloat(hour.native_temperature) || 0;
          const topPosition = (maxTemp - temp) * unitPosition;
          return { highTop: topPosition, lowTop: topPosition };
        });
      }
    }
    
    // 计算曲线范围
    let curveTop, curveBottom, curveHeight;
    
    if (this.forecastMode === 'daily') {
      if (isHigh) {
        const highTops = boundsList.map(bounds => bounds.highTop);
        curveTop = Math.min(...highTops);
        curveBottom = Math.max(...highTops) + BUTTON_HEIGHT_VW;
        curveHeight = curveBottom - curveTop;
      } else {
        const lowTops = boundsList.map(bounds => bounds.lowTop);
        curveTop = 0;
        curveBottom = Math.max(...lowTops) + BUTTON_HEIGHT_VW;
        curveHeight = curveBottom - curveTop;
      }
    } else {
      // 小时天气模式
      const tops = boundsList.map(bounds => bounds.highTop);
      const { allEqual } = extremes;
      
      if (allEqual) {
        // 如果所有温度相等，将曲线设置在中间位置，高度为按钮高度
        curveTop = 0; // 所有点都在同一个位置
        curveBottom = curveTop + BUTTON_HEIGHT_VW;
        curveHeight = BUTTON_HEIGHT_VW;
      } else {
        curveTop = Math.min(...tops);
        curveBottom = Math.max(...tops) + BUTTON_HEIGHT_VW;
        curveHeight = curveBottom - curveTop;
      }
    }
    
    const points = forecastData.map((data, index) => {
      const bounds = boundsList[index];
      const topPosition = this.forecastMode === 'daily' ? 
        (isHigh ? bounds.highTop : bounds.lowTop) : 
        bounds.highTop;
      
      // 计算相对于曲线顶部的Y坐标（vw单位），使用矩形中心
      const y = topPosition - curveTop + BUTTON_HEIGHT_VW / 1.7;
      
      // 计算X坐标（百分比）
      const x = (index * 100) / actualColumns + (100 / actualColumns) / 2;
      
      return { x, y };
    });
    
    return { points, curveHeight, curveTop };
  }

  _getInstanceId() {
    if (!this._instanceId) {
      this._instanceId = Math.random().toString(36).substr(2, 9);
    }
    return this._instanceId;
  }

  _generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  _drawTemperatureCurve(canvasId, points, color) {
    
    requestAnimationFrame(() => {
      // 先在shadow DOM中查找，再在document中查找
      let canvas = this.shadowRoot?.getElementById(canvasId) || document.getElementById(canvasId);
      
      if (!canvas) {
        // 通过类名查找
        const className = canvasId.includes('high') ? 'temp-line-canvas-high' : 'temp-line-canvas-low';
        canvas = this.shadowRoot?.querySelector(`.${className}`) || document.querySelector(`.${className}`);
      }
      
      if (!canvas) {
        return;
      }
      
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      
      // 设置Canvas实际尺寸
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      if (points.length < 2) {
        return;
      }
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 设置线条样式
      ctx.strokeStyle = color;
      ctx.lineWidth = 2; // 固定线宽
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 开始绘制路径
      ctx.beginPath();
      
      const { CONTAINER_HEIGHT_VW } = XiaoshiWeatherPhoneCard.TEMPERATURE_CONSTANTS;
      
      // 转换所有点为Canvas坐标
      const canvasPoints = points.map((point, index) => {
        const x = (point.x / 100) * canvas.width;
        const y = (point.y / CONTAINER_HEIGHT_VW) * canvas.height;
        return { x, y };
      });
      
      if (canvasPoints.length < 2) {
        // 如果只有两个点，直接画直线
        if (canvasPoints.length === 2) {
          ctx.beginPath();
          ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
          ctx.lineTo(canvasPoints[1].x, canvasPoints[1].y);
          ctx.stroke();
        }
        return;
      }
      
      // 开始绘制平滑曲线，确保通过所有原始点
      ctx.beginPath();
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
      
      // 使用更保守的样条算法，减少曲线过度弯曲
      const tension = 0.15; // 减小张力系数，避免过度弯曲
      
      for (let i = 0; i < canvasPoints.length - 1; i++) {
        const p0 = canvasPoints[Math.max(0, i - 1)];
        const p1 = canvasPoints[i];
        const p2 = canvasPoints[i + 1];
        const p3 = canvasPoints[Math.min(canvasPoints.length - 1, i + 2)];
        
        // 计算控制点，限制控制点距离，避免过度弯曲
        const dx1 = (p2.x - p0.x) * tension;
        const dy1 = (p2.y - p0.y) * tension;
        const dx2 = (p3.x - p1.x) * tension;
        const dy2 = (p3.y - p1.y) * tension;
        
        // 限制控制点的垂直距离，防止曲线超出边界
        const maxControlDistance = Math.abs(p2.x - p1.x) * 0.3;
        const limitedDy1 = Math.max(-maxControlDistance, Math.min(maxControlDistance, dy1));
        const limitedDy2 = Math.max(-maxControlDistance, Math.min(maxControlDistance, dy2));
        
        const cp1x = p1.x + dx1;
        const cp1y = p1.y + limitedDy1;
        const cp2x = p2.x - dx2;
        const cp2y = p2.y - limitedDy2;
        
        // 如果是第一段，使用二次贝塞尔
        if (i === 0) {
          ctx.quadraticCurveTo(cp1x, cp1y, p2.x, p2.y);
        } else {
          // 使用三次贝塞尔曲线，确保通过原始点
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      }
      
      ctx.stroke();
    });
  }

  _getWarningColor(warning) {
    if (!warning || warning.length === 0) return "#FFA726"; // 默认颜色
    
    let level = "";
    const priority = ["红色", "橙色", "黄色", "蓝色"];
    
    for (let i = 0; i < warning.length; i++) {
      const currentLevel = warning[i].level;
      if (priority.indexOf(currentLevel) < priority.indexOf(level) || level == "") {
        level = currentLevel;
      }
    }
    
    if (level == "红色") return "rgb(255,50,50)";
    if (level == "橙色") return "rgb(255,100,0)";
    if (level == "黄色") return "rgb(255,200,0)";
    if (level == "蓝色") return "rgb(50,150,200)";
    
    return "#FFA726"; // 默认颜色
  }

  render() {
    if (!this.entity || this.entity.state === 'unavailable') {
      return html`<div class="unavailable"></div>`;
    }
    // 获取自定义或默认的温度和湿度
    const customTemp = this._getCustomTemperature();
    const customHumidity = this._getCustomHumidity();
    const temperature = customTemp || this._formatTemperature(this.entity.attributes?.temperature);
    const humidity = customHumidity || this._formatTemperature(this.entity.attributes?.humidity);
    const condition = this.entity.attributes?.condition_cn || '未知';
    const windSpeed = this.entity.attributes?.wind_speed || 0;
    const city = this.entity.attributes?.city || '未知城市';
    const warning = this.entity.attributes?.warning || [];
    const theme = this._evaluateTheme();
    const hasWarning = warning && Array.isArray(warning) && warning.length > 0;
    const warningColor = this._getWarningColor(warning);

    // 获取颜色
    const fgColor = theme === 'on' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
    const bgColor = theme === 'on' ? 'rgb(255, 255, 255)' : 'rgb(50, 50, 50)';
    const secondaryColor = theme === 'on' ? 'rgb(110, 190, 240)' : 'rgb(110, 190, 240)';
    const visualStyle = this.config.visual_style || 'button';
    const isDotMode = visualStyle === 'dot';

    return html`
      <div class="weather-card ${theme === 'on' ? 'dark-theme' : ''} ${isDotMode ? 'dot-mode' : ''}" style="background-color: ${bgColor}; color: ${fgColor};">
        <div class="main-content">
          <!-- 天气头部信息 -->
          <div class="weather-header">
            <div class="weather-left">
              <div class="weather-icon">
                <img src="${this._getWeatherIcon(condition)}" alt="${condition}">
              </div>
              <div class="weather-details">
                <div class="weather-temperature">
                  ${temperature}<font size="1vw"><b> ℃&ensp;</b></font>
                  ${humidity}<font size="1vw"><b> % </b></font>
                  ${hasWarning ? 
                    html`<span class="warning-icon-text" style="color: ${warningColor}; cursor: pointer; user-select: none;" @click="${() => this._toggleWarningDetails()}">⚠ ${warning.length}</span>` : ''}
                </div>
                <div class="weather-info" style="color: ${secondaryColor};">${condition}   ${windSpeed} km/h</div>
              </div>
            </div>
            <!-- 城市信息 - 放在头部右侧 -->
            <div class="weather-right">
              <div class="city-info">${this._getCityIcon()}${city}</div>
              <!-- 切换按钮 -->
              <div class="forecast-toggle-button">
                <button class="toggle-btn ${this.forecastMode === 'daily' ? 'daily-mode' : 'hourly-mode'}" @click="${() => this._toggleForecastMode(this.forecastMode === 'daily' ? 'hourly' : 'daily')}">
                  ${this.forecastMode === 'daily' ? '小时天气' : '每日天气'}
                </button>
              </div>
            </div>
          </div>

          <!-- 预报内容 -->
          ${this._renderDailyForecast()}

        </div>
        
        <!-- 预警详情 - 在最下方显示 -->
        ${this.showWarningDetails && hasWarning ? this._renderWarningDetails() : ''}
      </div>
    `;
  }

  _renderDailyForecast() {
    if (this.forecastMode === 'hourly') {
      return this._renderHourlyForecast();
    }
    
    const forecastDays = this._getForecastDays();
    const extremes = this._getTemperatureExtremes();
    const theme = this._evaluateTheme();
    const secondaryColor = theme === 'on' ? 'rgb(60, 140, 190)' : 'rgb(110, 190, 240)';
    const backgroundColor = theme === 'on' ? 'rgba(120, 120, 120, 0.1)' : 'rgba(255, 255, 255, 0.1)';

    // 生成温度曲线坐标
    const highTempData = this._generateTemperatureLine(forecastDays, extremes, true);
    const lowTempData = this._generateTemperatureLine(forecastDays, extremes, false);
    
    // 使用组件实例ID + Canvas ID，避免多实例冲突
    const instanceId = this._getInstanceId();
    const highCanvasId = `high-temp-canvas-${instanceId}`;
    const lowCanvasId = `low-temp-canvas-${instanceId}`;
    
    // 在DOM更新完成后绘制曲线
    this.updateComplete.then(() => {
      setTimeout(() => {
        this._drawTemperatureCurve(highCanvasId, highTempData.points, 'rgba(255, 87, 34, 0.8)');
        this._drawTemperatureCurve(lowCanvasId, lowTempData.points, 'rgba(33, 150, 243, 0.8)');
      }, 50);
    });
    
    const columns = this.config?.columns || XiaoshiWeatherPhoneCard.TEMPERATURE_CONSTANTS.FORECAST_COLUMNS;
    return html`
      <div class="forecast-container" style="grid-template-columns: repeat(${columns}, 1fr);">
        <!-- 最高温度连接线 Canvas -->
        <canvas class="temp-line-canvas temp-line-canvas-high" id="high-temp-canvas-${this._getInstanceId()}"></canvas>
        
        <!-- 最低温度连接线 Canvas -->
        <canvas class="temp-line-canvas temp-line-canvas-low" id="low-temp-canvas-${this._getInstanceId()}"></canvas>
        
        ${forecastDays.map((day, index) => {
          const date = new Date(day.datetime);
          const weekday = this._getWeekday(date);
          const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
          const highTemp = this._formatTemperature(day.native_temperature);
          const lowTemp = this._formatTemperature(day.native_temp_low);
          
          // 计算温度矩形的动态边界和高度
          const tempBounds = this._calculateTemperatureBounds(day, extremes);
          
          // 获取雨量信息
          const rainfall = parseFloat(day.native_precipitation) || 0;
          
          // 计算雨量矩形高度和位置
          const RAINFALL_MAX = 20; // 最大雨量20mm
          const rainfallHeight = Math.min((rainfall / RAINFALL_MAX) * 25, 25); // 最大高度21.6vw（到日期下面）

          return html`
            <div class="forecast-day" style="background: ${backgroundColor};">
              <!-- 星期（周X） -->
              <div class="forecast-weekday">${weekday}</div>
              
              <!-- 日期（mm月dd日） -->
              <div class="forecast-date" style="color: ${secondaryColor};">${dateStr}</div>
              
              <!-- 高温（橙色）和 低温（蓝色） -->
              <div class="forecast-temp-container">
                ${this.config.visual_style === 'dot' ? html`
                  <!-- 圆点模式 -->
                  <div class="temp-curve-high" style="top: ${tempBounds.highTop + 1.75}vw">
                    <div class="temp-text">${highTemp}°</div>
                  </div>
                  <div class="temp-curve-low" style="top: ${tempBounds.lowTop + 1.75}vw">
                    <div class="temp-text">${lowTemp}°</div>
                  </div>
                ` : html`
                  <!-- 按钮模式 -->
                  <div class="temp-curve-high" style="top: ${tempBounds.highTop}vw">
                    ${highTemp} °
                  </div>
                  <div class="temp-curve-low" style="top: ${tempBounds.lowTop}vw">
                    ${lowTemp} °
                  </div>
                `}
                
                <!-- 雨量填充矩形 -->
                ${rainfall > 0 ? html`
                  <div class="rainfall-fill" style="height: ${rainfallHeight}vw; opacity: ${0.3+rainfall / RAINFALL_MAX}"></div>
                ` : ''}
              </div>
              <div class="forecast-temp-null"></div>
            </div>
          `;
        })}
        
        <!-- 雨量标签行 - 10列网格 -->
        ${forecastDays.map(day => {
          const rainfall = parseFloat(day.native_precipitation) || 0;
          return html`
            <div class="forecast-rainfall-container">
              ${rainfall > 0 ? html`
                <div class="forecast-rainfall">
                  ${rainfall}mm
                </div>
              ` : ''}
            </div>
          `;
        })}
        
        <!-- 天气图标行 -->
        ${this._renderWeatherIcons(forecastDays)}
        
        <!-- 风向风级行 -->
        ${this._renderWindInfo(forecastDays)}
      </div>
    `;
  }

  _renderHourlyForecast() {
    const hourlyForecast = this._getHourlyForecast();
    const extremes = this._getTemperatureExtremes();
    const theme = this._evaluateTheme();
    const secondaryColor = theme === 'on' ? 'rgb(60, 140, 190)' : 'rgb(110, 190, 240)';
    const backgroundColor = theme === 'on' ? 'rgba(120, 120, 120, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    // 生成温度曲线坐标（小时天气只有一个温度）
    const tempData = this._generateTemperatureLine(hourlyForecast, extremes, true);
    
    // 使用组件实例ID + Canvas ID，避免多实例冲突
    const instanceId = this._getInstanceId();
    const canvasId = `hourly-temp-canvas-${instanceId}`;
    
    // 在DOM更新完成后绘制曲线
    this.updateComplete.then(() => {
      setTimeout(() => {
        this._drawTemperatureCurve(canvasId, tempData.points, 'rgba(156, 39, 176, 0.8)');
      }, 50);
    });
    
    // 计算实际列数（小时天气可能有更多数据）
    const columns = hourlyForecast.length;
    // 使用与每日天气相同的宽度计算公式：
    // 每列宽度 = (100vw - 8px*2 - (FORECAST_COLUMNS-1)*2px) / FORECAST_COLUMNS
    const FORECAST_COLUMNS = XiaoshiWeatherPhoneCard.TEMPERATURE_CONSTANTS.FORECAST_COLUMNS;
    const columnWidth = 9.6
     
    return html`
      <div class="hourly-forecast-scroll-container">
        <div class="hourly-forecast-container" style="grid-template-columns: repeat(${columns}, ${columnWidth}vw);">
          <!-- 小时温度连接线 Canvas -->
          <canvas class="temp-line-canvas temp-line-canvas-high" id="hourly-temp-canvas-${this._getInstanceId()}"></canvas>
          
          ${hourlyForecast.map((hour, index) => {
            const timeStr = this._formatHourlyTime(hour.datetime);
            const dateStr = this._formatHourlyDate(hour.datetime);
            const temp = this._formatTemperature(hour.native_temperature);
            
            // 获取雨量信息
            const rainfall = parseFloat(hour.native_precipitation) || 0;
            
            // 计算温度位置（简化版）
            const { minTemp, maxTemp, range, allEqual } = extremes;
            const { BUTTON_HEIGHT_VW, CONTAINER_HEIGHT_VW } = XiaoshiWeatherPhoneCard.TEMPERATURE_CONSTANTS;
            const availableHeight = CONTAINER_HEIGHT_VW - BUTTON_HEIGHT_VW;
            
            let finalTopPosition;
            if (allEqual) {
              // 如果所有温度相等，将位置设置在中间
              finalTopPosition = (CONTAINER_HEIGHT_VW - BUTTON_HEIGHT_VW) / 2;
            } else {
              const unitPosition = range === 0 ? 0 : availableHeight / range;
              const tempValue = parseFloat(hour.native_temperature) || 0;
              const topPosition = (maxTemp - tempValue) * unitPosition;
              finalTopPosition = Math.max(0, Math.min(topPosition, CONTAINER_HEIGHT_VW - BUTTON_HEIGHT_VW));
            }
            
            // 计算雨量矩形高度和位置
            const RAINFALL_MAX = 2; // 最大雨量2mm
            const rainfallHeight = Math.min((rainfall / RAINFALL_MAX) * 25, 25);

            return html`
              <div class="forecast-day" style="background: ${backgroundColor};">
                <!-- 时间（hh:mm） -->
                <div class="forecast-weekday">${timeStr}</div>
                
                <!-- 日期（mm月dd日） -->
                <div class="forecast-date" style="color: ${secondaryColor};">${dateStr}</div>
                
                <!-- 温度（紫色） -->
                <div class="forecast-temp-container">
                  ${this.config.visual_style === 'dot' ? html`
                    <!-- 圆点模式 -->
                    <div class="temp-curve-hourly" style="top: ${finalTopPosition + 1.75}vw">
                      <div class="temp-text">${temp}°</div>
                    </div>
                  ` : html`
                    <!-- 按钮模式 -->
                    <div class="temp-curve-hourly" style="top: ${finalTopPosition}vw">
                      ${temp} °
                    </div>
                  `}
                  
                  <!-- 雨量填充矩形 -->
                  ${rainfall > 0 ? html`
                    <div class="rainfall-fill" style="height: ${rainfallHeight}vw; opacity: ${0.3+rainfall / RAINFALL_MAX}"></div>
                  ` : ''}
                </div>
                <div class="forecast-temp-null"></div>
              </div>
            `;
          })}
          
          <!-- 雨量标签行 -->
          ${hourlyForecast.map(hour => {
            const rainfall = parseFloat(hour.native_precipitation) || 0;
            return html`
              <div class="forecast-rainfall-container">
                ${rainfall > 0 ? html`
                  <div class="forecast-rainfall">
                    ${rainfall}mm
                  </div>
                ` : ''}
              </div>
            `;
          })}
          
          <!-- 天气图标行 -->
          ${this._renderHourlyWeatherIcons(hourlyForecast)}
          
          <!-- 风向风级行 -->
          ${this._renderHourlyWindInfo(hourlyForecast)}
        </div>
      </div>
    `;
  }

  _renderWeatherIcons(forecastDays) {
    return html`
      ${forecastDays.map(day => {
        return html`
          <div class="forecast-icon-container">
            <div class="forecast-icon">
              <img src="${this._getWeatherIcon(day.text)}" alt="${day.text}">
            </div>
          </div>
        `;
      })}
    `;
  }

  _renderHourlyWeatherIcons(hourlyForecast) {
    return html`
      ${hourlyForecast.map(hour => {
        return html`
          <div class="forecast-icon-container">
            <div class="forecast-icon">
              <img src="${this._getWeatherIcon(hour.text)}" alt="${hour.text}">
            </div>
          </div>
        `;
      })}
    `;
  }

  _renderWindInfo(forecastDays) {
    const theme = this._evaluateTheme();
    const secondaryColor = theme === 'on' ? 'rgb(10, 90, 140)' : 'rgb(110, 190, 240)';
    return html`
      ${forecastDays.map(day => {
        const windSpeedRaw = day.windscaleday || 0;
        let windSpeed = windSpeedRaw;
        
        // 如果风速是 "4-5" 格式，取最大值
        if (typeof windSpeedRaw === 'string' && windSpeedRaw.includes('-')) {
          const speeds = windSpeedRaw.split('-').map(s => parseFloat(s.trim()));
          if (speeds.length === 2 && !isNaN(speeds[0]) && !isNaN(speeds[1])) {
            windSpeed = Math.max(speeds[0], speeds[1]);
          }
        }
        
        const windDirection = day.wind_bearing || 0;
        
        return html`
          <div class="forecast-wind-container">
            <div class="forecast-wind" style="color: ${secondaryColor};">
              <span class="wind-direction" >${this._getWindDirectionIcon(windDirection)}</span>
              <span>${windSpeed}级</span>
            </div>
          </div>
        `;
      })}
    `;
  }

  _renderHourlyWindInfo(hourlyForecast) {
    const theme = this._evaluateTheme();
    const secondaryColor = theme === 'on' ? 'rgb(10, 90, 140)' : 'rgb(110, 190, 240)';
    return html`
      ${hourlyForecast.map(hour => {
        const windSpeedRaw = hour.windscaleday || 0;
        let windSpeed = windSpeedRaw;
        
        // 如果风速是 "4-5" 格式，取最大值
        if (typeof windSpeedRaw === 'string' && windSpeedRaw.includes('-')) {
          const speeds = windSpeedRaw.split('-').map(s => parseFloat(s.trim()));
          if (speeds.length === 2 && !isNaN(speeds[0]) && !isNaN(speeds[1])) {
            windSpeed = Math.max(speeds[0], speeds[1]);
          }
        }
        
        const windDirection = hour.wind_bearing || 0;
        
        return html`
          <div class="forecast-wind-container">
            <div class="forecast-wind" style="color: ${secondaryColor};">
              <span class="wind-direction">${this._getWindDirectionIcon(windDirection)}</span>
              <span>${windSpeed}级</span>
            </div>
          </div>
        `;
      })}
    `;
  }

  _getWindDirectionIcon(bearing) {
    // 0是北风，按顺时针方向增加
    const directions = [
      { range: [337.5, 360], icon: '⬆️', name: '北' },    // 337.5-360度
      { range: [0, 22.5], icon: '⬆️', name: '北' },        // 0-22.5度
      { range: [22.5, 67.5], icon: '↗️', name: '东北' },    // 22.5-67.5度
      { range: [67.5, 112.5], icon: '➡️', name: '东' },     // 67.5-112.5度
      { range: [112.5, 157.5], icon: '↘️', name: '东南' },   // 112.5-157.5度
      { range: [157.5, 202.5], icon: '⬇️', name: '南' },     // 157.5-202.5度
      { range: [202.5, 247.5], icon: '↙️', name: '西南' },   // 202.5-247.5度
      { range: [247.5, 292.5], icon: '⬅️', name: '西' },     // 247.5-292.5度
      { range: [292.5, 337.5], icon: '↖️', name: '西北' }    // 292.5-337.5度
    ];

    const direction = directions.find(dir => {
      if (dir.range[0] <= dir.range[1]) {
        // 正常范围，如 22.5-67.5
        return bearing >= dir.range[0] && bearing < dir.range[1];
      } else if (dir.range[0] === 337.5 && dir.range[1] === 360) {
        // 337.5-360度特殊处理
        return bearing >= dir.range[0] && bearing <= 360;
      } else if (dir.range[0] === 0 && dir.range[1] === 22.5) {
        // 0-22.5度特殊处理
        return bearing >= dir.range[0] && bearing < dir.range[1];
      }
      return false;
    });

    return direction ? direction.icon : '⬇️';
  }

  _renderWarningDetails() {
    if (!this.showWarningDetails || !this.entity?.attributes?.warning) {
      return '';
    }

    const warning = this.entity.attributes.warning;
    const cardHeight = `${warning.length * 8}vw`;
    const warningColor = this._getWarningColor(warning);
    const theme = this._evaluateTheme();
    const textcolor = theme === 'on' ? 'rgba(0, 0, 0)' : 'rgba(255, 255, 255)';
    const backgroundColor = theme === 'on' ? 'rgba(120, 120, 120, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    return html`
      <div class="warning-details-card" style="height: ${cardHeight}; background-color: ${backgroundColor};">
        ${warning.map((warningItem, index) => {
          const typeName = warningItem.typeName ?? "";
          const level = warningItem.level ?? "";
          const sender = warningItem.sender ?? "";
          const startTime = warningItem.startTime ? warningItem.startTime.slice(0, 10) : "";
          const endTime = warningItem.endTime ? warningItem.endTime.slice(0, 10) : "";
          const text = warningItem.text ?? "";
          const scrollDuration = Math.max(5, text.length * 0.3);

          return html`
            <div style="margin-bottom: 1vw;">
              <!-- 第一行：预警标题 -->
              <div class="warning-title-line" style="color: ${warningColor};">
                ${sender}: 【${typeName}】${level}预警&emsp;( ${startTime}至${endTime} )
              </div>
              
              <!-- 第二行：预警文本滚动 -->
              <div class="warning-text-container" style="color: ${textcolor}; ">
                <div class="warning-text-scroll" style="animation-duration: ${scrollDuration}s;">
                  <span>${text}</span>
                </div>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }



  setConfig(config) {
    if (!config.entity) {
      throw new Error('需要指定天气实体');
    }
    this.config = config;
  }

  getCardSize() {
    return 8;
  }
}
customElements.define('xiaoshi-weather-phone-card', XiaoshiWeatherPhoneCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "xiaoshi-weather-phone-card",
  name: "天气卡片（手机端）",
  preview: true
});
