console.info("%c 天气卡片 \n%c   v 4.4   ", "color: red; font-weight: bold; background: black", "color: white; font-weight: bold; background: black");
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
        
       
        <div class="form-group conditional-field ${this.config.mode === '搜索城市' ? 'visible' : ''}" id="city-entity-group">
          <label>搜索城市text实体</label>
          <div class="entity-search-container">
            <input 
              type="text" 
              .value=${this.config.city_entity || 'text.set_city'}
              @input=${this._onCityEntityInput}
              @change=${this._entityChanged}
              name="city_entity"
              placeholder="搜索城市text实体（如 text.set_city）"
              list="city-entities"
            />
            <datalist id="city-entities">
              ${Object.keys(this.hass.states)
                .filter(entityId => 
                  entityId.startsWith('text.') ||
                  entityId.toLowerCase().includes('city') ||
                  entityId.toLowerCase().includes('城市')
                )
                .map(entityId => html`
                  <option value="${entityId}">
                    ${this.hass.states[entityId].attributes.friendly_name || entityId}
                  </option>
                `)}
            </datalist>
          </div>
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
    if (!value && name !== 'theme' && name !== 'mode' && name !== 'columns' && name !== 'use_custom_entities' && name !== 'temperature_entity' && name !== 'humidity_entity' && name !== 'city_entity' && name !== 'visual_style') return;

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
    if (name === 'use_custom_entities' || name === 'mode') {
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
    const mode = this.config.mode;
    
    // 获取条件字段元素
    const tempGroup = this.shadowRoot?.getElementById('temperature-entity-group');
    const humidityGroup = this.shadowRoot?.getElementById('humidity-entity-group');
    const cityGroup = this.shadowRoot?.getElementById('city-entity-group');
    
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
    
    if (cityGroup) {
      if (mode === '搜索城市') {
        cityGroup.classList.add('visible');
      } else {
        cityGroup.classList.remove('visible');
        // 如果不是搜索城市模式，清空配置
        delete this.config.city_entity;
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

  _onCityEntityInput(e) {
    // 实时更新配置值，但不触发配置更改事件
    this.config = {
      ...this.config,
      city_entity: e.target.value
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
      CONTAINER_HEIGHT_VW: 21,       // 温度容器总高度（vw）
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
      city_entity: { type: Object },
      entity: { type: Object },
      mode: { type: String },
      forecastMode: { type: String }, // 'daily', 'hourly', 或 'minutely'
      showWarningDetails: { type: Boolean }, // 是否显示预警详情
      showApiInfo: { type: Boolean }, // 是否显示空气质量详情
      showIndicesDetails: { type: Boolean } // 是否显示天气指数详情
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
        padding-bottom: 0.6vw;
        font-family: sans-serif;
        overflow: hidden;
      }

      /*主卡片样式*/
      .weather-card.dark-theme {
      }

      .main-content {
        position: relative;
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
        white-space: nowrap;
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

      .toggle-btn.minutely-mode {
        background: #4CAF50; /* 绿色 */
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
        z-index: 4;
      }

      /*分钟天气温度样式（绿色）*/
      .temp-curve-minutely {
        position: absolute;
        left: 0;
        right: 0;
        height: 3.5vw;
        background: linear-gradient(to bottom, 
          rgba(76, 175, 80) 0%, 
          rgba(56, 142, 60) 100%);
        border-radius: 0.5vw;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 2vw;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 4;
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
        height: 21vw;
        margin-top: 0;
        margin-bottom: 0;
        white-space: nowrap;
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
        display: flex;
        justify-content: center;
        align-items: center;
        height: 2.5vw;
        margin-top: -2vw;
        margin-bottom: 0;
      }
 
      /*雨量填充矩形*/
      .rainfall-fill {
        position: absolute;
        left: 0;
        right: 0;
        background: rgba(80, 177, 200, 0.8);
        border-radius: 1.2vw;
        margin: 0 -1vw;
        bottom: -3vw;
        transition: all 0.3s ease;
        z-index: 1;
      }

      /*9日天气部分 雨量标签*/
      .forecast-rainfall {
        background: rgba(80, 177, 200);
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
        z-index: 2;
      }

      /*9日天气部分 图标*/
      .forecast-icon-container {
        text-align: center;
        position: relative;
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
        gap: 1.5px;
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
        z-index: 3;
      }

      .temp-line-canvas-high {
        top: 7.7vw;
        height: 21vw; 
      }

      .temp-line-canvas-low {
        top: 7.7vw;
        height: 21vw; 
      }

      .temp-curve-high {
        position: absolute;
        left: 0;
        right: 0;
        height: 3.5vw;
        border-radius: 0.5vw;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 2.2vw;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 5;
      }

      .temp-curve-low {
        position: absolute;
        left: 0;
        right: 0;
        height: 3.5vw;
        border-radius: 0.5vw;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 2.2vw;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 4;
      }

      /* 圆点模式样式 */
      .dot-mode .temp-curve-high,
      .dot-mode .temp-curve-low,
      .dot-mode .temp-curve-hourly,
      .dot-mode .temp-curve-minutely {
        width: 1vw;
        height: 1vw;
        border-radius: 50%;
        left: calc(50% - 0.5vw);
        margin-top: -0.65vw;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.2vw;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }

      .dot-mode .temp-curve-high {
        background: rgba(255, 87, 34);
        z-index: 3;
      }

      .dot-mode .temp-curve-low {
        background: rgba(3, 169, 243);
        z-index: 4;
      }

      .dot-mode .temp-curve-hourly {
        background: rgba(156, 39, 176);
      }

      .dot-mode .temp-curve-minutely {
        background: rgba(76, 175, 80);
      }

      /* 圆点上方的温度文字 */
      .dot-mode .temp-text {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        font-size: 2.2vw;
        font-weight: 600;
        white-space: nowrap;
        text-shadow: 0 1px 2px rgba(123, 123, 123, 0.3);
        margin-left: 0.4vw;
      }

      .dot-mode .temp-curve-high .temp-text {
        color: rgba(255, 87, 34);
        top: -3.8vw;
      }

      .dot-mode .temp-curve-low .temp-text {
        color: rgba(3, 169, 243);
        top: 0vw;
      }
      .dot-mode .temp-curve-hourly .temp-text {
        color: rgba(193, 65, 215, 1);
        top: -3.8vw;
      }

      .dot-mode .temp-curve-minutely .temp-text {
        color: rgba(76, 175, 80, 1);
        top: -3.8vw;
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
        height: 8vw;
        line-height: 3.5vw;
        margin-bottom: 0.5vw;
      }

      /*预警文本滚动容器*/
      .warning-text-container1 {
        display: flex;
        width: 97%;
        font-size: 2.2vw;
        line-height: 3vw;
        align-items: center;
        margin: 0.5vw 2vw;
      }

      /*预警文本滚动内容*/
      .warning-text-scroll1 {
        padding-left: 100%;
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

      .update-time { 
        display: flex;
        align-items: flex-end;
        justify-content: start;
        margin-bottom: 1vw;
        margin-top: 2vw;
        margin-left: 1vw;
        font-size: 2vw;
        height: 2vw;
      }

      /*空气质量按钮样式*/
      .toggle-btn-api {
        background: transparent;
        padding: 0;
        border: none;
        font-size: 3vw;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-left: 1vw;
      }

      /*空气质量详情卡片样式*/
      .aqi-details-card {
        position: relative;
        border-radius: 2vw;
        margin-top: 1vw;
        padding: 2vw;
        overflow: hidden;
        backdrop-filter: blur(5px);
        transition: all 0.3s ease;
        animation: slideDown 0.3s ease-out;
      }

      /*天气指数详情卡片样式*/
      .indices-details-card {
        position: relative;
        border-radius: 2vw;
        margin-top: 1vw;
        padding: 2vw;
        overflow: hidden;
        backdrop-filter: blur(5px);
        transition: all 0.3s ease;
        animation: slideDown 0.3s ease-out;
      }
      .input-container {
        display: flex;
        align-items: center;
        padding: 0;
        height: 100%;
        transition: all 0.3s ease;
      } 
      .input-container.on {
        background-color: rgb(255,255,255);
        color: black;
      }
      .input-container.off {
        background-color: rgb(50,50,50);
        color: white;
      }
      .icon {
        margin-right: 0.5rem;
        font-size: 1.2rem;
        margin-left: 0.5rem;
      }
      .input-wrapper {
        flex-grow: 1;
        position: relative;
      }
      input {
        width: 100%;
        border: none;
        background: transparent;
        color: inherit;
        font-size: 1rem;
        padding: 0.5rem 0;
        outline: none;
      }
      .placeholder {
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        color: gray;
        pointer-events: none;
        transition: all 0.2s ease;
        font-size: 0.9rem;
        opacity: 1;
      }
      input:focus + .placeholder,
      input:not(:placeholder-shown) + .placeholder,
      .placeholder.hidden {
        top: 0;
        transform: translateY(0);
        font-size: 0.7rem;
        opacity: 0;
      }

      .input-gap {
        height: 8px;
        minheight: 8px;
      }

    `;
  }

  constructor() {
    super();
    this.mode = '家';
    this.city_entity ='text.set_city';
    this.forecastMode = 'daily'; // 默认显示每日天气
    this.showWarningDetails = false;
    this.showApiInfo = false;
    this.showIndicesDetails = false;
    this.warningTimer = null;
    this.apiTimer = null;
    this.indicesTimer = null;
    this._value = '';
    this._isEditing = false;
    this._pendingSave = false;
    this._forecastToggleState = 0; // 0: daily, 1: hourly, 2: minutely
  }
  
  _evaluateTheme() {
    try {
      if (!this.config || !this.config.theme) return 'on';
      if (typeof this.config.theme === 'function') {
          return this.config.theme();
      }
      if (typeof this.config.theme === 'string') {
          // 处理Home Assistant模板语法 [[[ return theme() ]]]
          if (this.config.theme.includes('[[[') && this.config.theme.includes(']]]')) {
              // 提取模板中的JavaScript代码
              const match = this.config.theme.match(/\[\[\[\s*(.*?)\s*\]\]\]/);
              if (match && match[1]) {
                  const code = match[1].trim();
                  // 如果代码以return开头，直接执行
                  if (code.startsWith('return')) {
                      return (new Function(code))();
                  }
                  // 否则包装在return中执行
                  return (new Function(`return ${code}`))();
              }
          }
          // 处理直接的JavaScript函数字符串
          if (this.config.theme.includes('return') || this.config.theme.includes('=>')) {
              return (new Function(`return ${this.config.theme}`))();
          }
      }
      return this.config.theme;
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
    this.mode = this.config.mode || 'home';
    this.city_entity =  this.hass.states[this.config.city_entity] || 'text.set_city';
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
    const today = new Date();
    
    // 重置时间到午夜，只比较日期
    const resetTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const targetDate = resetTime(date);
    const todayDate = resetTime(today);
    
    // 计算日期差（毫秒）
    const diffTime = targetDate - todayDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 根据日期差返回相应的文本
    if (diffDays === -2) {
      return '前天';
    } else if (diffDays === -1) {
      return '昨天';
    } else if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '明天';
    }  else {
      // 其他日期返回星期几
      return weekdays[date.getDay()];
    }
  }

  _getForecastDays() {
    const columns = this.config?.columns || XiaoshiWeatherPhoneCard.TEMPERATURE_CONSTANTS.FORECAST_COLUMNS;
    if (!this.entity?.attributes?.daily_forecast) return [];
    return this.entity.attributes.daily_forecast.slice(0, columns);
  }

  _getHourlyForecast() {
    if (!this.entity?.attributes?.hourly_forecast) return [];
    return this.entity.attributes.hourly_forecast.slice(0, 24);
  }

  _getMinutelyForecast() {
    if (!this.entity?.attributes?.minutely_forecast) return [];
    return this.entity.attributes.minutely_forecast.slice(0, 24);
  }

  _toggleForecastMode() {
    // 检查是否有分钟天气数据
    const enableMinutelyForecast = this.entity?.attributes?.minutely_forecast && this.entity.attributes.minutely_forecast.length > 0;
    
    if (enableMinutelyForecast) {
      // 有分钟天气数据: daily -> hourly -> minutely -> daily (3种模式循环)
      this._forecastToggleState = (this._forecastToggleState + 1) % 3;
      
      switch(this._forecastToggleState) {
        case 0:
          this.forecastMode = 'daily';
          break;
        case 1:
          this.forecastMode = 'hourly';
          break;
        case 2:
          this.forecastMode = 'minutely';
          break;
      }
    } else {
      // 没有分钟天气数据: daily -> hourly -> daily (2种模式循环)
      this._forecastToggleState = (this._forecastToggleState + 1) % 2;
      
      switch(this._forecastToggleState) {
        case 0:
          this.forecastMode = 'daily';
          break;
        case 1:
          this.forecastMode = 'hourly';
          break;
      }
    }
    this.requestUpdate();
  }

  _toggleWarningDetails() {
    if (this.showWarningDetails ) {
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

  _toggleApiInfo() {
    if (this.showApiInfo ) {
      // 如果当前显示，则隐藏并清除定时器
      this._hideApiDetails();
    } else {
      // 如果当前隐藏，则显示并设置20秒定时器
      this.showApiInfo = true;
      this.requestUpdate();
      
      // 清除之前的定时器
      if (this.apiTimer) {
        clearTimeout(this.apiTimer);
      }
      
      // 设置20秒后自动隐藏
      this.apiTimer = setTimeout(() => {
        this._hideApiDetails();
      }, 20000);
    }
  }

  _hideApiDetails() {
    this.showApiInfo = false;
    if (this.apiTimer) {
      clearTimeout(this.apiTimer);
      this.apiTimer = null;
    }
    this.requestUpdate();
  }

  _toggleIndicesDetails() {
    if (this.showIndicesDetails ) {
      // 如果当前显示，则隐藏并清除定时器
      this._hideIndicesDetails();
    } else {
      // 如果当前隐藏，则显示并设置20秒定时器
      this.showIndicesDetails = true;
      this.requestUpdate();
      
      // 清除之前的定时器
      if (this.indicesTimer) {
        clearTimeout(this.indicesTimer);
      }
      
      // 设置20秒后自动隐藏
      this.indicesTimer = setTimeout(() => {
        this._hideIndicesDetails();
      }, 20000);
    }
  }

  _hideIndicesDetails() {
    this.showIndicesDetails = false;
    if (this.indicesTimer) {
      clearTimeout(this.indicesTimer);
      this.indicesTimer = null;
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

  _formatMinutelyTime(datetime) {
    const date = new Date(datetime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  _formatMinutelyDate(datetime) {
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

  _formatSunTime(datetime) {
    if (!datetime) return '';
    
    try {
      const date = new Date(datetime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.warn('时间格式化错误:', error);
      return datetime;
    }
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
    } else if (this.forecastMode === 'hourly') {
      const hourlyForecast = this._getHourlyForecast();
      if (hourlyForecast.length === 0) {
        return { minTemp: 0, maxTemp: 0, range: 0 };
      }
      temperatures = hourlyForecast.map(hour => parseFloat(hour.native_temperature) || 0);
    } else if (this.forecastMode === 'minutely') {
      const minutelyForecast = this._getMinutelyForecast();
      if (minutelyForecast.length === 0) {
        return { minTemp: 0, maxTemp: 0, range: 0 };
      }
      temperatures = minutelyForecast.map(minute => parseFloat(minute.native_temperature) || 0);
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
      // 小时天气和分钟天气只需要一个温度，简化计算
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
        boundsList = forecastData.map(item => {
          const temp = parseFloat(item.native_temperature) || 0;
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
      // 小时天气和分钟天气模式
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
      canvas.width = rect.width *3;
      canvas.height = rect.height *3;
      
      if (points.length < 2) {
        return;
      }
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 设置线条样式
      ctx.strokeStyle = color;
      ctx.lineWidth = 6; // 固定线宽
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
      const tension = 0.2; // 减小张力系数，避免过度弯曲
      
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

  _getWarningColorForLevel(level) {
    if (level == "红色") return "rgb(255,50,50)";
    if (level == "橙色") return "rgb(255,100,0)";
    if (level == "黄色") return "rgb(255,200,0)";
    if (level == "蓝色") return "rgb(50,150,200)";
    
    return "#FFA726"; // 默认颜色
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

   _getRelativeTime(updateTime) {
    if (!updateTime || updateTime === '未知时间') {
      return '未知时间';
    }
    
    try {
      // 解析更新时间，支持多种格式
      let updateDate;
      if (updateTime.includes(' ')) {
        // 格式: "2025-12-18 20:28"
        const [datePart, timePart] = updateTime.split(' ');
        updateDate = new Date(`${datePart}T${timePart}:00`);
      } else if (updateTime.includes('T')) {
        // 格式: "2025-12-18T20:28:00"
        updateDate = new Date(updateTime);
      } else {
        return updateTime; // 无法解析，返回原始值
      }
      
      const now = new Date();
      const diffMs = now - updateDate;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      let relativeTime = '';
      if (diffMinutes < 1) {
        relativeTime = '刚刚';
      } else if (diffMinutes < 60) {
        relativeTime = `${diffMinutes}分钟前`;
      } else if (diffHours < 24) {
        relativeTime = `${diffHours}小时前`;
      } else {
        relativeTime = `${diffDays}天前`;
      }
      
      return `数据更新时间：${updateTime} ( ${relativeTime} )`;
    } catch (error) {
      console.warn('时间解析错误:', error);
      return `数据更新时间：${updateTime}`;
    }
  }

   _getAqiCategoryHtml() {
    const category = this.entity.attributes?.aqi?.category;
    if (!category) return '';
    
    let color = '';
    switch(category) {
      case '优':
        color = '#4CAF50'; // 绿色
        break;
      case '良':
        color = '#FFC107'; // 黄色
        break;
      case '轻度污染':
        color = '#FF9800'; // 橙色
        break;
      case '中度污染':
      case '重度污染':
      case '严重污染':
        color = '#F44336'; // 红色
        break;
      default:
        color = '#9E9E9E'; // 灰色（其他未知类别）
    }
    
    return html`
            <button class="toggle-btn-api" style = "color: ${color};"} @click="${() => this._toggleApiInfo()}">
              ${category}
            </button>
            `
  } 

  render() {
    if (this.mode !== "搜索城市" && (!this.entity || this.entity.state === '无搜索城市' || this.entity.state === 'unavailable')) {
      return html`<div class="unavailable"> </div>`;
    }

    else if (this.mode !== "搜索城市" && (this.entity || this.entity.state !== 'unavailable' || this.entity.state !== '无搜索城市')) {
      return this._rendermain();
    }

    else if (this.mode === "搜索城市" && (!this.entity || this.entity.state === 'unavailable' || this.entity.state === '无搜索城市')) {
      return  html`${this._renderInput()}`;
    }

    else if (this.mode === "搜索城市" && (this.entity || this.entity.state !== 'unavailable' || this.entity.state !== '无搜索城市')) {
      return html`${this._rendermain()} <div class="input-gap"> </div> ${this._renderInput()}`;
    }
  }

  _rendermain(){
    // 获取自定义或默认的温度和湿度
    const customTemp = this._getCustomTemperature();
    const customHumidity = this._getCustomHumidity();
    const temperature = customTemp || this._formatTemperature(this.entity.attributes?.temperature);
    const humidity = customHumidity || this._formatTemperature(this.entity.attributes?.humidity);
    const condition = this.entity.attributes?.condition_cn || '未知';
    const windSpeed = this.entity.attributes?.wind_speed || 0;
    const pressure = this.entity.attributes?.pressure || 0;
    const visibility = this.entity.attributes?.visibility || 0;
    const city = this.entity.attributes?.city || '未知城市';
    const update_time = this.entity.attributes?.update_time || '未知时间';
    const warning = this.entity.attributes?.warning || [];
    const theme = this._evaluateTheme();
    const hasWarning = warning && Array.isArray(warning) && warning.length > 0;
    const hasapi = this.entity.attributes?.aqi && Object.keys(this.entity.attributes.aqi).length > 0;
    const hassairindices = this.entity.attributes?.air_indices && Object.keys(this.entity.attributes.air_indices).length > 0;
    const warningColor = this._getWarningColor(warning);
    const enableHourlyForecast = this.entity.attributes?.hourly_forecast && this.entity.attributes?.hourly_forecast.length > 0;
    const enableMinutelyForecast = this.entity.attributes?.minutely_forecast && this.entity.attributes?.minutely_forecast.length > 0;
    const sunRise = this.entity.attributes?.sun.sunrise || '无';
    const sunSet = this.entity.attributes?.sun.sunset || '无';

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
                <div class="weather-info">
                    <span style="color: ${secondaryColor};">${condition}  
                      ${windSpeed}<span style="font-size: 0.6em;">km/h </span>
                      ${pressure}<span style="font-size: 0.6em;">hPa </span>
                      ${visibility}<span style="font-size: 0.6em;">km </span>
                    </span>
                    ${this._getAqiCategoryHtml()}
                </div>
              </div>
            </div>
            <!-- 城市信息 - 放在头部右侧 -->
            <div class="weather-right">
              <div class="city-info">${this._getCityIcon()}${city}</div>

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <!-- 天气指数按钮 -->
                ${this.entity.attributes?.air_indices && this.entity.attributes.air_indices.length > 0 ? html`
                  <div class="forecast-toggle-button">
                    <button class="toggle-btn" style="margin-right: 1vw; background: #2E7D32;" @click="${() => this._toggleIndicesDetails()}">
                      天气指数
                    </button>
                  </div>
                ` : ''}

                <!-- 切换按钮 -->
                ${enableHourlyForecast ? html`
                  <div class="forecast-toggle-button">
                    <button class="toggle-btn ${this.forecastMode === 'daily' ? 'daily-mode' : this.forecastMode === 'hourly' ? 'hourly-mode' : 'minutely-mode'}" @click="${() => this._toggleForecastMode()}">
                      ${this.forecastMode === 'daily' ? '每日天气' : this.forecastMode === 'hourly' ? '小时天气' : '分钟天气'}
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- 预报内容 -->
          ${this._renderDailyForecast()}

        </div>
        
        <!-- 预警详情 -->
        ${this.showWarningDetails && hasWarning ? this._renderWarningDetails() : ''}

        <!-- 空气质量详情 -->
        ${this.showApiInfo && hasapi ? this._renderAqiDetails() : ''}

        <!-- 天气指数详情 -->    
        ${this.showIndicesDetails && hassairindices ? this._renderIndicesDetails() : ''}

        <div class="update-time" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            ${this._getRelativeTime(update_time)}  
          </div>
          
          <!-- 日出日落信息 - 放在右侧 -->
          ${sunRise && sunSet ? html`
            <div class="sunrise-sunset-container" style="display: flex; align-items: center; gap: 1vw;">
              <div style="display: flex; align-items: center; font-size: 2vw;">
                <ha-icon icon="mdi:weather-sunset-up" style="color: #FFA726; margin-right: 0.6vw; --mdc-icon-size: 2.3vw;"></ha-icon>
                <span>${sunRise} </span>
              </div>
              <div style="display: flex; align-items: center; font-size: 2vw;">
                <ha-icon icon="mdi:weather-sunset-down" style="color: #FF7043; margin-right: 0.6vw; --mdc-icon-size: 2.3vw;"></ha-icon>
                <span style="margin-right: 1vw;">${sunSet}  </span>
              </div>
            </div>
          ` : ''}
        </div>  
      </div>
    `;
  }

  _renderDailyForecast() {
    if (this.forecastMode === 'hourly') {
      return this._renderHourlyForecast();
    }
    if (this.forecastMode === 'minutely') {
      return this._renderMinutelyForecast();
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
        this._drawTemperatureCurve(highCanvasId, highTempData.points, 'rgba(255, 87, 34)');
        this._drawTemperatureCurve(lowCanvasId, lowTempData.points, 'rgba(33, 150, 243)');
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
          
          // 如果是昨天，设置透明度 
          const isYesterday = weekday !== '昨天' && weekday !== '前天';
          const opacity = isYesterday ? 1 : 0.5;
          const theme = this._evaluateTheme();

          const hightbackground = isYesterday ? 
                'linear-gradient(to bottom,rgba(255, 87, 34) 0%,rgba(255, 152, 0) 100%)':
                theme === 'on' ? 
                'linear-gradient(to bottom,rgb(250, 149, 117) 0%,rgb(250, 188, 97) 100%)':
                'linear-gradient(to bottom,rgb(181, 81, 49) 0%,rgb(181, 120, 28) 100%)';
          const lowbackground = isYesterday ?  
                'linear-gradient(to bottom,rgba(3, 169, 243) 0%,rgba(33, 150, 243) 100%)':
                theme === 'on' ? 
                'linear-gradient(to bottom,rgb(99, 198, 243) 0%,rgb(117, 187, 243)100%)':
                'linear-gradient(to bottom,rgb(30, 130, 174) 0%,rgb(48, 118, 174) 100%)';
                
          const hightcolor = isYesterday ? 'rgba(255, 87, 34)': theme === 'on' ? 'rgb(250, 149, 117)' : 'rgb(181, 81, 49)';
          const lowcolor = isYesterday ? 'rgba(3, 169, 243)': theme === 'on' ? 'rgb(99, 198, 243)' : 'rgb(30, 130, 174)';
 
          // 计算温度矩形的动态边界和高度
          const tempBounds = this._calculateTemperatureBounds(day, extremes);
           
          // 获取雨量信息
          const rainfall = parseFloat(day.native_precipitation) || 0;
          
          // 计算雨量矩形高度和位置
          
          const {CONTAINER_HEIGHT_VW } = XiaoshiWeatherPhoneCard.TEMPERATURE_CONSTANTS;
          const RAINFALL_MAX = 25; // 最大雨量25mm
          const rainfallHeight = Math.min((rainfall / RAINFALL_MAX) * CONTAINER_HEIGHT_VW+4, CONTAINER_HEIGHT_VW+4); // 最大高度21.6vw（到日期下面）

          return html`
            <div class="forecast-day" style="background: ${backgroundColor};">
              <!-- 星期（周X） -->
              <div class="forecast-weekday" style="opacity: ${opacity};">${weekday}</div>
              
              <!-- 日期（mm月dd日） -->
              <div class="forecast-date" style="color: ${secondaryColor}; opacity: ${opacity};">${dateStr}</div>
              
              <!-- 高温（橙色）和 低温（蓝色） -->
              <div class="forecast-temp-container">
                ${this.config.visual_style === 'dot' ? html`
                  <!-- 圆点模式 -->
                  <div class="temp-curve-high" style="top: ${tempBounds.highTop + 1.75}vw">
                    <div class="temp-text" style="color: ${hightcolor};">${highTemp}°</div>
                  </div>
                  <div class="temp-curve-low" style="top: ${tempBounds.lowTop + 1.75}vw">
                    <div class="temp-text" style="color: ${lowcolor};">${lowTemp}°</div>
                  </div>
                ` : html`
                  <!-- 按钮模式 -->
                  <div class="temp-curve-high" style="background: ${hightbackground}; top: ${tempBounds.highTop}vw">
                    ${highTemp}°
                  </div>
                  <div class="temp-curve-low" style="background: ${lowbackground}; top: ${tempBounds.lowTop}vw">
                    ${lowTemp}°
                  </div>
                `}
                
                <!-- 雨量填充矩形 -->
                ${rainfall > 0 ? html`
                  <div class="rainfall-fill" style="height: ${rainfallHeight}vw; opacity: ${0.3 + rainfall / RAINFALL_MAX}"></div>
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
        this._drawTemperatureCurve(canvasId, tempData.points, 'rgba(156, 39, 176)');
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
            const RAINFALL_MAX = 5; // 最大雨量5mm
            const rainfallHeight = Math.min((rainfall / RAINFALL_MAX) * CONTAINER_HEIGHT_VW+4, CONTAINER_HEIGHT_VW+4); // 最大高度21.6vw（到日期下面）


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
                      ${temp}°
                    </div>
                  `}
                  
                  <!-- 雨量填充矩形 -->
                  ${rainfall > 0 ? html`
                    <div class="rainfall-fill" style="height: ${rainfallHeight}vw; opacity: ${0.3 + rainfall / RAINFALL_MAX}"></div>
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

  _renderMinutelyForecast() {
    const minutelyForecast = this._getMinutelyForecast();
    const extremes = this._getTemperatureExtremes();
    const theme = this._evaluateTheme();
    const secondaryColor = theme === 'on' ? 'rgb(60, 140, 190)' : 'rgb(110, 190, 240)';
    const backgroundColor = theme === 'on' ? 'rgba(120, 120, 120, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    // 生成温度曲线坐标（分钟天气只有一个温度）
    const tempData = this._generateTemperatureLine(minutelyForecast, extremes, true);
    
    // 使用组件实例ID + Canvas ID，避免多实例冲突
    const instanceId = this._getInstanceId();
    const canvasId = `minutely-temp-canvas-${instanceId}`;
    
    // 在DOM更新完成后绘制曲线（绿色）
    this.updateComplete.then(() => {
      setTimeout(() => {
        this._drawTemperatureCurve(canvasId, tempData.points, 'rgba(76, 175, 80)');
      }, 50);
    });
    
    // 计算实际列数（分钟天气可能有更多数据）
    const columns = minutelyForecast.length;
    const columnWidth = 9.6;
     
    return html`
      <div class="hourly-forecast-scroll-container">
        <div class="hourly-forecast-container" style="grid-template-columns: repeat(${columns}, ${columnWidth}vw);">
          <!-- 分钟温度连接线 Canvas -->
          <canvas class="temp-line-canvas temp-line-canvas-high" id="minutely-temp-canvas-${this._getInstanceId()}"></canvas>
          
          ${minutelyForecast.map((minute, index) => {
            const timeStr = this._formatMinutelyTime(minute.datetime);
            const dateStr = this._formatMinutelyDate(minute.datetime);
            const temp = this._formatTemperature(minute.native_temperature);
            
            // 获取雨量信息
            const rainfall = parseFloat(minute.native_precipitation) || 0;
            
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
              const tempValue = parseFloat(minute.native_temperature) || 0;
              const topPosition = (maxTemp - tempValue) * unitPosition;
              finalTopPosition = Math.max(0, Math.min(topPosition, CONTAINER_HEIGHT_VW - BUTTON_HEIGHT_VW));
            }
            
            // 计算雨量矩形高度和位置
            const RAINFALL_MAX = 1; // 最大雨量1mm
            const rainfallHeight = Math.min((rainfall / RAINFALL_MAX) * CONTAINER_HEIGHT_VW+4, CONTAINER_HEIGHT_VW+4); // 最大高度21.6vw（到日期下面）


            return html`
              <div class="forecast-day" style="background: ${backgroundColor};">
                <!-- 时间（hh:mm） -->
                <div class="forecast-weekday">${timeStr}</div>
                
                <!-- 日期（mm月dd日） -->
                <div class="forecast-date" style="color: ${secondaryColor};">${dateStr}</div>
                
                <!-- 温度（绿色） -->
                <div class="forecast-temp-container">
                  ${this.config.visual_style === 'dot' ? html`
                    <!-- 圆点模式 -->
                    <div class="temp-curve-minutely" style="top: ${finalTopPosition + 1.75}vw">
                      <div class="temp-text">${temp}°</div>
                    </div>
                  ` : html`
                    <!-- 按钮模式 -->
                    <div class="temp-curve-minutely" style="top: ${finalTopPosition}vw">
                      ${temp}°
                    </div>
                  `}
                  
                  <!-- 雨量填充矩形 -->
                  ${rainfall > 0 ? html`
                    <div class="rainfall-fill" style="height: ${rainfallHeight}vw; opacity: ${0.3 + rainfall / RAINFALL_MAX}"></div>
                  ` : ''}
                </div>
                <div class="forecast-temp-null"></div>
              </div>
            `;
          })}
          
          <!-- 雨量标签行 -->
          ${minutelyForecast.map(minute => {
            const rainfall = parseFloat(minute.native_precipitation) || 0;
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
          ${this._renderMinutelyWeatherIcons(minutelyForecast)}
          
          <!-- 风向风级行 -->
          ${this._renderMinutelyWindInfo(minutelyForecast)}
        </div>
      </div>
    `;
  }

  _renderWeatherIcons(forecastDays) {
    return html`
      ${forecastDays.map(day => {
        // 如果是昨天，设置透明度 
        const date = new Date(day.datetime);
        const weekday = this._getWeekday(date);
        const isYesterday = weekday !== '昨天' && weekday !== '前天';
        const opacity = isYesterday ? 1 : 0.5;

        return html`
          <div class="forecast-icon-container" style="opacity: ${opacity}">
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

  _renderMinutelyWeatherIcons(minutelyForecast) {
    return html`
      ${minutelyForecast.map(minute => {
        return html`
          <div class="forecast-icon-container">
            <div class="forecast-icon">
              <img src="${this._getWeatherIcon(minute.text)}" alt="${minute.text}">
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
        
        // 如果是昨天，设置透明度 
        const date = new Date(day.datetime);
        const weekday = this._getWeekday(date);
        const isYesterday = weekday !== '昨天' && weekday !== '前天';
        const opacity = isYesterday ? 1 : 0.5;

        // 如果风速是 "4-5" 格式，取最大值
        if (typeof windSpeedRaw === 'string' && windSpeedRaw.includes('-')) {
          const speeds = windSpeedRaw.split('-').map(s => parseFloat(s.trim()));
          if (speeds.length === 2 && !isNaN(speeds[0]) && !isNaN(speeds[1])) {
            windSpeed = Math.max(speeds[0], speeds[1]);
          }
        }
        
        const windDirection = day.wind_bearing || 0;
        
        return html`
          <div class="forecast-wind-container" style="opacity: ${opacity}">
            <div class="forecast-wind" style="color: ${secondaryColor};">
              <span class="wind-direction" >${this._getWindDirectionIcon(windDirection)}</span>
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
      { range: [337.5, 360], icon: '↑', name: '北' },    // 337.5-360度
      { range: [0, 22.5], icon: '↑', name: '北' },        // 0-22.5度
      { range: [22.5, 67.5], icon: '↗', name: '东北' },    // 22.5-67.5度
      { range: [67.5, 112.5], icon: '→', name: '东' },     // 67.5-112.5度
      { range: [112.5, 157.5], icon: '↘', name: '东南' },   // 112.5-157.5度
      { range: [157.5, 202.5], icon: '↓', name: '南' },     // 157.5-202.5度
      { range: [202.5, 247.5], icon: '↙', name: '西南' },   // 202.5-247.5度
      { range: [247.5, 292.5], icon: '←', name: '西' },     // 247.5-292.5度
      { range: [292.5, 337.5], icon: '↖', name: '西北' }    // 292.5-337.5度
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

    return direction ? direction.icon : '↓';
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

  _renderMinutelyWindInfo(minutelyForecast) {
    const theme = this._evaluateTheme();
    const secondaryColor = theme === 'on' ? 'rgb(10, 90, 140)' : 'rgb(110, 190, 240)';
    return html`
      ${minutelyForecast.map(minute => {
        const windSpeedRaw = minute.windscaleday || 0;
        let windSpeed = windSpeedRaw;
        
        // 如果风速是 "4-5" 格式，取最大值
        if (typeof windSpeedRaw === 'string' && windSpeedRaw.includes('-')) {
          const speeds = windSpeedRaw.split('-').map(s => parseFloat(s.trim()));
          if (speeds.length === 2 && !isNaN(speeds[0]) && !isNaN(speeds[1])) {
            windSpeed = Math.max(speeds[0], speeds[1]);
          }
        }
        
        const windDirection = minute.wind_bearing || 0;
        
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

  _renderWarningDetails() {
    if (!this.showWarningDetails || !this.entity?.attributes?.warning) {
      return '';
    }

    const warning = this.entity.attributes.warning;
    const theme = this._evaluateTheme();
    const textcolor = theme === 'on' ? 'rgba(0, 0, 0)' : 'rgba(255, 255, 255)';
    const backgroundColor = theme === 'on' ? 'rgba(120, 120, 120, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    return html`
      <div class="warning-details-card" style=" background-color: ${backgroundColor};">
        ${warning.map((warningItem, index) => {
          const typeName = warningItem.typeName ?? "";
          const level = warningItem.level ?? "";
          const warningColor = this._getWarningColorForLevel(level);
          const sender = warningItem.sender ?? "";
          const startTime = warningItem.startTime ? warningItem.startTime.slice(0, 10) : "";
          const endTime = warningItem.endTime ? warningItem.endTime.slice(0, 10) : "";
          const text = warningItem.text ?? "";
          const scrollDuration = Math.max(5, text.length * 0.3);

          return html`
            <div style="margin-bottom: 1vw;">
              <!-- 第一行：预警标题 -->
              <div class="warning-title-line" style="color: ${warningColor};">
                ${sender}: 【${typeName}】${level}预警<br>
                预警时间：${startTime}至${endTime}
              </div>
              
              <!-- 第二行：预警文本滚动 -->
              <div class="warning-text-container1" style="color: ${textcolor}; ">
               
                  <span>${text}</span>
               
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  _renderAqiDetails() {
    if (!this.showApiInfo || !this.entity?.attributes?.aqi) {
      return '';
    }

    const aqi = this.entity.attributes.aqi;
    const theme = this._evaluateTheme();
    const textcolor = theme === 'on' ? 'rgba(0, 0, 0)' : 'rgba(255, 255, 255)';
    const backgroundColor = theme === 'on' ? 'rgba(50,50,50, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    // 获取AQI数值和等级
    const aqiValue = aqi.aqi || aqi.value || 0;
    const category = aqi.category || '未知';
    const level = aqi.level || '未知';
    const pm25 = aqi.pm2p5 || 0;
    const pm10 = aqi.pm10 || 0;
    const so2 = aqi.so2 || 0;
    const no2 = aqi.no2 || 0;
    const co = aqi.co || 0;
    const o3 = aqi.o3 || 0;
    
    // 根据等级获取颜色
    const getAqiColor = (category) => {
      switch(category) {
        case '优': return '#4CAF50'; // 绿色
        case '良': return '#FFC107'; // 黄色
        case '轻度污染': return '#FF9800'; // 橙色
        case '中度污染': return '#FF5722'; // 深橙色
        case '重度污染': return '#F44336'; // 红色
        case '严重污染': return '#9C27B0'; // 紫色
        default: return '#9E9E9E'; // 灰色
      }
    };
     
    const aqiColor = getAqiColor(category);

    return html`
      <div class="aqi-details-card" style="background-color: ${backgroundColor}; border-radius: 2vw; padding: 2vw; margin-top: 1.5vw;">
        
        <!-- AQI总览 -->
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 0.5vw; padding: 0.5vw;  border-radius: 1.5vw;">
          <div style="text-align: center;">
            <div style="font-size: 4vw; font-weight: bold; color: ${aqiColor};">${aqiValue}</div>
            <div style="font-size: 2.5vw; color: ${aqiColor}; margin: 0vw;">${category} ( ${level}级 )</div>
          </div>
        </div>
        
        <!-- 污染物详情 -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1vw;">
          <div style="text-align: center; padding: 0.5vw;border-radius: 1vw;">
            <div style="font-size: 2.2vw; font-weight: bold; color: ${textcolor};">PM2.5</div>
            <div style="font-size: 2vw; color: ${textcolor};">${pm25} μg/m³</div>
          </div>
          
          <div style="text-align: center; padding: 0.5vw; border-radius: 1vw;">
            <div style="font-size: 2.2vw; font-weight: bold; color: ${textcolor};">PM10</div>
            <div style="font-size: 2vw; color: ${textcolor};">${pm10} μg/m³</div>
          </div>
          
          <div style="text-align: center; padding: 0.5vw; border-radius: 1vw;">
            <div style="font-size: 2.2vw; font-weight: bold; color: ${textcolor};">SO₂</div>
            <div style="font-size: 2vw; color: ${textcolor};">${so2} μg/m³</div>
          </div>
          
          <div style="text-align: center; padding: 0.5vw; border-radius: 1vw;">
            <div style="font-size: 2.2vw; font-weight: bold; color: ${textcolor};">NO₂</div>
            <div style="font-size: 2vw; color: ${textcolor};">${no2} μg/m³</div>
          </div>
          
          <div style="text-align: center; padding: 0.5vw; border-radius: 1vw;">
            <div style="font-size: 2.2vw; font-weight: bold; color: ${textcolor};">CO</div>
            <div style="font-size: 2vw; color: ${textcolor};">${co} mg/m³</div>
          </div>
          
          <div style="text-align: center; padding: 0.5vw; border-radius: 1vw;">
            <div style="font-size: 2.2vw; font-weight: bold; color: ${textcolor};">O₃</div>
            <div style="font-size: 2vw; color: ${textcolor};">${o3} μg/m³</div>
          </div>
        </div>
      </div>
    `;
  }

  _renderIndicesDetails() {
    if (!this.showIndicesDetails || !this.entity?.attributes?.air_indices) {
      return '';
    }

    const indices = this.entity.attributes.air_indices;
    const theme = this._evaluateTheme();
    const textcolor = theme === 'on' ? 'rgba(0, 0, 0)' : 'rgba(255, 255, 255)';
    const textcolor2 = theme === 'on' ? 'rgba(23, 140, 5, 1)' : 'rgba(10, 231, 47, 1)';
    const backgroundColor = theme === 'on' ? 'rgba(120, 120, 120, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    const backgroundColor2 = theme === 'on' ? 'rgba(255, 255, 255)' : 'rgba(50, 50, 50)';

    return html`
      <div class="indices-details-card" style="background-color: ${backgroundColor}; border-radius: 2vw; padding: 2vw; margin-top: 1.5vw;">
        
        <!-- 指数列表 -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1vw;">
          ${indices.map(index => html`
            <div style="padding: 1vw; background: ${backgroundColor2}; border-radius: 1vw;">
              <div> 
                <span style="font-size: 2vw; font-weight: bold; color: ${textcolor2}; margin-bottom: 0.2vw;">${index.name} </span>
                <span style="font-size: 1.8vw; color: ${textcolor}; margin-bottom: 0.2vw;"> 等级:${index.level}  ${index.category}</span>
              </div>

              <div style="font-size: 1.5vw; color: ${textcolor}; opacity: 0.8; line-height: 1.4;">${index.text}</div>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  _renderInput(){
    if (!this.config || !this.hass ) return html``;
    const cityEntity = this.city_entity || 'text.set_city';
    const currentValue = this.hass.states[cityEntity].state;
    if (!this._isEditing && this._value !== currentValue) {
      this._value = currentValue;
    }
    const theme = this._evaluateTheme();
    const themeClass = theme === 'off' ? 'off' : 'on';
    const showPlaceholder = !this._value && !this._isEditing;

    return html`
      <div class="input-container ${themeClass}" \n
           style="width: ${this.config.width}; height: 12vw ;border-radius: 3vw;">
        <div class="icon">
          <ha-icon icon="mdi:magnify"></ha-icon>
        </div>
        <div class="input-wrapper">
          <input
            type="text"\n
            .value=${this._value}\n
            @input=${this._handleInput}\n
            @keydown=${this._handleKeyDown}\n
            @focus=${() => this._isEditing = true}\n
            @blur=${this._handleBlur}\n
            placeholder=" "
          />
          <div class="placeholder ${!showPlaceholder ? 'hidden' : ''}">等待设置搜索的城市...</div>
        </div>
      </div>
    `;
  }

  _handleInput(e) {
    this._value = e.target.value;
    this._isEditing = true;
  }

  _handleKeyDown(e) {
    if (e.key === 'Enter' && this.city_entity) {
      this._pendingSave = true;
      this._setEntityValue();
      this._isEditing = false;
      e.target.blur();
    }
  }

  _handleBlur() {
    this._isEditing = false;
    if (!this._pendingSave && this.city_entity) {
      this._setEntityValue();
    }
    this._pendingSave = false;
  }

  _setEntityValue() {
    if (!this.city_entity) return; 
    
    this.hass.callService('text', 'set_value', {
      entity_id: this.city_entity,
      value: this._value,
    });

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

class XiaoshiWeatherPadEditor extends LitElement {
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
            .value=${this.config.columns !== undefined ? this.config.columns : 5}
            name="columns"
          >
            <option value="5">5列</option>
            <option value="6">6列</option>
            <option value="7">7列</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>卡片宽度 (px)</label>
          <input 
            type="number"
            min="200"
            max="800"
            step="10"
            @change=${this._entityChanged}
            .value=${this.config.width !== undefined ? this.config.width : 260}
            name="width"
            placeholder="260"
          />
        </div>
        

        
        <div class="form-group">
          <label>是否实体替换实时温湿度</label>
          <select 
            @change=${this._entityChanged}
            .value=${this.config.use_custom_entities !== undefined ? this.config.use_custom_entities : 'false'}
            name="use_custom_entities"
          >
            <option value="false">否（使用天气实体的温湿度）</option>
            <option value="true">是（使用自定义实体）</option>
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
        
        <div class="form-group conditional-field ${this.config.mode === '搜索城市' ? 'visible' : ''}" id="city-entity-group">
          <label>城市文本实体</label>
          <div class="entity-search-container">
            <input 
              type="text" 
              .value=${this.config.city_entity || 'text.set_city'}
              @input=${this._onCityEntityInput}
              @change=${this._entityChanged}
              name="city_entity"
              placeholder="搜索城市文本实体（如 text.set_city）"
              list="city-entities"
            />
            <datalist id="city-entities">
              ${Object.keys(this.hass.states)
                .filter(entityId => 
                  entityId.startsWith('text.') ||
                  entityId.toLowerCase().includes('city') ||
                  entityId.toLowerCase().includes('城市')
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
    if (!value && name !== 'theme' && name !== 'columns' && name !== 'width' && name !== 'use_custom_entities' && name !== 'temperature_entity' && name !== 'humidity_entity' && name !== 'visual_style') return;
    
    let processedValue = value;
    if (name === 'columns' || name === 'width') {
      processedValue = parseInt(value);
      // 确保宽度在有效范围内
      if (name === 'width' && (processedValue < 200 || processedValue > 800 || isNaN(processedValue))) {
        processedValue = 260; // 默认值
      }
    } else if (name === 'use_custom_entities') {
      processedValue = value === 'true';
    }
    
    this.config = {
      ...this.config,
      [name]: processedValue
    };
    
    // 处理条件字段的显示/隐藏
    if (name === 'use_custom_entities' || name === 'mode') {
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
    const mode = this.config.mode;
    
    // 获取条件字段元素
    const tempGroup = this.shadowRoot?.getElementById('temperature-entity-group');
    const humidityGroup = this.shadowRoot?.getElementById('humidity-entity-group');
    const cityGroup = this.shadowRoot?.getElementById('city-entity-group');
    
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
    
    if (cityGroup) {
      if (mode === '搜索城市') {
        cityGroup.classList.add('visible');
      } else {
        cityGroup.classList.remove('visible');
        // 如果不是搜索城市模式，清空配置
        delete this.config.city_entity;
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

  _onCityEntityInput(e) {
    // 实时更新配置值，但不触发配置更改事件
    this.config = {
      ...this.config,
      city_entity: e.target.value
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
customElements.define('xiaoshi-weather-pad-editor', XiaoshiWeatherPadEditor);

class XiaoshiWeatherPadCard extends LitElement {
  // 温度计算常量
  static get TEMPERATURE_CONSTANTS() {
    return {
      BUTTON_HEIGHT_PX: 17,        // 温度矩形高度（px）
      CONTAINER_HEIGHT_PX: 125,      // 温度容器总高度（px）
      FORECAST_COLUMNS: 5,          // 预报列数
    };
  }

  // 图标路径常量 - 方便调试修改
  static get ICON_PATH() {
    return '/qweather/icon';
  } 

  static getConfigElement() {
    return document.createElement("xiaoshi-weather-pad-editor");
  }

  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      entity: { type: Object },
      mode: { type: String }
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
        border-radius: 15px;
        padding: 8px;
        font-family: sans-serif;
        overflow: hidden;
      }

      /*主卡片样式*/
      .weather-card.dark-theme {
      }

      .main-content {
        position: relative;
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
        width: 45px;
        min-width: 45px;
        max-width: 45px;
        height: 50px;
        margin-right: 7px;
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
        height: 30px;
        font-size: 23px;
        font-weight: bold;
        margin-top: 0;
        margin-bottom: 0;
        white-space: nowrap;
      }

      /*天气头部 天气信息*/
      .weather-info {
        height: 12px;
        font-size: 12px;
        margin-top: 0px;
        white-space: nowrap;
      }
        
      /*天气行*/
      .weather-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 0px;
      }

      /*天气右侧对齐*/
      .weather-right-align {
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }

      /*天气右侧容器*/
      .weather-right {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        flex: 1;
        width: 100%;
      }

      /*天气温度样式*/
      .weather-temperature {
        height: 30px;
        font-size: 23px;
        font-weight: bold;
        margin-top: 0;
        margin-bottom: 0;
      }

      /*天气信息样式*/
      .weather-info {
        height: 15px;
        font-size: 12px;
        margin-top: 0;
        margin-bottom: 0;
        white-space: nowrap;
      }

      .forecast-toggle-button {
        margin-top: auto;
      }

      .toggle-btn {
        padding: 2px 10px;
        border: none;
        border-radius: 6px;
        font-size: 9px;
        cursor: pointer;
        transition: all 0.3s ease;
        color: white;
        font-weight: bold;
        white-space: nowrap;
      }

      .toggle-btn-aqi {
        background: transparent;
        padding:0;
        border: none;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: bold;
        white-space: nowrap;
        margin-left: 5px;
      }

      .toggle-btn.daily-mode {
        background: #03A9F4; /* 蓝色 */
      }

      .toggle-btn:hover {
        transform: scale(1.1);
      }

      /*9日天气部分*/
      .forecast-container {
        display: grid;
        gap: 4px;
        margin-top: 4px;
        position: relative;
      }

      /*9日天气部分*/
      .forecast-day {
        grid-row: 1;
        text-align: center;
        position: relative;
        border-radius: 8px;
        padding: 5px;
        position: relative;
      }

      /*9日天气部分 星期*/
      .forecast-weekday {
        font-size: 11px;
        height: 14px;
        margin-top: -5px;
        margin-bottom: 1px;
        font-weight: 500;
        white-space: nowrap;
      }
      
      /*9日天气部分 日期*/
      .forecast-date {
        font-size: 8px;
        margin-bottom: 15px;
        margin-left: 0px;
        margin-right: 0px;
        height: 10px;
        white-space: nowrap;
      }

      /*9日天气部分 温度区域*/
      .forecast-temp-container {
        position: relative;
        height: 125px;
        margin-top: 0;
        margin-bottom: 0;
      }

      /*9日天气部分 温度区域*/
      .forecast-temp-null {
        position: relative;
        height: 10px;
      }

      /*9日天气部分 雨量容器*/
      .forecast-rainfall-container {
        text-align: center;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 12.5px;
        margin-top: -10px;
        margin-bottom: 0;
      }

      /*9日天气部分 雨量标签*/
      .forecast-rainfall {
        background: rgba(80, 177, 200);
        color: white;
        font-size: 7px;
        font-weight: bold;
        height: 12.5px;
        min-width: 80% ;
        border-radius: 6px;
        width: fit-content;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        padding: 0 2.5px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
      }
 
      /*雨量填充矩形*/
      .rainfall-fill {
        position: absolute;
        left: 0;
        right: 0;
        background: rgba(80, 177, 200, 0.8);
        border-radius: 6px;
        z-index: 1;
        margin: 0 -5px;
        bottom: -15px;
        transition: all 0.3s ease;
      }

      /*9日天气部分 图标*/
      .forecast-icon-container {
        text-align: center;
        position: relative;
        width: 70%;
        height: 70%;
        left: 15%;
        object-fit: contain;
        margin: -5px 0 -10px 0;
      }

      /*9日天气部分 图标*/
      .forecast-icon {
        margin: 0px auto;
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
        height: 15px;
        margin-top: -5px;
      }

      /*9日天气部分 风速*/
      .forecast-wind {
        font-size: 10px;
        margin-top: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1.5px;
        height: 15px;
      }

      /*9日天气部分 风速*/
      .wind-direction {
        font-size: 9px;
      }

      /*9日天气部分 温度曲线 Canvas*/
      .temp-line-canvas {
        position: absolute;
        left: 0;
        width: 100%;
        pointer-events: none;
        z-index: 3;
      }

      .temp-line-canvas-high {
        top: 38.5px;
        height: 120px; 
      }

      .temp-line-canvas-low {
        top: 38.5px;
        height: 120px; 
      }

      .temp-line-canvas-hourly {
        position: absolute !important;
        top: 38.5px !important;
        left: 0 !important;
        right: 0 !important;
        height: 125px !important;
        width: 100% !important;
        pointer-events: none !important;
        z-index: 3;
      }

      .temp-curve-high {
        position: absolute;
        left: 0;
        right: 0;
        height: 17.5px;
        border-radius: 2.5px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 5;
      }

      .temp-curve-low {
        position: absolute;
        left: 0;
        right: 0;
        height: 17.5px;
        border-radius: 2.5px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 4;
        margin-top: -5px;
      }

      /* 圆点模式样式 */
      .dot-mode .temp-curve-high,
      .dot-mode .temp-curve-low {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        left: calc(50% - 2.5px);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }
      .dot-mode .temp-curve-hourly {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        left: calc(50% - 2.5px);
        margin-top: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }

      .dot-mode .temp-curve-high {
        background: rgba(255, 87, 34);
        margin-top: -4px;
      }

      .dot-mode .temp-curve-low {
        background: rgba(3, 169, 243);
        margin-top: -6.5px;
      }

      /* 圆点上方的温度文字 */
      .dot-mode .temp-text {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
        text-shadow: 0 1px 2px rgba(123, 123, 123, 0.3);
      }

      .dot-mode .temp-curve-high .temp-text {
        color: rgba(255, 87, 34);
        top: -18px;
      }

      .dot-mode .temp-curve-low .temp-text {
        color: rgba(3, 169, 243);
        top: 2px;
      }

      /*预警图标和文字样式*/
      .warning-icon-text {
        color: #FFA726;
        height: 20px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s ease;
        white-space: nowrap;
        align-self: center;
        margin-left: auto;
        margin-top: -2px;
      }

      .warning-icon-text:hover {
        transform: scale(1.1);
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
    `;
  }

  constructor() {
    super();
    this.isDragging = false;
    this.startX = 0;
    this.scrollLeft = 0;
    this.scrollTarget = null;
    this.rafId = null;
    this.startX = 0;
  }
  
  _evaluateTheme() {
    try {
      if (!this.config || !this.config.theme) return 'on';
      if (typeof this.config.theme === 'function') {
          return this.config.theme();
      }
      if (typeof this.config.theme === 'string') {
          // 处理Home Assistant模板语法 [[[ return theme() ]]]
          if (this.config.theme.includes('[[[') && this.config.theme.includes(']]]')) {
              // 提取模板中的JavaScript代码
              const match = this.config.theme.match(/\[\[\[\s*(.*?)\s*\]\]\]/);
              if (match && match[1]) {
                  const code = match[1].trim();
                  // 如果代码以return开头，直接执行
                  if (code.startsWith('return')) {
                      return (new Function(code))();
                  }
                  // 否则包装在return中执行
                  return (new Function(`return ${code}`))();
              }
          }
          // 处理直接的JavaScript函数字符串
          if (this.config.theme.includes('return') || this.config.theme.includes('=>')) {
              return (new Function(`return ${this.config.theme}`))();
          }
      }
      return this.config.theme;
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
  }

  _getWeatherIcon(condition) {
    const sunState = this.hass?.states['sun.sun']?.state || 'above_horizon';
    const isDark = false;
    const iconPath = XiaoshiWeatherPadCard.ICON_PATH;
    
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

  _getWeekday(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const today = new Date();
    
    // 重置时间到午夜，只比较日期
    const resetTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const targetDate = resetTime(date);
    const todayDate = resetTime(today);
    
    // 计算日期差（毫秒）
    const diffTime = targetDate - todayDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 根据日期差返回相应的文本
    if (diffDays === -2) {
      return '前天';
    } else if (diffDays === -1) {
      return '昨天';
    } else if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '明天';
    }  else {
      // 其他日期返回星期几
      return weekdays[date.getDay()];
    }
  }

  _getForecastDays() {
    const columns = this.config?.columns || XiaoshiWeatherPadCard.TEMPERATURE_CONSTANTS.FORECAST_COLUMNS;
    if (!this.entity?.attributes?.daily_forecast) return [];
    return this.entity.attributes.daily_forecast.slice(0, columns);
  }

  _toggleHourlyModal() {
    // 使用 browser_mod 弹出独立的小时天气卡片
    const popupStyle = this.config.popup_style || `
      --mdc-theme-surface: rgb(0,0,0,0); 
      --ha-card-background: rgb(0,0,0,0);
      --ha-card-border-width: 0; 
      --dialog-backdrop-filter: blur(10px) brightness(1);
      --popup-min-width: 90vw;
    `;
    if (window.browser_mod) {
      const hassData = {
        states: this.hass.states,
        user: this.hass.user,
        theme: this.hass.theme,
        language: this.hass.language,
        resources: this.hass.resources,
        locale: this.hass.locale,
        entity_id: this.hass.entity_id,
        config: this.hass.config,
        services: this.hass.services
      };
      
      const configData = {
        entity: this.config.entity,
        theme:  this._evaluateTheme(),
        visual_style: this.config.visual_style,
        popup_style: this.config.popup_style
      };
      
      const popupContent = `
        <ha-card>
            <xiaoshi-hourly-weather-card 
              hass-hass="${encodeURIComponent(JSON.stringify(hassData))}"
              hass-config="${encodeURIComponent(JSON.stringify(configData))}"
            ></xiaoshi-hourly-weather-card>
        </ha-card>
      `;
      
      window.browser_mod.service('popup', { 
        style: popupStyle,
        content: popupContent
      });
    } else {
      console.warn('browser_mod not available, cannot show hourly weather popup');
    }
  }

  _getWarningColorForLevel(level) {
    if (level == "红色") return "rgb(255,50,50)";
    if (level == "橙色") return "rgb(255,100,0)";
    if (level == "黄色") return "rgb(255,200,0)";
    if (level == "蓝色") return "rgb(50,150,200)";
    
    return "#FFA726"; // 默认颜色
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
    
    return this._getWarningColorForLevel(level);
  }

  _toggleWarningModal() {
    // 使用 browser_mod 弹出独立的预警信息卡片
    const popupStyle = this.config.popup_style || `
      --mdc-theme-surface: rgb(0,0,0,0); 
      --ha-card-background: rgb(0,0,0,0);
      --ha-card-border-width: 0; 
      --dialog-backdrop-filter: blur(10px) brightness(1);
      --popup-min-width: 90vw;
    `;
    
    if (window.browser_mod) {
      const hassData = {
        states: this.hass.states,
        user: this.hass.user,
        theme: this.hass.theme,
        language: this.hass.language,
        resources: this.hass.resources,
        locale: this.hass.locale,
        entity_id: this.hass.entity_id,
        config: this.hass.config,
        services: this.hass.services
      };
      
      const configData = {
        entity: this.config.entity,
        theme: this._evaluateTheme(),
        popup_style: this.config.popup_style
      };
      
      const popupContent = `
        <ha-card>
            <xiaoshi-warning-weather-card 
              hass-hass="${encodeURIComponent(JSON.stringify(hassData))}"
              hass-config="${encodeURIComponent(JSON.stringify(configData))}"
            ></xiaoshi-warning-weather-card>
        </ha-card>
      `;
      
      window.browser_mod.service('popup', { 
        style: popupStyle,
        content: popupContent
      });
    } else {
      console.warn('browser_mod not available, cannot show warning popup');
    }
  }

  _toggleApiInfo() {
    // 使用 browser_mod 弹出独立的预警信息卡片
    const popupStyle = this.config.popup_style || `
      --mdc-theme-surface: rgb(0,0,0,0); 
      --ha-card-background: rgb(0,0,0,0);
      --ha-card-border-width: 0; 
      --dialog-backdrop-filter: blur(10px) brightness(1);
      --popup-min-width: 90vw;
    `;
    
    if (window.browser_mod) {
      const hassData = {
        states: this.hass.states,
        user: this.hass.user,
        theme: this.hass.theme,
        language: this.hass.language,
        resources: this.hass.resources,
        locale: this.hass.locale,
        entity_id: this.hass.entity_id,
        config: this.hass.config,
        services: this.hass.services
      };
      
      const configData = {
        entity: this.config.entity,
        theme: this._evaluateTheme(),
        popup_style: this.config.popup_style
      };
      
      const popupContent = `
        <ha-card>
            <xiaoshi-aqi-weather-card 
              hass-hass="${encodeURIComponent(JSON.stringify(hassData))}"
              hass-config="${encodeURIComponent(JSON.stringify(configData))}"
            ></xiaoshi-aqi-weather-card>
        </ha-card>
      `;
      
      window.browser_mod.service('popup', { 
        style: popupStyle,
        content: popupContent
      });
    } else {
      console.warn('browser_mod not available, cannot show warning popup');
    }
  }
  
  _toggleIndicesDetails() {
    // 使用 browser_mod 弹出独立的预警信息卡片
    const popupStyle = this.config.popup_style || `
      --mdc-theme-surface: rgb(0,0,0,0); 
      --ha-card-background: rgb(0,0,0,0);
      --ha-card-border-width: 0; 
      --dialog-backdrop-filter: blur(10px) brightness(1);
      --popup-min-width: 90vw;
    `;
    
    if (window.browser_mod) {
      const hassData = {
        states: this.hass.states,
        user: this.hass.user,
        theme: this.hass.theme,
        language: this.hass.language,
        resources: this.hass.resources,
        locale: this.hass.locale,
        entity_id: this.hass.entity_id,
        config: this.hass.config,
        services: this.hass.services
      };
      
      const configData = {
        entity: this.config.entity,
        theme: this._evaluateTheme(),
        popup_style: this.config.popup_style
      };
      
      const popupContent = `
        <ha-card>
            <xiaoshi-indices-weather-card 
              hass-hass="${encodeURIComponent(JSON.stringify(hassData))}"
              hass-config="${encodeURIComponent(JSON.stringify(configData))}"
            ></xiaoshi-indices-weather-card>
        </ha-card>
      `;
      
      window.browser_mod.service('popup', { 
        style: popupStyle,
        content: popupContent
      });
    } else {
      console.warn('browser_mod not available, cannot show warning popup');
    }
  }

  _getAqiCategoryHtml() {
    const category = this.entity.attributes?.aqi?.category;
    if (!category) return '';
    
    let color = '';
    switch(category) {
      case '优':
        color = '#4CAF50'; // 绿色
        break;
      case '良':
        color = '#FFC107'; // 黄色
        break;
      case '轻度污染':
        color = '#FF9800'; // 橙色
        break;
      case '中度污染':
      case '重度污染':
      case '严重污染':
        color = '#F44336'; // 红色
        break;
      default:
        color = '#9E9E9E'; // 灰色（其他未知类别）
    }
    
    return html`
            <button class="toggle-btn-aqi" style="color: ${color};" @click="${() => this._toggleApiInfo()}">
              ${category.slice(0,2)}
            </button>
            ` 
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

  _formatSunTime(datetime) {
    if (!datetime) return '';
    
    try {
      const date = new Date(datetime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.warn('时间格式化错误:', error);
      return datetime;
    }
  }

  _getTemperatureExtremes() {
    let temperatures = [];
    
    // 主卡片只显示每日天气，所以固定使用 daily 模式
    const forecastDays = this._getForecastDays();
    if (forecastDays.length === 0) {
      return { minTemp: 0, maxTemp: 0, range: 0 };
    }
    temperatures = forecastDays.flatMap(day => [
      parseFloat(day.native_temp_low) || 0,
      parseFloat(day.native_temperature) || 0
    ]);

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
    const { BUTTON_HEIGHT_PX, CONTAINER_HEIGHT_PX } = XiaoshiWeatherPadCard.TEMPERATURE_CONSTANTS;
    
    // 最终分配的区间高度
    const availableHeight = CONTAINER_HEIGHT_PX - BUTTON_HEIGHT_PX;
    
    if (range === 0) {
      return { highTop: 2, lowTop: 10 }; // 默认位置
    }
    
    // 每个温度值对应top位置 = (max-当前温度值) * availableHeight / range
    const unitPosition = availableHeight / range;
    
    // 高温矩形的上边界位置（温度越高，top值越小）
    const highTop = (maxTemp - highTemp) * unitPosition;
    
    // 低温矩形的上边界位置（温度越低，top值越大）
    const lowTop = availableHeight - (lowTemp - minTemp) * unitPosition;
    
    const finalHighTop = Math.max(0, Math.min(highTop, CONTAINER_HEIGHT_PX - BUTTON_HEIGHT_PX));
    const finalLowTop = Math.max(0, Math.min(lowTop, CONTAINER_HEIGHT_PX - BUTTON_HEIGHT_PX));
    
    return { 
      highTop: finalHighTop, 
      lowTop: finalLowTop
    };
  } 

  _getInstanceId() {
    if (!this._instanceId) {
      this._instanceId = Math.random().toString(36).substr(2, 9);
    }
    return this._instanceId;
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
      let targetWidth = rect.width;
      
      // 对于小时温度曲线，确保Canvas覆盖整个可滚动宽度
      if (canvasId.includes('hourly')) {
        const hourlyData = this._getHourlyForecast();
        const contentWidth = hourlyData.length * 50; // 每小时50px
        targetWidth = Math.max(rect.width, contentWidth);
      }
      
      canvas.width = targetWidth*3;
      canvas.height = rect.height*3;
      
      if (points.length < 2) {
        return;
      }
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 设置线条样式
      ctx.strokeStyle = color;
      ctx.lineWidth = 6; // 固定线宽
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 开始绘制路径
      ctx.beginPath();
      
      const { CONTAINER_HEIGHT_PX } = XiaoshiWeatherPadCard.TEMPERATURE_CONSTANTS;
      
      // 转换所有点为Canvas坐标
      const canvasPoints = points.map((point, index) => {
        const x = (point.x / 100) * canvas.width;
        const y = (point.y / CONTAINER_HEIGHT_PX) * canvas.height;
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
      const tension = 0.2; // 减小张力系数，避免过度弯曲
      
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

  _generateTemperatureLine(forecastData, extremes, isHigh = true) {
    if (forecastData.length === 0) return { points: [], curveHeight: 0, curveTop: 0 };
    
    const { BUTTON_HEIGHT_PX, FORECAST_COLUMNS } = XiaoshiWeatherPadCard.TEMPERATURE_CONSTANTS;
    // 主卡片只显示每日天气，所以固定使用 daily 模式的列数
    const actualColumns = this.config?.columns || FORECAST_COLUMNS;

    // 每日天气使用现有的计算方法
    let boundsList = forecastData.map(day => this._calculateTemperatureBounds(day, extremes));
    
    // 计算曲线范围
    let curveTop, curveBottom, curveHeight;
    
    // 每日天气模式
    if (isHigh) {
      const highTops = boundsList.map(bounds => bounds.highTop);
      curveTop = Math.min(...highTops);
      curveBottom = Math.max(...highTops) + BUTTON_HEIGHT_PX;
      curveHeight = curveBottom - curveTop;
    } else {
      const lowTops = boundsList.map(bounds => bounds.lowTop);
      curveTop = 0;
      curveBottom = Math.max(...lowTops) + BUTTON_HEIGHT_PX;
      curveHeight = curveBottom - curveTop;
    }
    
    const points = forecastData.map((data, index) => {
      const bounds = boundsList[index];
      const topPosition = isHigh ? bounds.highTop : bounds.lowTop;
      
      // 计算相对于曲线顶部的Y坐标（px单位），使用矩形中心
      const y = topPosition - curveTop + BUTTON_HEIGHT_PX/ 1.7;
      
      // 计算X坐标（百分比）
      const x = (index * 100) / actualColumns + (100 / actualColumns) / 2;
      
      return { x, y };
    });
    
    return { points, curveHeight, curveTop };
  }

  _renderDailyForecast() {
    const forecastDays = this._getForecastDays();
    const extremes = this._getTemperatureExtremes();
    const theme = this._evaluateTheme();
    const secondaryColor = 'rgb(110, 190, 240)';
    const backgroundColor = 'rgba(255, 255, 255, 0.2)';

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
        this._drawTemperatureCurve(highCanvasId, highTempData.points, 'rgba(255, 87, 34)');
        this._drawTemperatureCurve(lowCanvasId, lowTempData.points, 'rgba(33, 150, 243)');
      }, 50);
    });
    
    const columns = this.config?.columns || XiaoshiWeatherPadCard.TEMPERATURE_CONSTANTS.FORECAST_COLUMNS;
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

          // 如果是昨天，设置透明度 
          const isYesterday = weekday !== '昨天' && weekday !== '前天';
          const opacity = isYesterday ? 1 : 0.5;
          const theme = this._evaluateTheme();
          const hightbackground = isYesterday ? 
                'linear-gradient(to bottom,rgba(255, 87, 34) 0%,rgba(255, 152, 0) 100%)':
                theme === 'on' ? 
                'linear-gradient(to bottom,rgb(250, 149, 117) 0%,rgb(250, 188, 97) 100%)':
                'linear-gradient(to bottom,rgb(181, 81, 49) 0%,rgb(181, 120, 28) 100%)';
          const lowbackground = isYesterday ?  
                'linear-gradient(to bottom,rgba(3, 169, 243) 0%,rgba(33, 150, 243) 100%)':
                theme === 'on' ? 
                'linear-gradient(to bottom,rgb(99, 198, 243) 0%,rgb(117, 187, 243)100%)':
                'linear-gradient(to bottom,rgb(30, 130, 174) 0%,rgb(48, 118, 174) 100%)';
                
          const hightcolor = isYesterday ? 'rgba(255, 87, 34)': theme === 'on' ? 'rgb(250, 149, 117)' : 'rgb(181, 81, 49)';
          const lowcolor = isYesterday ? 'rgba(3, 169, 243)': theme === 'on' ? 'rgb(99, 198, 243)' : 'rgb(30, 130, 174)';



          // 计算温度矩形的动态边界和高度
          const tempBounds = this._calculateTemperatureBounds(day, extremes);
          
          // 获取雨量信息
          const rainfall = parseFloat(day.native_precipitation) || 0;
          
          // 计算雨量矩形高度和位置
          const RAINFALL_MAX = 25; // 最大雨量25mm
          const rainfallHeight = Math.min((rainfall / RAINFALL_MAX) * 125, 125); // 最大高度125px（到日期下面）

          return html`
            <div class="forecast-day" style="background: ${backgroundColor};">
              <!-- 星期（周X） -->
              <div class="forecast-weekday" style="opacity: ${opacity};">${weekday}</div>
              
              <!-- 日期（mm月dd日） -->
              <div class="forecast-date" style="color: ${secondaryColor}; opacity: ${opacity};">${dateStr}</div>
              
              <!-- 高温（橙色）和 低温（蓝色） -->
              <div class="forecast-temp-container">
                ${this.config.visual_style === 'dot' ? html`
                  <!-- 圆点模式 -->
                  <div class="temp-curve-high" style="top: ${tempBounds.highTop + 8.5}px">
                    <div class="temp-text" style="color: ${hightcolor};">${highTemp}°</div>
                  </div>
                  <div class="temp-curve-low" style="top: ${tempBounds.lowTop + 8.5}px">
                    <div class="temp-text" style="color: ${lowcolor};">${lowTemp}°</div>
                  </div>
                ` : html`
                  <!-- 按钮模式 -->
                  <div class="temp-curve-high" style="background: ${hightbackground}; top: ${tempBounds.highTop}px">
                    ${highTemp}°
                  </div>
                  <div class="temp-curve-low" style="background: ${lowbackground}; top: ${tempBounds.lowTop}px">
                    ${lowTemp}°
                  </div>
                `}
                
                <!-- 雨量填充矩形 -->
                ${rainfall > 0 ? html`
                  <div class="rainfall-fill" style="height: ${rainfallHeight}px; opacity: ${0.3 + rainfall / RAINFALL_MAX}"></div>
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

  render() {
    if (!this.entity || this.entity.state === 'unavailable' || this.entity.state === '无搜索城市') {
      return html`<div class="unavailable"></div>`;
    }
    // 获取自定义或默认的温度和湿度
    const customTemp = this._getCustomTemperature();
    const customHumidity = this._getCustomHumidity();
    const temperature = customTemp || this._formatTemperature(this.entity.attributes?.temperature);
    const humidity = customHumidity || this._formatTemperature(this.entity.attributes?.humidity);
    const condition = this.entity.attributes?.condition_cn || '未知';
    const windSpeed = this.entity.attributes?.wind_speed || 0;
    const warning = this.entity.attributes?.warning || [];
    const theme = this._evaluateTheme();
    const hasaqi = this.entity.attributes?.aqi && Object.keys(this.entity.attributes.aqi).length > 0;
    const hassairindices = this.entity.attributes?.air_indices && Object.keys(this.entity.attributes.air_indices).length > 0;
    const hasWarning = warning && Array.isArray(warning) && warning.length > 0;
    const warningColor = this._getWarningColor(warning);
    const hasminutely = this.entity?.attributes?.minutely_forecast && this.entity.attributes.minutely_forecast.length > 0;
    const update_time = this.entity.attributes?.update_time || '未知时间';
    const sunRise = this.entity.attributes?.sun.sunrise || '无';
    const sunSet = this.entity.attributes?.sun.sunset || '无';
    // 获取颜色
    const fgColor = 'rgb(255, 255, 255)';
    const bgColor = 'rgb(255, 255, 255, 0)';
    const secondaryColor = 'rgb(110, 190, 240)';

    const cardWidth = this.config?.width || 260;
    
    const visualStyle = this.config.visual_style || 'button';
    const isDotMode = visualStyle === 'dot';
    
    return html`
      <div class="weather-card  dark-theme'} ${isDotMode ? 'dot-mode' : ''}" style="background-color: ${bgColor}; color: ${fgColor}; width: ${cardWidth}px; max-width: ${cardWidth}px; margin: 0 auto;">
        <div class="main-content">
          <!-- 天气头部信息 -->
          <div class="weather-header">
            <!-- 左侧图标 -->
            <div class="weather-icon">
              <img src="${this._getWeatherIcon(condition)}" alt="${condition}">
            </div>
            
            <!-- 右侧内容区域 -->
            <div class="weather-right">
              <!-- 第一行：温度湿度 | 预警图标 -->
              <div class="weather-row">
                <div class="weather-temperature">
                  ${temperature}<font size="1px"><b> ℃&ensp;</b></font>
                  ${humidity}<font size="1px"><b> % </b></font>
                </div>
                <div class="weather-right-align">
                  ${hasWarning ? 
                    html`<div class="warning-icon-text" style="color: ${warningColor}; cursor: pointer; user-select: none;" @click="${() => this._toggleWarningModal()}">⚠ ${warning.length}</div>` : ''}
                </div>
              </div>
              
              <!-- 第二行：天气信息 + AQI | 指数按钮 + 小时按钮 -->
              <div class="weather-row">
                <div class="weather-info">
                  <span style="color: ${secondaryColor};">${condition}   
                    ${windSpeed}<span style="font-size: 0.6em;">km/h </span>
                  </span>
                  ${this._getAqiCategoryHtml()}
                </div>
                <div class="weather-right-align">
                  <div style="display: flex; justify-content: flex-end; align-items: center; gap: 5px">
                    <!-- 指数 -->
                    ${hassairindices ? html`
                      <button class="toggle-btn daily-mode" style="background: rgba(5, 155, 10);" @click="${() => this._toggleIndicesDetails()}">
                        指数
                      </button>
                    ` : ''}
                    <!-- 24小时天气按钮 -->
                    <button class="toggle-btn daily-mode" @click="${() => this._toggleHourlyModal()}">      
                      ${hasminutely ? "详细" : "小时"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 预报内容 -->
          ${this._renderDailyForecast()}

        </div>

        <div class="update-time" style="display: flex; justify-content: space-between; align-items: center; font-size: 10px;">
          <div>
            ${this._getRelativeTime(update_time)}  
          </div>
          
          <!-- 日出日落信息 - 放在右侧 -->
          ${sunRise && sunSet ? html`
            <div class="sunrise-sunset-container" style="display: flex; align-items: center; gap: 5px;">
              <div style="display: flex; align-items: center; font-size: 10px;">
                <ha-icon icon="mdi:weather-sunset-up" style="color: #FFA726; margin-right: 5px; --mdc-icon-size: 12px;"></ha-icon>
                <span>${sunRise} </span>
              </div>
              <div style="display: flex; align-items: center; font-size: 10px;">
                <ha-icon icon="mdi:weather-sunset-down" style="color: #FF7043; margin-right: 5px; --mdc-icon-size: 12px;"></ha-icon>
                <span style="margin-right: 5px;">${sunSet}  </span>
              </div>
            </div>
          ` : ''}
        </div>

      </div>
    `;
  }

  _formatSunTime(datetime) {
    if (!datetime) return '';
    
    try {
      const date = new Date(datetime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.warn('时间格式化错误:', error);
      return datetime;
    }
  }

   _getRelativeTime(updateTime) {
    if (!updateTime || updateTime === '未知时间') {
      return '未知时间';
    }
    
    try {
      // 解析更新时间，支持多种格式
      let updateDate;
      if (updateTime.includes(' ')) {
        // 格式: "2025-12-18 20:28"
        const [datePart, timePart] = updateTime.split(' ');
        updateDate = new Date(`${datePart}T${timePart}:00`);
      } else if (updateTime.includes('T')) {
        // 格式: "2025-12-18T20:28:00"
        updateDate = new Date(updateTime);
      } else {
        return updateTime; // 无法解析，返回原始值
      }
      
      const now = new Date();
      const diffMs = now - updateDate;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      let relativeTime = '';
      if (diffMinutes < 1) {
        relativeTime = '刚刚';
      } else if (diffMinutes < 60) {
        relativeTime = `${diffMinutes}分钟前`;
      } else if (diffHours < 24) {
        relativeTime = `${diffHours}小时前`;
      } else {
        relativeTime = `${diffDays}天前`;
      }
      
      return `数据更新时间：: ${relativeTime}`;
    } catch (error) {
      console.warn('时间解析错误:', error);
      return `数据更新时间：${updateTime}`;
    }
  }

  _renderWeatherIcons(forecastDays) {
    return html`
      ${forecastDays.map(day => {
        // 如果是昨天，设置透明度 
        const date = new Date(day.datetime);
        const weekday = this._getWeekday(date);
        const isYesterday = weekday !== '昨天' && weekday !== '前天';
        const opacity = isYesterday ? 1 : 0.5;
        return html`
          <div class="forecast-icon-container" style="opacity: ${opacity}>
            <div class="forecast-icon">
              <img src="${this._getWeatherIcon(day.text)}" alt="${day.text}">
            </div>
          </div>
        `;
      })}
        </div>
      </div>
    `;
  }

  _renderWindInfo(forecastDays) {
    const theme = this._evaluateTheme();
    const secondaryColor = 'rgb(110, 190, 240)';
    return html`
      ${forecastDays.map(day => {
        const windSpeedRaw = day.windscaleday || 0;
        let windSpeed = windSpeedRaw;

        // 如果是昨天，设置透明度 
        const date = new Date(day.datetime);
        const weekday = this._getWeekday(date);
        const isYesterday = weekday !== '昨天' && weekday !== '前天';
        const opacity = isYesterday ? 1 : 0.5;
        // 如果风速是 "4-5" 格式，取最大值
        if (typeof windSpeedRaw === 'string' && windSpeedRaw.includes('-')) {
          const speeds = windSpeedRaw.split('-').map(s => parseFloat(s.trim()));
          if (speeds.length === 2 && !isNaN(speeds[0]) && !isNaN(speeds[1])) {
            windSpeed = Math.max(speeds[0], speeds[1]);
          }
        }
        
        const windDirection = day.wind_bearing || 0;
        
        return html`
          <div class="forecast-wind-container" style="opacity: ${opacity}">
            <div class="forecast-wind" style="color: ${secondaryColor};">
              <span class="wind-direction" >${this._getWindDirectionIcon(windDirection)}</span>
              <span>${windSpeed}级</span>
            </div>
          </div>
        `;
      })}
        </div>
      </div>
    `;
  }

  _getWindDirectionIcon(bearing) {
    // 0是北风，按顺时针方向增加
    const directions = [
      { range: [337.5, 360], icon: '↑', name: '北' },    // 337.5-360度
      { range: [0, 22.5], icon: '↑', name: '北' },        // 0-22.5度
      { range: [22.5, 67.5], icon: '↗', name: '东北' },    // 22.5-67.5度
      { range: [67.5, 112.5], icon: '→', name: '东' },     // 67.5-112.5度
      { range: [112.5, 157.5], icon: '↘', name: '东南' },   // 112.5-157.5度
      { range: [157.5, 202.5], icon: '↓', name: '南' },     // 157.5-202.5度
      { range: [202.5, 247.5], icon: '↙', name: '西南' },   // 202.5-247.5度
      { range: [247.5, 292.5], icon: '←', name: '西' },     // 247.5-292.5度
      { range: [292.5, 337.5], icon: '↖', name: '西北' }    // 292.5-337.5度
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

    return direction ? direction.icon : '↓';
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

  // 鼠标滑动处理方法
  _handleMouseDown(e) {
    const container = e.target.closest('.forecast-container');
    const wrapper = e.target.closest('.forecast-container-wrapper');
    if (!container || !wrapper) return;
    
    this.isDragging = true;
    this.startX = e.pageX - wrapper.offsetLeft;
    this.scrollLeft = wrapper.scrollLeft || 0;
    this.scrollTarget = wrapper;
    container.style.cursor = 'grabbing';
    e.preventDefault();
  }

  _handleMouseUp(e) {
    this.isDragging = false;
    if (this.scrollTarget) {
      const container = this.scrollTarget.querySelector('.forecast-container');
      if (container) {
        container.style.cursor = 'grab';
      }
      this.scrollTarget = null;
    }
  }

  _handleMouseMove(e) {
    if (!this.isDragging || !this.scrollTarget) return;
    
    e.preventDefault();
    const x = e.pageX - this.scrollTarget.offsetLeft;
    const walk = (x - this.startX) * 1.5; // 调整滑动速度
    
    // 使用requestAnimationFrame优化性能
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.rafId = requestAnimationFrame(() => {
      if (this.scrollTarget) {
        this.scrollTarget.scrollLeft = this.scrollLeft - walk;
      }
    });
  }

  // 触摸滑动处理方法
  _handleTouchStart(e) {
    const container = e.target.closest('.forecast-container');
    const wrapper = e.target.closest('.forecast-container-wrapper');
    if (!container || !wrapper) return;
    
    this.startX = e.touches[0].pageX - wrapper.offsetLeft;
    this.scrollLeft = wrapper.scrollLeft || 0;
    this.scrollTarget = wrapper;
  }

  _handleTouchEnd(e) {
    this.scrollTarget = null;
  }

  _handleTouchMove(e) {
    if (!this.scrollTarget) return;
    
    e.preventDefault();
    const x = e.touches[0].pageX - this.scrollTarget.offsetLeft;
    const walk = (x - this.startX) * 1.5; // 调整滑动速度
    
    // 使用requestAnimationFrame优化性能
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.rafId = requestAnimationFrame(() => {
      if (this.scrollTarget) {
        this.scrollTarget.scrollLeft = this.scrollLeft - walk;
      }
    });
  }
}
customElements.define('xiaoshi-weather-pad-card', XiaoshiWeatherPadCard);

class XiaoshiHourlyWeatherCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      entity: { type: Object },
      mode: { type: String }
    };
  }
  // 温度计算常量
  static get TEMPERATURE_CONSTANTS() {
    return {
      BUTTON_HEIGHT_PX: 17,        // 温度矩形高度（px）
      CONTAINER_HEIGHT_PX: 125,      // 温度容器总高度（px）
      FORECAST_COLUMNS: 5,          // 预报列数
    };
  }

  static get ICON_PATH() {
    return '/qweather/icon';
  } 

  static get styles() {
    return css`
      :host {
        display: block;
      }

      /*主卡片样式*/
      .weather-card {
        position: relative;
        border-radius: 15px;
        padding: 8px;
        font-family: sans-serif;
        overflow: hidden;
      }

      /*主卡片样式*/
      .weather-card.dark-theme {
      }

      .main-content {
        position: relative;
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
        width: 50px;
        height: 50px;
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
        height: 30px;
        font-size: 23px;
        font-weight: bold;
        margin-top: 0;
        margin-bottom: 0;
      }

      /*天气头部 天气信息*/
      .weather-info {
        height: 12px;
        font-size: 12px;
        margin-top: 0px;
        white-space: nowrap;
      }


      /*天气右侧容器*/
      .weather-right {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        min-height: 50px;
        flex: 1;
        width: 100%;
      }

      /*天气温度样式*/
      .weather-temperature {
        height: 30px;
        font-size: 23px;
        font-weight: bold;
        margin-top: 0;
        margin-bottom: 0;
      }

      /*天气信息样式*/
      .weather-info {
        height: 15px;
        font-size: 12px;
        margin-top: 0;
        margin-bottom: 0;
        white-space: nowrap;
      }

      .forecast-toggle-button {
        margin-top: auto;
      }

      /*小时天气温度样式*/
      .temp-curve-hourly {
        position: absolute;
        left: 0;
        right: 0;
        height: 17.5px;
        background: linear-gradient(to bottom, 
          rgba(156, 39, 176) 0%, 
          rgba(103, 58, 183) 100%);
        border-radius: 2.5px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 4;
      }

      /*分钟天气温度样式（绿色）*/
      .temp-curve-minutely {
        position: absolute;
        left: 0;
        right: 0;
        height: 17.5px;
        background: linear-gradient(to bottom, 
          rgba(76, 175, 80) 0%, 
          rgba(56, 142, 60) 100%);
        border-radius: 2.5px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 4;
      }

      /*9日天气部分*/
      .forecast-container {
        display: grid;
        gap: 2px;
        margin-top: 10px;
        height: 240px;
        position: relative;
      }

      /*9日天气部分*/
      .forecast-day {
        grid-row: 1;
        text-align: center;
        position: relative;
        border-radius: 8px;
        padding: 5px;
        position: relative;
      }

      /*9日天气部分 星期*/
      .forecast-weekday {
        font-size: 11px;
        height: 14px;
        margin-top: -5px;
        margin-bottom: 1px;
        font-weight: 500;
        white-space: nowrap;
      }
      
      /*9日天气部分 日期*/
      .forecast-date {
        font-size: 8px;
        margin-bottom: 15px;
        margin-left: 0px;
        margin-right: 0px;
        height: 10px;
        white-space: nowrap;
      }

      /*9日天气部分 温度区域*/
      .forecast-temp-container {
        position: relative;
        height: 125px;
        margin-top: 0;
        margin-bottom: 0;
      }

      /*9日天气部分 温度区域*/
      .forecast-temp-null {
        position: relative;
        height: 10px;
      }

      /*9日天气部分 雨量容器*/
      .forecast-rainfall-container {
        text-align: center;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 12.5px;
        margin-top: -10px;
        margin-bottom: 0;
      }

      /*9日天气部分 雨量标签*/
      .forecast-rainfall {
        background: rgba(80, 177, 200);
        color: white;
        font-size: 7px;
        font-weight: bold;
        height: 12.5px;
        min-width: 80% ;
        border-radius: 6px;
        width: fit-content;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        padding: 0 2.5px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
      }
 
      /*雨量填充矩形*/
      .rainfall-fill {
        position: absolute;
        left: 0;
        right: 0;
        background: rgba(80, 177, 200, 0.8);
        border-radius: 6px;
        z-index: 1;
        margin: 0 -5px;
        bottom: -15px;
        transition: all 0.3s ease;
      }

      /*9日天气部分 图标*/
      .forecast-icon-container {
        text-align: center;
        position: relative;
      }

      /*9日天气部分 图标*/
      .forecast-icon {
        width: 25px;
        height: 25px;
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
        height: 15px;
        margin-top: -5px;
      }

      /*9日天气部分 风速*/
      .forecast-wind {
        font-size: 10px;
        margin-top: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1.5px;
        height: 15px;
      }

      /*9日天气部分 风速*/
      .wind-direction {
        font-size: 9px;
      }

      /*9日天气部分 温度曲线 Canvas*/
      .temp-line-canvas {
        position: absolute;
        left: 0;
        width: 100%;
        pointer-events: none;
        z-index: 3;
      }

      .temp-line-canvas-high {
        top: 37.5px;
        height: 125px; 
      }

      .temp-line-canvas-low {
        top: 37.5px;
        height: 125px; 
      }

      .temp-line-canvas-hourly {
        position: absolute !important;
        top: 37.5px !important;
        left: 0 !important;
        right: 0 !important;
        height: 125px !important;
        width: 100% !important;
        pointer-events: none !important;
        z-index: 2;
      }

      /* 圆点模式样式 */
      .dot-mode .temp-curve-hourly,
      .dot-mode .temp-curve-minutely {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        left: calc(50% - 2.5px);
        margin-top: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }

      .dot-mode .temp-curve-hourly {
        background: rgba(156, 39, 176);
      }

      .dot-mode .temp-curve-minutely {
        background: rgba(76, 175, 80);
      }

      /* 圆点上方的温度文字 */
      .dot-mode .temp-text {
        position: absolute;
        top: -18px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
        text-shadow: 0 1px 2px rgba(123, 123, 123, 0.3);
      }

      .dot-mode .temp-curve-hourly .temp-text {
        color: rgba(193, 65, 215, 1);
      }
      .dot-mode .temp-curve-minutely .temp-text {
        color: rgba(76, 175, 80, 1);
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


      /*24小时天气弹窗样式 */
      .hourly-modal-content {
        background-color: rgba(50, 50, 50);
        border-radius: 12px;
        max-width: 80vw;
        overflow: hidden;
        margin: 0 auto;
        padding: 0px;
      }

      .hourly-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-left: 25px;
        margin-right: 0px;
        height: 60px;
        font-size: 20px;
      }

      .hourly-modal-header h3 {
        margin: 0;
        font-weight: bold;
        font-size: 20px;
        
      }

      .hourly-modal-header2 {
        display: flex;
        justify-content: flex-end;
        align-items: start;
        margin-right: 0px;
        height: 30px;
        font-size: 15px;
      }
      .hourly-modal-header2 h3 {
        font-weight: bold;
        font-size: 15px;
      }

      .hourly-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: rgba(255, 100, 0);
        margin-right: 10px;
        padding: 5px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .hourly-close-btn:hover {
        background-color: rgba(0, 0, 0, 0.1);
        color: rgba(255, 0, 0);
      }

      .hourly-modal-body {
        padding: 5px 2px;
        overflow: hidden;
      }

      /* 小时预报容器滑动支持 */
      .hourly-modal-body .forecast-container {
        overflow-x: auto;
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE and Edge */
        user-select: none; /* 防止文本选中 */
        -webkit-user-select: none; /* Safari */
        -moz-user-select: none; /* Firefox */
        -ms-user-select: none; /* IE/Edge */
      }

      /* 小时预报容器wrapper隐藏滚动条 */
      .hourly-modal-body .forecast-container-wrapper {
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE and Edge */
      }

      /* 隐藏滚动条但保留滚动功能 */
      .hourly-modal-body .forecast-container::-webkit-scrollbar,
      .hourly-modal-body .forecast-container-wrapper::-webkit-scrollbar {
        display: none; /* Chrome, Safari and Opera */
        width: 0;
        height: 0;
      }

    `;
  }

  constructor() {
    super();
    this.showWarningDetails = false;
    this.warningTimer = null;
    this.isDragging = false;
    this.startX = 0;
    this.scrollLeft = 0;
    this.scrollTarget = null;
    this.rafId = null;
  }

  _evaluateTheme() {
    try {
      if (!this.config || !this.config.theme) return 'on';
      if (typeof this.config.theme === 'function') {
          return this.config.theme();
      }
      if (typeof this.config.theme === 'string') {
          // 处理Home Assistant模板语法 [[[ return theme() ]]]
          if (this.config.theme.includes('[[[') && this.config.theme.includes(']]]')) {
              // 提取模板中的JavaScript代码
              const match = this.config.theme.match(/\[\[\[\s*(.*?)\s*\]\]\]/);
              if (match && match[1]) {
                  const code = match[1].trim();
                  // 如果代码以return开头，直接执行
                  if (code.startsWith('return')) {
                      return (new Function(code))();
                  }
                  // 否则包装在return中执行
                  return (new Function(`return ${code}`))();
              }
          }
          // 处理直接的JavaScript函数字符串
          if (this.config.theme.includes('return') || this.config.theme.includes('=>')) {
              return (new Function(`return ${this.config.theme}`))();
          }
      }
      return this.config.theme;
    } catch(e) {
      console.error('计算主题时出错:', e);
      return 'on';
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // 处理通过属性传递的数据
    this._parseAttributeData();
    this._updateEntities();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('config') || changedProperties.has('hass')) {
      // 处理通过属性传递的数据
      this._parseAttributeData();
      this._updateEntities();
    }
  }

  _updateEntities() {
    if (!this.hass || !this.config) return;

    this.entity = this.hass.states[this.config.entity];
  }

  _getInstanceId() {
    if (!this._instanceId) {
      this._instanceId = Math.random().toString(36).substr(2, 9);
    }
    return this._instanceId;
  }

  _getWeatherIcon(condition) {
    const sunState = this.hass?.states['sun.sun']?.state || 'above_horizon';
    const isDark = this._evaluateTheme() === 'on';
    const iconPath = XiaoshiWeatherPadCard.ICON_PATH;
    
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

  _getAqiCategoryHtml() {
    const category = this.entity.attributes?.aqi?.category;
    if (!category) return '';
    
    let color = '';
    switch(category) {
      case '优':
        color = '#4CAF50'; // 绿色
        break;
      case '良':
        color = '#FFC107'; // 黄色
        break;
      case '轻度污染':
        color = '#FF9800'; // 橙色
        break;
      case '中度污染':
      case '重度污染':
      case '严重污染':
        color = '#F44336'; // 红色
        break;
      default:
        color = '#9E9E9E'; // 灰色（其他未知类别）
    }
    
    return html`<span style="color: ${color}; font-weight: bold;"> ${category}</span>`;
  }

  _getHourlyTemperatureExtremes() {
    let temperatures = [];
    
    // 小时预报专用温度极值计算
    const hourlyForecast = this._getHourlyForecast();
    if (hourlyForecast.length === 0) {
      return { minTemp: 0, maxTemp: 0, range: 0, allEqual: true };
    }
    temperatures = hourlyForecast.map(hour => parseFloat(hour.native_temperature) || 0);

    const minTemp = Math.min(...temperatures);
    const maxTemp = Math.max(...temperatures);
    const range = maxTemp - minTemp;
    
    // 检查是否所有温度都相等
    const allEqual = temperatures.every(temp => temp === temperatures[0]);
    
    return { minTemp, maxTemp, range, allEqual };
  }

  _getMinutelyTmperatureExtremes() {
    let temperatures = [];
    
    // 小时预报专用温度极值计算
    const minutelyForecast = this._getMinutelyForecast();
    if (minutelyForecast.length === 0) {
      return { minTemp: 0, maxTemp: 0, range: 0, allEqual: true };
    }
    temperatures = minutelyForecast.map(hour => parseFloat(hour.native_temperature) || 0);

    const minTemp = Math.min(...temperatures);
    const maxTemp = Math.max(...temperatures);
    const range = maxTemp - minTemp;
    
    // 检查是否所有温度都相等
    const allEqual = temperatures.every(temp => temp === temperatures[0]);
    
    return { minTemp, maxTemp, range, allEqual };
  }

  _generateHourlyTemperatureLine(hourlyData, extremes) {
    if (hourlyData.length === 0) return { points: [], curveHeight: 0, curveTop: 0 };
    
    const { BUTTON_HEIGHT_PX, CONTAINER_HEIGHT_PX } = XiaoshiWeatherPadCard.TEMPERATURE_CONSTANTS;
    const { minTemp, maxTemp, range } = extremes;
    
    const actualColumns = hourlyData.length;
    // 小时天气只有一个温度，使用实际可用高度计算
    const availableHeight = CONTAINER_HEIGHT_PX - BUTTON_HEIGHT_PX;
    
    // 计算每个小时的温度位置
    let positions;
    if (range === 0) {
      // 如果所有温度相等，将位置设置在中间
      const middlePosition = availableHeight / 2;
      positions = hourlyData.map(() => middlePosition);
    } else {
      const unitPosition = availableHeight / range;
      positions = hourlyData.map(hour => {
        const temp = parseFloat(hour.native_temperature) || 0;
        return (maxTemp - temp) * unitPosition;
      });
    }
    
    // 计算曲线范围
    const curveTop = Math.min(...positions);
    const curveBottom = Math.max(...positions) + BUTTON_HEIGHT_PX;
    const curveHeight = curveBottom - curveTop;

    // 生成点坐标 - 需要覆盖整个可滚动区域
    const actualHours = hourlyData.length;
    // 为了确保曲线覆盖整个可滚动区域，我们需要计算基于实际小时数的X坐标
    // 使用实际小时数作为总列数，确保曲线跨越整个可滚动宽度
    const points = hourlyData.map((data, index) => {
      const y = positions[index] - curveTop + BUTTON_HEIGHT_PX / 1.7;
      // X坐标计算：每个小时占据相等的空间，曲线覆盖所有小时数据
      const x = (index * 100) / actualHours + (100 / actualHours) / 2;
      return { x, y };
    });
    
    return { points, curveHeight, curveTop };
  }

  _getHourlyForecast() {
    if (!this.entity?.attributes?.hourly_forecast) return [];
    return this.entity.attributes.hourly_forecast.slice(0, 24);
  }

  _getMinutelyForecast() {
    if (!this.entity?.attributes?.minutely_forecast) return [];
    return this.entity.attributes.minutely_forecast.slice(0, 24);
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

  _formatSunTime(datetime) {
    if (!datetime) return '';
    
    try {
      const date = new Date(datetime);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.warn('时间格式化错误:', error);
      return datetime;
    }
  }

  _parseAttributeData() {
    // 从hass-hass属性解析数据
    const hassAttr = this.getAttribute('hass-hass');
    if (hassAttr && !this.hass) {
      try {
        this.hass = JSON.parse(decodeURIComponent(hassAttr));
      } catch (e) {
        console.error('Failed to parse hass attribute:', e);
      }
    }

    // 从hass-config属性解析配置数据
    const configAttr = this.getAttribute('hass-config');
    if (configAttr && !this.config) {
      try {
        this.config = JSON.parse(decodeURIComponent(configAttr));
      } catch (e) {
        console.error('Failed to parse config attribute:', e);
      }
    }
  }

  _formatHourlyTime(datetime) {
    const [datePart, timePart] = datetime.split(' ');
    const [hours, minutes] = timePart.split(':');
    return `${hours}:${minutes}`;
  }

  _formatHourlyDate(datetime) {
    const [datePart, timePart] = datetime.split(' ');
    const [year, month, day] = datePart.split('-');
    return `${month}月${day}日`;
  }

  getHourlyWeatherData() {
    if (!this.entity?.attributes?.hourly_forecast) return [];
    
    return this.entity.attributes.hourly_forecast.slice(0, 24).map(hour => ({
      time: this._formatHourlyTime(hour.datetime),
      temp: hour.native_temperature || hour.temperature || '--',
      condition: hour.text || '晴',
      icon: hour.text || '晴',
      rain: hour.native_precipitation || hour.precipitation || 0,
      wind: hour.windscale || hour.wind_speed || 0
    }));
  }

  _toggleHourlyClose() {
    // 关闭小时天气弹窗
    if (window.browser_mod) {
      window.browser_mod.service('close_popup');
    } else {
      // 如果没有 browser_mod，尝试查找并关闭弹窗
      const modal = this.closest('.browser-mod-popup, .mdc-dialog, ha-dialog');
      if (modal) {
        modal.remove();
      }
    }
  }

  render() {
    const hourlyForecast = this._getHourlyForecast();
    if (!hourlyForecast || hourlyForecast.length === 0) {
      const theme = this._evaluateTheme();
      const backgroundColor = theme === 'on' ? 'rgba(255, 255, 255)' : 'rgba(50, 50, 50)';
      const textColor = theme === 'on' ? 'rgba(0, 0, 0)' : 'rgba(250, 250, 250)';
      
      return html`
          <div class="hourly-modal-content" style="background-color: ${backgroundColor}; color: ${textColor};" @click="${(e) => e.stopPropagation()}">
            <div class="hourly-modal-header">
              <h3 style="color: ${textColor};">24小时天气预报</h3>
              <button class="hourly-close-btn" @click="${() => this._toggleHourlyClose()}">×</button>
            </div>
            <div class="hourly-modal-body">
              <p style="color: ${textColor};">暂无小时天气数据</p>
            </div>
          </div>
      `;
    }

    // 获取自定义或默认的温度和湿度
    const customTemp = this._getCustomTemperature();
    const customHumidity = this._getCustomHumidity();
    const temperature = customTemp || this._formatTemperature(this.entity.attributes?.temperature);
    const humidity = customHumidity || this._formatTemperature(this.entity.attributes?.humidity);
    const condition = this.entity.attributes?.condition_cn || '未知';
    const windSpeed = this.entity.attributes?.wind_speed || 0;
    const theme = this._evaluateTheme();

    // 根据主题设置颜色
    const fgColor = theme === 'on' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
    const bgColor = 'rgb(255, 255, 255, 0)';
    const secondaryColor = theme === 'on' ? 'rgb(66, 165, 245)' : 'rgb(110, 190, 240)';
    const modalBgColor = theme === 'on' ? 'rgba(255, 255, 255)' : 'rgba(50, 50, 50)';
    const hasminutely = this.entity?.attributes?.minutely_forecast && this.entity.attributes.minutely_forecast.length > 0;
    const visualStyle = this.config.visual_style || 'button';
    const isDotMode = visualStyle === 'dot';

    return html`      
      <div class="hourly-modal-content" style="background-color: ${modalBgColor};" >
          <div class="hourly-modal-header">
            <h3 style="color: ${fgColor};">
             ${hasminutely ? "详细天气预报" : "24小时天气预报"}
            </h3>
            <button class="hourly-close-btn" @click="${() => this._toggleHourlyClose()}">×</button>
          </div>
          <div class="hourly-modal-body">
            <div class="weather-card ${theme === 'on' ? 'dark-theme' : ''} ${isDotMode ? 'dot-mode' : ''}" style="background-color: ${bgColor}; color: ${fgColor}; width: calc(100% - 30px); max-width: calc(100% - 30px); margin: 0 auto;">
              <div class="main-content">
                <!-- 天气头部信息 -->
                <div class="weather-header">
                  <div class="weather-left">
                    <div class="weather-icon">
                      <img src="${this._getWeatherIcon(condition)}" alt="${condition}">
                    </div>
                    <div class="weather-details">
                      <div class="weather-temperature">
                        ${temperature}<font size="1px"><b> ℃&ensp;</b></font>
                        ${humidity}<font size="1px"><b> % </b></font>
                      </div>
                      <div class="weather-info">
                        <span style="color: ${secondaryColor};">${condition}   
                          ${windSpeed}<span style="font-size: 0.6em;">km/h </span> 
                        </span>
                        ${this._getAqiCategoryHtml()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 小时预报 -->
                 ${hasminutely ? html`<div class="hourly-modal-header2">
                    <h3 style="color: ${fgColor};">24小时天气预报</h3>
                  </div>` : ''}
                ${this._renderHourlyForecast()}

                ${hasminutely ? html`<div class="hourly-modal-header2">
                    <h3 style="color: ${fgColor};">分钟天气预报</h3>
                  </div>
                  ${this._renderMinutelyForecast()}` : ''}
              </div>   
            </div>
          </div>


        </div>
    `;
  }

  _renderHourlyForecast() {
    const hourlyForecast = this._getHourlyForecast();
    const extremes = this._getHourlyTemperatureExtremes();
    const theme = this._evaluateTheme();
    const secondaryColor = 'rgb(110, 190, 240)';
    const backgroundColor = theme === 'on' ? 'rgba(120, 120, 120, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    // 生成温度曲线坐标（小时天气只有一个温度）
    const tempData = this._generateHourlyTemperatureLine(hourlyForecast, extremes, true);
    
    // 使用组件实例ID + Canvas ID，避免多实例冲突
    const instanceId = this._getInstanceId();
    const canvasId = `hourly-temp-canvas-${instanceId}`;
    
    // 在DOM更新完成后绘制曲线
    this.updateComplete.then(() => {
      setTimeout(() => {
        this._drawTemperatureCurve(canvasId, tempData.points, 'rgba(156, 39, 176)');
      }, 50);
    });
    
    return html`
      <div class="forecast-container-wrapper" style="position: relative; overflow-x: auto; overflow-y: hidden;">
        <div class="forecast-container" 
             style="display: grid; grid-template-columns: repeat(${hourlyForecast.length}, minmax(50px, 1fr)); gap: 2px; cursor: grab; width: ${hourlyForecast.length * 50+(hourlyForecast.length-1)*2 }px;"
             @mousedown=${(e) => this._handleMouseDown(e)}
             @mouseleave=${(e) => this._handleMouseUp(e)}
             @mouseup=${(e) => this._handleMouseUp(e)}
             @mousemove=${(e) => this._handleMouseMove(e)}
             @touchstart=${(e) => this._handleTouchStart(e)}
             @touchend=${(e) => this._handleTouchEnd(e)}
             @touchmove=${(e) => this._handleTouchMove(e)}>
          <!-- 小时温度连接线 Canvas - 绝对定位覆盖整个可滚动区域 -->
          <canvas class="temp-line-canvas temp-line-canvas-high temp-line-canvas-hourly" 
                  id="hourly-temp-canvas-${this._getInstanceId()}"></canvas>
        
        ${hourlyForecast.map((hour, index) => {
          const timeStr = this._formatHourlyTime(hour.datetime);
          const dateStr = this._formatHourlyDate(hour.datetime);
          const temp = this._formatTemperature(hour.native_temperature);
          
          // 获取雨量信息
          const rainfall = parseFloat(hour.native_precipitation) || 0;
          
          // 计算温度位置（简化版）
          const { minTemp, maxTemp, range, allEqual } = extremes;
          const { BUTTON_HEIGHT_PX, CONTAINER_HEIGHT_PX } = XiaoshiWeatherPadCard.TEMPERATURE_CONSTANTS;
          // 使用实际可用高度：容器高度减去按钮高度
          const availableHeight = CONTAINER_HEIGHT_PX - BUTTON_HEIGHT_PX;
          
          let finalTopPosition;
          if (allEqual) {
            // 如果所有温度相等，将位置设置在中间
            finalTopPosition = availableHeight / 2;
          } else {
            const unitPosition = range === 0 ? 0 : availableHeight / range;
            const tempValue = parseFloat(hour.native_temperature) || 0;
            const topPosition = (maxTemp - tempValue) * unitPosition;
            // 最高温度应该显示在顶部(position: 0)，最低温度在底部(position: availableHeight)
            finalTopPosition = Math.max(0, Math.min(topPosition, availableHeight));
          }
          
          // 计算雨量矩形高度和位置
          const RAINFALL_MAX = 5; // 最大雨量5mm
          const rainfallHeight = Math.min((rainfall / RAINFALL_MAX) * 125, 125);

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
                  <div class="temp-curve-hourly" style="top: ${finalTopPosition}px">
                    <div class="temp-text">${temp}°</div>
                  </div>
                ` : html`
                  <!-- 按钮模式 -->
                  <div class="temp-curve-hourly" style="top: ${finalTopPosition}px">
                    ${temp}°
                  </div>
                `}
                
                <!-- 雨量填充矩形 -->
                ${rainfall > 0 ? html`
                  <div class="rainfall-fill" style="height: ${rainfallHeight}px; opacity: ${0.3 + rainfall / RAINFALL_MAX}"></div>
                ` : ''}
              </div>
              <div class="forecast-temp-null"></div>
            </div>
          `;
        })}
        
        <!-- 雨量标签行 - 10列网格 -->
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
    `;
  }

  _renderMinutelyForecast() {
    const minutelyForecast = this._getMinutelyForecast();
    const extremes = this._getMinutelyTmperatureExtremes();
    const theme = this._evaluateTheme();
    const secondaryColor = 'rgb(110, 190, 240)';
    const backgroundColor = theme === 'on' ? 'rgba(120, 120, 120, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    // 生成温度曲线坐标（分钟天气只有一个温度）
    const tempData = this._generateHourlyTemperatureLine(minutelyForecast, extremes, true);
    
    // 使用组件实例ID + Canvas ID，避免多实例冲突
    const instanceId = this._getInstanceId();
    const canvasId = `minutely-temp-canvas-${instanceId}`;
    
    // 在DOM更新完成后绘制曲线（绿色）
    this.updateComplete.then(() => {
      setTimeout(() => {
        this._drawTemperatureCurve(canvasId, tempData.points, 'rgba(76, 175, 80)');
      }, 50);
    });
    
    return html`
      <div class="forecast-container-wrapper" style="position: relative; overflow-x: auto; overflow-y: hidden;">
        <div class="forecast-container" 
             style="display: grid; grid-template-columns: repeat(${minutelyForecast.length}, minmax(50px, 1fr)); gap: 2px; cursor: grab; width: ${minutelyForecast.length * 50+(minutelyForecast.length-1)*2 }px;"
             @mousedown=${(e) => this._handleMouseDown(e)}
             @mouseleave=${(e) => this._handleMouseUp(e)}
             @mouseup=${(e) => this._handleMouseUp(e)}
             @mousemove=${(e) => this._handleMouseMove(e)}
             @touchstart=${(e) => this._handleTouchStart(e)}
             @touchend=${(e) => this._handleTouchEnd(e)}
             @touchmove=${(e) => this._handleTouchMove(e)}>
          <!-- 分钟温度连接线 Canvas - 绝对定位覆盖整个可滚动区域 -->
          <canvas class="temp-line-canvas temp-line-canvas-high temp-line-canvas-minutely" 
                  id="minutely-temp-canvas-${this._getInstanceId()}"></canvas>
        
        ${minutelyForecast.map((minute, index) => {
          const timeStr = this._formatHourlyTime(minute.datetime);
          const dateStr = this._formatHourlyDate(minute.datetime);
          const temp = this._formatTemperature(minute.native_temperature);
          
          // 获取雨量信息
          const rainfall = parseFloat(minute.native_precipitation) || 0;
          
          // 计算温度位置（简化版）
          const { minTemp, maxTemp, range, allEqual } = extremes;
          const { BUTTON_HEIGHT_PX, CONTAINER_HEIGHT_PX } = XiaoshiWeatherPadCard.TEMPERATURE_CONSTANTS;
          // 使用实际可用高度：容器高度减去按钮高度
          const availableHeight = CONTAINER_HEIGHT_PX - BUTTON_HEIGHT_PX;
          
          let finalTopPosition;
          if (allEqual) {
            // 如果所有温度相等，将位置设置在中间
            finalTopPosition = availableHeight / 2;
          } else {
            const unitPosition = range === 0 ? 0 : availableHeight / range;
            const tempValue = parseFloat(minute.native_temperature) || 0;
            const topPosition = (maxTemp - tempValue) * unitPosition;
            // 最高温度应该显示在顶部(position: 0)，最低温度在底部(position: availableHeight)
            finalTopPosition = Math.max(0, Math.min(topPosition, availableHeight));
          }
          
          // 计算雨量矩形高度和位置
          const RAINFALL_MAX = 1; // 最大雨量1mm
          const rainfallHeight = Math.min((rainfall / RAINFALL_MAX) * 125, 125);

          return html`
            <div class="forecast-day" style="background: ${backgroundColor};">
              <!-- 时间（hh:mm） -->
              <div class="forecast-weekday">${timeStr}</div>
              
              <!-- 日期（mm月dd日） -->
              <div class="forecast-date" style="color: ${secondaryColor};">${dateStr}</div>
              
              <!-- 温度（绿色） -->
              <div class="forecast-temp-container">
                ${this.config.visual_style === 'dot' ? html`
                  <!-- 圆点模式 -->
                  <div class="temp-curve-minutely" style="top: ${finalTopPosition}px">
                    <div class="temp-text">${temp}°</div>
                  </div>
                ` : html`
                  <!-- 按钮模式 -->
                  <div class="temp-curve-minutely" style="top: ${finalTopPosition}px">
                    ${temp}°
                  </div>
                `}
                
                <!-- 雨量填充矩形 -->
                ${rainfall > 0 ? html`
                  <div class="rainfall-fill" style="height: ${rainfallHeight}px; opacity: ${0.3 + rainfall / RAINFALL_MAX}"></div>
                ` : ''}
              </div>
              <div class="forecast-temp-null"></div>
            </div>
          `;
        })}
        
        <!-- 雨量标签行 -->
        ${minutelyForecast.map(minute => {
          const rainfall = parseFloat(minute.native_precipitation) || 0;
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
        ${this._renderMinutelyWeatherIcons(minutelyForecast)}
        
        <!-- 风向风级行 -->
        ${this._renderMinutelyWindInfo(minutelyForecast)}
      </div>
    `;
  }

  _renderMinutelyWeatherIcons(minutelyForecast) {
    return html`
      ${minutelyForecast.map(minute => {
        return html`
          <div class="forecast-icon-container">
            <div class="forecast-icon">
              <img src="${this._getWeatherIcon(minute.text)}" alt="${minute.text}">
            </div>
          </div>
        `;
      })}
        </div>
      </div>
    `;
  }

  _renderMinutelyWindInfo(minutelyForecast) {
    const theme = this._evaluateTheme();
    const secondaryColor = 'rgb(110, 190, 240)';
    return html`
      ${minutelyForecast.map(minute => {
        const windSpeedRaw = minute.windscaleday || 0;
        let windSpeed = windSpeedRaw;
        
        // 如果风速是 "4-5" 格式，取最大值
        if (typeof windSpeedRaw === 'string' && windSpeedRaw.includes('-')) {
          const speeds = windSpeedRaw.split('-').map(s => parseFloat(s.trim()));
          if (speeds.length === 2 && !isNaN(speeds[0]) && !isNaN(speeds[1])) {
            windSpeed = Math.max(speeds[0], speeds[1]);
          }
        }
        
        const windDirection = minute.wind_bearing || 0;
        
        return html`
          <div class="forecast-wind-container">
            <div class="forecast-wind" style="color: ${secondaryColor};">
              <span class="wind-direction">${this._getWindDirectionIcon(windDirection)}</span>
              <span>${windSpeed}级</span>
            </div>
          </div>
        `;
      })}
        </div>
      </div>
    `;
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
      let targetWidth = rect.width;
      
      // 对于小时温度曲线，确保Canvas覆盖整个可滚动宽度
      if (canvasId.includes('hourly')) {
        const hourlyData = this._getHourlyForecast();
        const contentWidth = hourlyData.length * 50; // 每小时50px
        targetWidth = Math.max(rect.width, contentWidth);
      }
      
      // 对于分钟温度曲线，确保Canvas覆盖整个可滚动宽度
      if (canvasId.includes('minutely')) {
        const minutelyData = this._getMinutelyForecast();
        const contentWidth = minutelyData.length * 50; // 每分钟50px
        targetWidth = Math.max(rect.width, contentWidth);
      }
      
      canvas.width = rect.width *3;
      canvas.height = rect.height *3;
      
      if (points.length < 2) {
        return;
      }
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 设置线条样式
      ctx.strokeStyle = color;
      ctx.lineWidth = 6; // 固定线宽
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 开始绘制路径
      ctx.beginPath();
      
      const { CONTAINER_HEIGHT_PX } = XiaoshiWeatherPadCard.TEMPERATURE_CONSTANTS;
      
      // 转换所有点为Canvas坐标
      const canvasPoints = points.map((point, index) => {
        const x = (point.x / 100) * canvas.width;
        const y = (point.y / CONTAINER_HEIGHT_PX) * canvas.height;
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
      const tension = 0.2; // 减小张力系数，避免过度弯曲
      
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

  _handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  firstUpdated() {
    this._drawTempCurve();
  }

  updated() {
    this._drawTempCurve();
  }

  _drawTempCurve() {
    const hourlyData = this.getHourlyWeatherData();
    if (!hourlyData || hourlyData.length === 0) return;

    const canvas = this.shadowRoot?.getElementById('temp-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // 设置canvas实际尺寸
    canvas.width = canvas.offsetWidth * 3;
    canvas.height = canvas.offsetHeight * 3;
    // canvas.style.width = canvas.offsetWidth + 'px';
    // canvas.style.height = canvas.offsetHeight + 'px';



    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const itemWidth = 160; // 140px + 20px gap
    const startX = (width - hourlyData.length * itemWidth) / 2 + 70;

    // 获取温度范围
    const temps = hourlyData.map(h => parseInt(h.temp) || 0);
    const minTemp = Math.min(...temps) - 2;
    const maxTemp = Math.max(...temps) + 2;
    const tempRange = maxTemp - minTemp || 1;

    // 绘制温度曲线
    ctx.strokeStyle = '#FFD54F';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    hourlyData.forEach((hour, index) => {
      const temp = parseInt(hour.temp) || 0;
      const x = startX + index * itemWidth;
      const y = height - ((temp - minTemp) / tempRange) * (height - 60) - 30;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // 绘制温度点
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    hourlyData.forEach((hour, index) => {
      const temp = parseInt(hour.temp) || 0;
      const x = startX + index * itemWidth;
      const y = height - ((temp - minTemp) / tempRange) * (height - 60) - 30;
      
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    });
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
        </div>
      </div>
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
        </div>
      </div>
    `;
  }

  _renderWindInfo(forecastDays) {
    const theme = this._evaluateTheme();
    const secondaryColor = 'rgb(110, 190, 240)';
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
        </div>
      </div>
    `;
  }

  _renderHourlyWindInfo(hourlyForecast) {
    const theme = this._evaluateTheme();
    const secondaryColor = 'rgb(110, 190, 240)';
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
        </div>
      </div>
    `;
  }

  _getWindDirectionIcon(bearing) {
    // 0是北风，按顺时针方向增加
    const directions = [
      { range: [337.5, 360], icon: '↑', name: '北' },    // 337.5-360度
      { range: [0, 22.5], icon: '↑', name: '北' },        // 0-22.5度
      { range: [22.5, 67.5], icon: '↗', name: '东北' },    // 22.5-67.5度
      { range: [67.5, 112.5], icon: '→', name: '东' },     // 67.5-112.5度
      { range: [112.5, 157.5], icon: '↘', name: '东南' },   // 112.5-157.5度
      { range: [157.5, 202.5], icon: '↓', name: '南' },     // 157.5-202.5度
      { range: [202.5, 247.5], icon: '↙', name: '西南' },   // 202.5-247.5度
      { range: [247.5, 292.5], icon: '←', name: '西' },     // 247.5-292.5度
      { range: [292.5, 337.5], icon: '↖', name: '西北' }    // 292.5-337.5度
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

    return direction ? direction.icon : '↓';
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

  // 鼠标滑动处理方法
  _handleMouseDown(e) {
    const container = e.target.closest('.forecast-container');
    const wrapper = e.target.closest('.forecast-container-wrapper');
    if (!container || !wrapper) return;
    
    this.isDragging = true;
    this.startX = e.pageX - wrapper.offsetLeft;
    this.scrollLeft = wrapper.scrollLeft || 0;
    this.scrollTarget = wrapper;
    container.style.cursor = 'grabbing';
    e.preventDefault();
  }

  _handleMouseUp(e) {
    this.isDragging = false;
    if (this.scrollTarget) {
      const container = this.scrollTarget.querySelector('.forecast-container');
      if (container) {
        container.style.cursor = 'grab';
      }
      this.scrollTarget = null;
    }
  }

  _handleMouseMove(e) {
    if (!this.isDragging || !this.scrollTarget) return;
    
    e.preventDefault();
    const x = e.pageX - this.scrollTarget.offsetLeft;
    const walk = (x - this.startX) * 1.5; // 调整滑动速度
    
    // 使用requestAnimationFrame优化性能
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.rafId = requestAnimationFrame(() => {
      if (this.scrollTarget) {
        this.scrollTarget.scrollLeft = this.scrollLeft - walk;
      }
    });
  }

  // 触摸滑动处理方法
  _handleTouchStart(e) {
    const container = e.target.closest('.forecast-container');
    const wrapper = e.target.closest('.forecast-container-wrapper');
    if (!container || !wrapper) return;
    
    this.startX = e.touches[0].pageX - wrapper.offsetLeft;
    this.scrollLeft = wrapper.scrollLeft || 0;
    this.scrollTarget = wrapper;
  }

  _handleTouchEnd(e) {
    this.scrollTarget = null;
  }

  _handleTouchMove(e) {
    if (!this.scrollTarget) return;
    
    e.preventDefault();
    const x = e.touches[0].pageX - this.scrollTarget.offsetLeft;
    const walk = (x - this.startX) * 1.5; // 调整滑动速度
    
    // 使用requestAnimationFrame优化性能
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.rafId = requestAnimationFrame(() => {
      if (this.scrollTarget) {
        this.scrollTarget.scrollLeft = this.scrollLeft - walk;
      }
    });
  }
}
customElements.define('xiaoshi-hourly-weather-card', XiaoshiHourlyWeatherCard);

class XiaoshiWarningWeatherCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      entity: { type: Object }
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .close-btn:hover {
        background-color: rgba(0, 0, 0, 0.1);
        color: rgba(255, 0, 0);
      }

      /*预警弹窗样式*/
      .warning-modal-content {
        border-radius: 12px;
        max-height: 80vh;
        overflow-y: auto;
        margin: 0 auto;
        color: white;
      }

      .warning-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-left: 25px;
        margin-right: 0px;
        height: 60px;
        font-size: 20px;
      }

      .warning-modal-header h3 {
        margin: 0;
        font-weight: bold;
        font-size: 20px;
      }

      .warning-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: rgba(255, 100, 0);
        margin-right: 10px;
        padding: 5px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .warning-close-btn:hover {
        background-color: rgba(0, 0, 0, 0.1);
        color: rgba(255, 0, 0);
      }

      .warning-item {
        background: rgba(127, 127, 127, 0.15);
        border-radius: 8px;
        padding: 15px;
        margin: 12px 20px;
        border-left: 4px solid #FFA726;
        transition: all 0.2s ease;
      }

      .warning-item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
      }

      .warning-title {
        font-weight: bold;
        font-size: 15px;
        flex: 1;
      }

      .warning-time {
        font-size: 12px;
        white-space: nowrap;
        margin-left: 10px;
      }

      .warning-text {
        font-size: 13px;
        line-height: 1.5;
      }

    `;
  }

  constructor() {
    super();
    this.isDragging = false;
    this.startX = 0;
    this.scrollLeft = 0;
    this.scrollTarget = null;
    this.rafId = null;
  }
  
  _evaluateTheme() {
    try {
      if (!this.config || !this.config.theme) return 'on';
      if (typeof this.config.theme === 'function') {
          return this.config.theme();
      }
      if (typeof this.config.theme === 'string') {
          // 处理Home Assistant模板语法 [[[ return theme() ]]]
          if (this.config.theme.includes('[[[') && this.config.theme.includes(']]]')) {
              // 提取模板中的JavaScript代码
              const match = this.config.theme.match(/\[\[\[\s*(.*?)\s*\]\]\]/);
              if (match && match[1]) {
                  const code = match[1].trim();
                  // 如果代码以return开头，直接执行
                  if (code.startsWith('return')) {
                      return (new Function(code))();
                  }
                  // 否则包装在return中执行
                  return (new Function(`return ${code}`))();
              }
          }
          // 处理直接的JavaScript函数字符串
          if (this.config.theme.includes('return') || this.config.theme.includes('=>')) {
              return (new Function(`return ${this.config.theme}`))();
          }
      }
      return this.config.theme;
    } catch(e) {
      console.error('计算主题时出错:', e);
      return 'on';
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // 处理通过属性传递的数据
    this._parseAttributeData();
    this._updateEntities();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('config') || changedProperties.has('hass')) {
      // 处理通过属性传递的数据
      this._parseAttributeData();
      this._updateEntities();
    }
  }

  _updateEntities() {
    if (!this.hass || !this.config) return;

    this.entity = this.hass.states[this.config.entity];
  }

  _parseAttributeData() {
    // 从hass-hass属性解析数据
    const hassAttr = this.getAttribute('hass-hass');
    if (hassAttr && !this.hass) {
      try {
        this.hass = JSON.parse(decodeURIComponent(hassAttr));
      } catch (e) {
        console.error('Failed to parse hass attribute:', e);
      }
    }

    // 从hass-config属性解析配置数据
    const configAttr = this.getAttribute('hass-config');
    if (configAttr && !this.config) {
      try {
        this.config = JSON.parse(decodeURIComponent(configAttr));
      } catch (e) {
        console.error('Failed to parse config attribute:', e);
      }
    }
  }

  _getWarningColorForLevel(level) {
    if (level == "红色") return "rgb(255,50,50)";
    if (level == "橙色") return "rgb(255,100,0)";
    if (level == "黄色") return "rgb(255,200,0)";
    if (level == "蓝色") return "rgb(50,150,200)";
    
    return "#FFA726"; // 默认颜色
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
    
    return this._getWarningColorForLevel(level);
  }

  _toggleWarningClose() {
    // 关闭小时天气弹窗
    if (window.browser_mod) {
      window.browser_mod.service('close_popup');
    } else {
      // 如果没有 browser_mod，尝试查找并关闭弹窗
      const modal = this.closest('.browser-mod-popup, .mdc-dialog, ha-dialog');
      if (modal) {
        modal.remove();
      }
    }
  }

  render() {
    if (!this.entity?.attributes?.warning || this.entity.attributes.warning.length === 0) {
      return html`
          <div class="warning-modal-content" >
            <div class="warning-modal-header">
              <h3>天气预警</h3>
              <button class="warning-close-btn" @click="${() => this._toggleWarningClose()}">×</button>
            </div>
            <div class="warning-modal-body">
              <p>暂无预警信息</p>
            </div>
          </div>
      `;
    }

    const warning = this.entity.attributes.warning;
    const theme = this._evaluateTheme();
    const warningColor = this._getWarningColor(warning); // 获取最高预警级别的颜色
    
    // 根据主题设置颜色
    const backgroundColor = theme === 'on' ? 'rgba(255, 255, 255)' : 'rgba(50, 50, 50)';
    const textColor = theme === 'on' ? 'rgba(0, 0, 0)' : 'rgba(250, 250, 250)';
    const secondaryTextColor = theme === 'on' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';

    return html`
        <div class="warning-modal-content" style="background-color: ${backgroundColor}; color: ${textColor};" >
          <div class="warning-modal-header">
            <h3 style="color: ${warningColor};">⚠ 天气预警 (${warning.length}条)</h3>
            <button class="warning-close-btn" @click="${() => this._toggleWarningClose()}">×</button>
          </div>
          <div class="warning-modal-body">
            ${warning.map((warningItem, index) => {
              const typeName = warningItem.typeName ?? "";
              const level = warningItem.level ?? "";
              const sender = warningItem.sender ?? "";
              const startTime = warningItem.startTime ? warningItem.startTime.slice(0, 16) : "";
              const endTime = warningItem.endTime ? warningItem.endTime.slice(0, 16) : "";
              const text = warningItem.text ?? "";
              
              // 获取当前预警项的颜色
              const itemWarningColor = this._getWarningColorForLevel(level);

              return html`
                <div class="warning-item" style="border-left-color: ${itemWarningColor};">
                  <div class="warning-item-header">
                    <div class="warning-title" style="color: ${itemWarningColor};">
                      ${sender}: 【${typeName}】${level}预警
                    </div>
                    <div class="warning-time" style="color: ${secondaryTextColor};">
                      ${startTime} ~ ${endTime}
                    </div>
                  </div>
                  <div class="warning-text" style="color: ${secondaryTextColor};">
                    ${text}
                  </div>
                </div>
              `;
            })}
          </div>
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

  // 鼠标滑动处理方法
  _handleMouseDown(e) {
    const container = e.target.closest('.forecast-container');
    const wrapper = e.target.closest('.forecast-container-wrapper');
    if (!container || !wrapper) return;
    
    this.isDragging = true;
    this.startX = e.pageX - wrapper.offsetLeft;
    this.scrollLeft = wrapper.scrollLeft || 0;
    this.scrollTarget = wrapper;
    container.style.cursor = 'grabbing';
    e.preventDefault();
  }

  _handleMouseUp(e) {
    this.isDragging = false;
    if (this.scrollTarget) {
      const container = this.scrollTarget.querySelector('.forecast-container');
      if (container) {
        container.style.cursor = 'grab';
      }
      this.scrollTarget = null;
    }
  }

  _handleMouseMove(e) {
    if (!this.isDragging || !this.scrollTarget) return;
    
    e.preventDefault();
    const x = e.pageX - this.scrollTarget.offsetLeft;
    const walk = (x - this.startX) * 1.5; // 调整滑动速度
    
    // 使用requestAnimationFrame优化性能
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.rafId = requestAnimationFrame(() => {
      if (this.scrollTarget) {
        this.scrollTarget.scrollLeft = this.scrollLeft - walk;
      }
    });
  }

  // 触摸滑动处理方法
  _handleTouchStart(e) {
    const container = e.target.closest('.forecast-container');
    const wrapper = e.target.closest('.forecast-container-wrapper');
    if (!container || !wrapper) return;
    
    this.startX = e.touches[0].pageX - wrapper.offsetLeft;
    this.scrollLeft = wrapper.scrollLeft || 0;
    this.scrollTarget = wrapper;
  }

  _handleTouchEnd(e) {
    this.scrollTarget = null;
  }

  _handleTouchMove(e) {
    if (!this.scrollTarget) return;
    
    e.preventDefault();
    const x = e.touches[0].pageX - this.scrollTarget.offsetLeft;
    const walk = (x - this.startX) * 1.5; // 调整滑动速度
    
    // 使用requestAnimationFrame优化性能
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.rafId = requestAnimationFrame(() => {
      if (this.scrollTarget) {
        this.scrollTarget.scrollLeft = this.scrollLeft - walk;
      }
    });
  }

}
customElements.define('xiaoshi-warning-weather-card', XiaoshiWarningWeatherCard);

class XiaoshiAqiWeatherCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      entity: { type: Object }
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .aqi-card {
        border-radius: 12px;
        max-height: 80vh;
        overflow-y: auto;
        margin: 0 auto;
        color: white;
      }

      .aqi-card.dark-theme {
        background: rgba(50, 50, 50);
      }

      .aqi-card.light-theme {
        background: rgba(255, 255, 255);
      }

      .aqi-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-left: 25px;
        margin-right: 0px;
        height: 60px;
        font-size: 20px;
      }

      .aqi-modal-header h3 {
        margin: 0;
        font-weight: bold;
        font-size: 20px;
      }    

      .aqi-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: rgba(255, 100, 0);
        margin-right: 10px;
        padding: 5px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .aqi-close-btn:hover {
        background-color: rgba(0, 0, 0, 0.1);
        color: rgba(255, 0, 0);
      }

      /* AQI总览 */
      .aqi-overview {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
        padding: 8px;
        border-radius: 12px;
      }

      .aqi-main-value {
        text-align: center;
      }

      .aqi-value {
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 4px;
      }

      .aqi-category {
        font-size: 18px;
        margin-top: 4px;
      }

      /* 污染物网格 */
      .pollutants-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .pollutant-item {
        text-align: center;
        padding: 8px;
        border-radius: 8px;
      }

      .pollutant-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 4px;
      }

      .pollutant-value {
        font-size: 14px;
      }
    `;
  }

  constructor() {
    super();
  }

  _evaluateTheme() {
    try {
      if (!this.config || !this.config.theme) return 'on';
      if (typeof this.config.theme === 'function') {
          return this.config.theme();
      }
      if (typeof this.config.theme === 'string') {
          // 处理Home Assistant模板语法 [[[ return theme() ]]]
          if (this.config.theme.includes('[[[') && this.config.theme.includes(']]]')) {
              // 提取模板中的JavaScript代码
              const match = this.config.theme.match(/\[\[\[\s*(.*?)\s*\]\]\]/);
              if (match && match[1]) {
                  const code = match[1].trim();
                  // 如果代码以return开头，直接执行
                  if (code.startsWith('return')) {
                      return (new Function(code))();
                  }
                  // 否则包装在return中执行
                  return (new Function(`return ${code}`))();
              }
          }
          // 处理直接的JavaScript函数字符串
          if (this.config.theme.includes('return') || this.config.theme.includes('=>')) {
              return (new Function(`return ${this.config.theme}`))();
          }
      }
      return this.config.theme;
    } catch(e) {
      console.error('计算主题时出错:', e);
      return 'on';
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // 处理通过属性传递的数据
    this._parseAttributeData();
    this._updateEntities();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('config') || changedProperties.has('hass')) {
      // 处理通过属性传递的数据
      this._parseAttributeData();
      this._updateEntities();
    }
  }

  _updateEntities() {
    if (!this.hass || !this.config) return;

    this.entity = this.hass.states[this.config.entity];
  }

  _parseAttributeData() {
    // 从hass-hass属性解析数据
    const hassAttr = this.getAttribute('hass-hass');
    if (hassAttr && !this.hass) {
      try {
        this.hass = JSON.parse(decodeURIComponent(hassAttr));
      } catch (e) {
        console.error('Failed to parse hass attribute:', e);
      }
    }

    // 从hass-config属性解析配置数据
    const configAttr = this.getAttribute('hass-config');
    if (configAttr && !this.config) {
      try {
        this.config = JSON.parse(decodeURIComponent(configAttr));
      } catch (e) {
        console.error('Failed to parse config attribute:', e);
      }
    }
  }

  _getAqiColor(category) {
    switch(category) {
      case '优': return '#4CAF50'; // 绿色
      case '良': return '#FFC107'; // 黄色
      case '轻度污染': return '#FF9800'; // 橙色
      case '中度污染': return '#FF5722'; // 深橙色
      case '重度污染': return '#F44336'; // 红色
      case '严重污染': return '#9C27B0'; // 紫色
      default: return '#9E9E9E'; // 灰色
    }
  }

  _toggleAqiClose() {
    // 关闭小时天气弹窗
    if (window.browser_mod) {
      window.browser_mod.service('close_popup');
    } else {
      // 如果没有 browser_mod，尝试查找并关闭弹窗
      const modal = this.closest('.browser-mod-popup, .mdc-dialog, ha-dialog');
      if (modal) {
        modal.remove();
      }
    }
  }

  render() {
    if (!this.hass || !this.config) return html``;
 
    this.entity = this.hass.states[this.config.entity];
    
    if (!this.entity || !this.entity.attributes?.aqi) {
      return html`<div class="aqi-card">暂无空气质量数据</div>`;
    }

    const aqi = this.entity.attributes.aqi;
    const theme = this._evaluateTheme();
    const isDark = theme === 'on';
    
    const textcolor = isDark ? 'rgba(0, 0, 0)' : 'rgba(255, 255, 255)';
    const themeClass = isDark ? 'light-theme' : 'dark-theme';
    
    // 获取AQI数值和等级
    const aqiValue = aqi.aqi || aqi.value || 0;
    const category = aqi.category || '未知';
    const level = aqi.level || '未知';
    const pm25 = aqi.pm2p5 || 0;
    const pm10 = aqi.pm10 || 0;
    const so2 = aqi.so2 || 0;
    const no2 = aqi.no2 || 0;
    const co = aqi.co || 0;
    const o3 = aqi.o3 || 0;
    
    const aqiColor = this._getAqiColor(category);

    return html`
      <div class="aqi-card ${themeClass}">
          <div class="aqi-modal-header">
            <h3 style="color: ${textcolor};">天气指数数据</h3>
            <button class="aqi-close-btn" @click="${() => this._toggleAqiClose()}">×</button>
          </div>
        <!-- AQI总览 -->
        <div class="aqi-overview">
          <div class="aqi-main-value">
            <div class="aqi-value" style="color: ${aqiColor};">${aqiValue}</div>
            <div class="aqi-category" style="color: ${aqiColor};">${category} (${level}级)</div>
          </div>
        </div>
        
        <!-- 污染物详情 -->
        <div class="pollutants-grid">
          <div class="pollutant-item">
            <div class="pollutant-name" style="color: ${textcolor};">PM2.5</div>
            <div class="pollutant-value" style="color: ${textcolor};">${pm25} μg/m³</div>
          </div>
          
          <div class="pollutant-item">
            <div class="pollutant-name" style="color: ${textcolor};">PM10</div>
            <div class="pollutant-value" style="color: ${textcolor};">${pm10} μg/m³</div>
          </div>
          
          <div class="pollutant-item">
            <div class="pollutant-name" style="color: ${textcolor};">SO₂</div>
            <div class="pollutant-value" style="color: ${textcolor};">${so2} μg/m³</div>
          </div>
          
          <div class="pollutant-item">
            <div class="pollutant-name" style="color: ${textcolor};">NO₂</div>
            <div class="pollutant-value" style="color: ${textcolor};">${no2} μg/m³</div>
          </div>
          
          <div class="pollutant-item">
            <div class="pollutant-name" style="color: ${textcolor};">CO</div>
            <div class="pollutant-value" style="color: ${textcolor};">${co} mg/m³</div>
          </div>
          
          <div class="pollutant-item">
            <div class="pollutant-name" style="color: ${textcolor};">O₃</div>
            <div class="pollutant-value" style="color: ${textcolor};">${o3} μg/m³</div>
          </div>
        </div>
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
    return 3;
  }
}
customElements.define('xiaoshi-aqi-weather-card', XiaoshiAqiWeatherCard);

class XiaoshiIndicesWeatherCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      entity: { type: Object }
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .indices-card {
        position: relative;
        font-family: sans-serif;
        overflow: hidden;
        border-radius: 12px;
        max-height: 80vh;
        margin: 0 auto;
        color: white;
      }

      .indices-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-left: 25px;
        margin-right: 0px;
        height: 60px;
        font-size: 20px;
      }

      .indices-modal-header h3 {
        margin: 0;
        font-weight: bold;
        font-size: 20px;
      }    

      .indices-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: rgba(255, 100, 0);
        margin-right: 10px;
        padding: 5px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .indices-close-btn:hover {
        background-color: rgba(0, 0, 0, 0.1);
        color: rgba(255, 0, 0);
      }

      /* 指数网格 */
      .indices-grid {
        padding: 0 16px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
      }

      .index-item {
        padding: 12px;
        border-radius: 8px;
      }

      .index-header {
        margin-bottom: 4px;
      }

      .index-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 2px;
      }

      .index-level {
        font-size: 12px;
      }

      .index-description {
        font-size: 10px;
        opacity: 0.8;
        line-height: 1.4;
      }
    `;
  }

  constructor() {
    super();
  }

  _evaluateTheme() {
    try {
      if (!this.config || !this.config.theme) return 'on';
      if (typeof this.config.theme === 'function') {
          return this.config.theme();
      }
      if (typeof this.config.theme === 'string') {
          // 处理Home Assistant模板语法 [[[ return theme() ]]]
          if (this.config.theme.includes('[[[') && this.config.theme.includes(']]]')) {
              // 提取模板中的JavaScript代码
              const match = this.config.theme.match(/\[\[\[\s*(.*?)\s*\]\]\]/);
              if (match && match[1]) {
                  const code = match[1].trim();
                  // 如果代码以return开头，直接执行
                  if (code.startsWith('return')) {
                      return (new Function(code))();
                  }
                  // 否则包装在return中执行
                  return (new Function(`return ${code}`))();
              }
          }
          // 处理直接的JavaScript函数字符串
          if (this.config.theme.includes('return') || this.config.theme.includes('=>')) {
              return (new Function(`return ${this.config.theme}`))();
          }
      }
      return this.config.theme;
    } catch(e) {
      console.error('计算主题时出错:', e);
      return 'on';
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // 处理通过属性传递的数据
    this._parseAttributeData();
    this._updateEntities();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('config') || changedProperties.has('hass')) {
      // 处理通过属性传递的数据
      this._parseAttributeData();
      this._updateEntities();
    }
  }

  _updateEntities() {
    if (!this.hass || !this.config) return;

    this.entity = this.hass.states[this.config.entity];
  }

  _parseAttributeData() {
    // 从hass-hass属性解析数据
    const hassAttr = this.getAttribute('hass-hass');
    if (hassAttr && !this.hass) {
      try {
        this.hass = JSON.parse(decodeURIComponent(hassAttr));
      } catch (e) {
        console.error('Failed to parse hass attribute:', e);
      }
    }

    // 从hass-config属性解析配置数据
    const configAttr = this.getAttribute('hass-config');
    if (configAttr && !this.config) {
      try {
        this.config = JSON.parse(decodeURIComponent(configAttr));
      } catch (e) {
        console.error('Failed to parse config attribute:', e);
      }
    }
  }

  _toggleIndicesClose() {
    // 关闭小时天气弹窗
    if (window.browser_mod) {
      window.browser_mod.service('close_popup');
    } else {
      // 如果没有 browser_mod，尝试查找并关闭弹窗
      const modal = this.closest('.browser-mod-popup, .mdc-dialog, ha-dialog');
      if (modal) {
        modal.remove();
      }
    }
  }

  render() {
    if (!this.hass || !this.config) return html``;
    
    this.entity = this.hass.states[this.config.entity];
    
    if (!this.entity || !this.entity.attributes?.air_indices) {
      return html`<div class="indices-card">暂无天气指数数据</div>`;
    }

    const indices = this.entity.attributes.air_indices;
    const theme = this._evaluateTheme();
    const isDark = theme === 'on';
    
    const textcolor = isDark ? 'rgba(0, 0, 0)' : 'rgba(255, 255, 255)';
    const textcolor2 = isDark ? 'rgba(23, 140, 5, 1)' : 'rgba(10, 231, 47, 1)';
    const backgroundColor = isDark ? 'rgba(255, 255, 255)' : 'rgba(50, 50, 50)';
    const backgroundColor2 = isDark ? 'rgba(50, 50, 50,0.1)' : 'rgba(255, 255, 255,0.1)';

    return html`
      <div class="indices-card" style="background: ${backgroundColor};">
          <div class="indices-modal-header">
            <h3 style="color: ${textcolor};">天气指数数据</h3>
            <button class="indices-close-btn" @click="${() => this._toggleIndicesClose()}">×</button>
          </div>

        <!-- 指数列表 -->
        <div class="indices-grid">
          ${indices.map(index => html`
            <div class="index-item" style="background: ${backgroundColor2};">
              <div class="index-header">
                <span class="index-name" style="color: ${textcolor2};">${index.name} </span>
                <span class="index-level" style="color: ${textcolor};">等级:${index.level} ${index.category}</span>
              </div>

              <div class="index-description" style="color: ${textcolor};">
                ${index.text}
              </div>
            </div>
          `)}
        </div>
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
    return 4;
  }
}
customElements.define('xiaoshi-indices-weather-card', XiaoshiIndicesWeatherCard);

window.customCards = window.customCards || [];
window.customCards.push(
  {
    type: "xiaoshi-weather-phone-card",
    name: "消逝天气卡片（手机端）",
    preview: true
  },
  {
    type: "xiaoshi-weather-pad-card",
    name: "消逝天气卡片（平板端）",
    preview: true
  }
);
