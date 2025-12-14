console.info("%c 天气卡片 \n%c   v 0.1   ", "color: red; font-weight: bold; background: black", "color: white; font-weight: bold; background: black");
import { LitElement, html, css } from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class XiaoshiWeatherPhoneCard extends LitElement {
  // 温度计算常量
  static get TEMPERATURE_CONSTANTS() {
    return {
      BUTTON_HEIGHT_VW: 3.4,        // 温度矩形高度（vw）
      CONTAINER_HEIGHT_VW: 25,       // 温度容器总高度（vw）
      FORECAST_COLUMNS: 10,          // 预报列数
      GRID_GAP_PX: 2                 // 网格间距（px）
    };
  }

  // 图标路径常量 - 方便调试修改
  static get ICON_PATH() {
    return '/qweather/icon';
  }

  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      entity: { type: Object },
      switchEntity: { type: Object },
      warningEntity: { type: Object },
      weatherTheme: { type: String },
      mode: { type: String },
      forecastMode: { type: String } // 'daily' 或 'hourly'
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        --card-primary-color: #03A9F4;
        --card-secondary-color: #0288D1;
        --text-primary-color: #FFFFFF;
        --text-secondary-color: #B3E5FC;
        --background-color: rgb(50, 50, 50);
        --border-radius: 3vw;
      }

      /*主卡片样式*/
      .weather-card {
        position: relative;
        background: var(--background-color);
        border-radius: var(--border-radius);
        padding: 8px;
        height: 58vw;
        color: var(--text-primary-color);
        font-family: sans-serif;
        overflow: hidden;
      }
      /*主卡片样式*/
      .weather-card.dark-theme {
        --background-color: #323232;
        --text-primary-color: #FFFFFF;
        --text-secondary-color: #DCDCDC;
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
        font-size: 2.0vw;
        color: var(--text-secondary-color);
        margin-bottom: 0px;
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
        font-size: 1.2vw;
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
        font-size: 1.8vw;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 3;
      }

      /*10日天气部分*/
      .forecast-container {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 4px;
        margin-top: 2vw;
        position: relative;
      }

      /*10日天气部分*/
      .forecast-day {
        grid-row: 1;
        text-align: center;
        position: relative;
        z-index: 2;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 1vw;
        position: relative;
      }

      /*10日天气部分 星期*/
      .forecast-weekday {
        font-size: 1.8vw;
        height: 2.8vw;
        margin-bottom: 0.2vw;
        font-weight: 500;
        white-space: nowrap;
      }
      
      /*10日天气部分 日期*/
      .forecast-date {
        font-size: 1.5vw;
        color: var(--text-secondary-color);
        margin-bottom: 2vw;
        height: 2vw;
        white-space: nowrap;
      }

      /*10日天气部分 温度区域*/
      .forecast-temp-container {
        position: relative;
        height: 25vw;
        margin-top: 0;
        margin-bottom: 0;
      }

      /*10日天气部分 温度区域*/
      .forecast-temp-null {
        position: relative;
        height: 2vw;
      }

      /*10日天气部分 雨量容器*/
      .forecast-rainfall-container {
        text-align: center;
        position: relative;
        z-index: 2;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 2.5vw;
        margin-top: -2vw;
        margin-bottom: 0;
      }

      /*10日天气部分 雨量标签*/
      .forecast-rainfall {
        background: rgba(80, 177, 200, 0.8);
        color: white;
        font-size: 1.4vw;
        font-weight: bold;
        height: 2.5vw;
        min-width: 80% ;
        border-radius: 1.2vw; /* 大圆角 */
        width: fit-content;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }

      /*雨量填充矩形*/
      .rainfall-fill {
        position: absolute;
        left: 0;
        right: 0;
        background: rgba(80, 177, 200, 0.8);
        border-radius: 0.5vw;
        z-index: 1;
        margin: 0 -1vw;
        bottom: -3vw;
        transition: all 0.3s ease;
      }

      /*10日天气部分 图标*/
      .forecast-icon-container {
        text-align: center;
        position: relative;
        z-index: 2;
      }

      /*10日天气部分 图标*/
      .forecast-icon {
        width: 5vw;
        height: 5vw;
        margin: 0px auto;
        margin-top: 0;
      }

      /*10日天气部分 图标*/
      .forecast-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      /*10日天气部分 风速*/
      .forecast-wind-container {
        grid-row: 4;
        text-align: center;
        position: relative;
        z-index: 2;
        height: 3vw;
        margin-top: -1vw;
      }

      /*10日天气部分 风速*/
      .forecast-wind {
        font-size: 1.6vw;
        color: var(--text-secondary-color);
        margin-top: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        height: 3vw;
      }

      /*10日天气部分 风速*/
      .wind-direction {
        font-size: 1.6vw;
      }

      /*10日天气部分 温度曲线 Canvas*/
      .temp-line-canvas {
        position: absolute;
        left: 0;
        width: 100%;
        pointer-events: none;
        z-index: 1;
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
        font-size: 1.8vw;
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
        font-size: 1.8vw;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 2;
      }


      .unavailable {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        font-size: 3vw;
        color: var(--text-secondary-color);
      }
    `;
  }

  constructor() {
    super();
    this.weatherTheme = 'light';
    this.mode = 'home';
    this.forecastMode = 'daily'; // 默认显示每日天气
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
    this.switchEntity = this.hass.states[this.config.switch] || { state: 'off' };
    this.warningEntity = this.hass.states[this.config.warning] || { state: 'off', attributes: { warning: '' } };
    this.weatherTheme = this.config.theme || 'light';
    this.mode = this.config.mode || 'home';
  }

  _getWeatherIcon(condition) {
    const sunState = this.hass?.states['sun.sun']?.state || 'above_horizon';
    const isDark = this.weatherTheme === 'dark';
    const iconPath = WeatherCardLit.ICON_PATH;
    
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
      'home': '🏠',
      'search': '🔍',
      'mobile': '📍'
    };
    return icons[this.mode] || '🏠';
  }

  _getWeekday(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }

  _getForecastDays() {
    if (!this.entity?.attributes?.daily_forecast) return [];
    return this.entity.attributes.daily_forecast.slice(0, 10);
  }

  _getHourlyForecast() {
    if (!this.entity?.attributes?.hourly_forecast) return [];
    return this.entity.attributes.hourly_forecast.slice(0, 10);
  }

  _toggleForecastMode(mode) {
    this.forecastMode = mode;
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
    const range = maxTemp - minTemp || 1; // 避免除以0

    return { minTemp, maxTemp, range };
  }

  _calculateTemperatureBounds(day, extremes) {
    const { minTemp, maxTemp, range } = extremes;
    const highTemp = parseFloat(day.native_temperature) || 0;
    const lowTemp = parseFloat(day.native_temp_low) || 0;
    
    // 使用常量
    const { BUTTON_HEIGHT_VW, CONTAINER_HEIGHT_VW } = WeatherCardLit.TEMPERATURE_CONSTANTS;
    
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
    
    const { BUTTON_HEIGHT_VW, FORECAST_COLUMNS } = WeatherCardLit.TEMPERATURE_CONSTANTS;
    
    let boundsList;
    if (this.forecastMode === 'daily') {
      // 每日天气使用现有的计算方法
      boundsList = forecastData.map(day => this._calculateTemperatureBounds(day, extremes));
    } else {
      // 小时天气只需要一个温度，简化计算
      const { minTemp, maxTemp, range } = extremes;
      const availableHeight = WeatherCardLit.TEMPERATURE_CONSTANTS.CONTAINER_HEIGHT_VW - BUTTON_HEIGHT_VW;
      const unitPosition = range === 0 ? 0 : availableHeight / range;
      
      boundsList = forecastData.map(hour => {
        const temp = parseFloat(hour.native_temperature) || 0;
        const topPosition = (maxTemp - temp) * unitPosition;
        return { highTop: topPosition, lowTop: topPosition };
      });
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
      curveTop = Math.min(...tops);
      curveBottom = Math.max(...tops) + BUTTON_HEIGHT_VW;
      curveHeight = curveBottom - curveTop;
    }
    
    const points = forecastData.map((data, index) => {
      const bounds = boundsList[index];
      const topPosition = this.forecastMode === 'daily' ? 
        (isHigh ? bounds.highTop : bounds.lowTop) : 
        bounds.highTop;
      
      // 计算相对于曲线顶部的Y坐标（vw单位），使用矩形中心
      const y = topPosition - curveTop + BUTTON_HEIGHT_VW / 1.7;
      
      // 计算X坐标（百分比）
      const x = (index * 100) / FORECAST_COLUMNS + (100 / FORECAST_COLUMNS) / 2;
      
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
      
      const { CONTAINER_HEIGHT_VW } = WeatherCardLit.TEMPERATURE_CONSTANTS;
      
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
      
      // 使用Cardinal样条算法生成控制点，确保曲线通过所有原始点
      const tension = 0.3; // 张力系数，控制曲线的平滑程度
      
      for (let i = 0; i < canvasPoints.length - 1; i++) {
        const p0 = canvasPoints[Math.max(0, i - 1)];
        const p1 = canvasPoints[i];
        const p2 = canvasPoints[i + 1];
        const p3 = canvasPoints[Math.min(canvasPoints.length - 1, i + 2)];
        
        // 计算控制点
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;
        
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

  render() {
    if (!this.entity || this.entity.state === 'unavailable') {
      return html`<div class="unavailable">天气信息不可用</div>`;
    }

    const temperature = this._formatTemperature(this.entity.attributes?.temperature);
    const humidity = this._formatTemperature(this.entity.attributes?.humidity);
    const condition = this.entity.attributes?.condition_cn || '未知';
    const windSpeed = this.entity.attributes?.wind_speed || 0;
    const city = this.entity.attributes?.city || '未知城市';
    const warning = this.warningEntity.attributes?.warning || '';
    const isDarkTheme = this.weatherTheme === 'dark';
    const showWarning = this.warningEntity.state === 'on' && warning;

    return html`
      <div class="weather-card ${isDarkTheme ? 'dark-theme' : ''}">
        <div class="main-content">
          <!-- 天气头部信息 -->
          <div class="weather-header">
            <div class="weather-left">
              <div class="weather-icon">
                <img src="${this._getWeatherIcon(condition)}" alt="${condition}">
              </div>
              <div class="weather-details">
                <div class="weather-temperature">
                  ${temperature}<font size="1vw"><b> ℃&emsp;&ensp;</b></font>
                  ${humidity}<font size="1vw"><b> % </b></font>
                </div>
                <div class="weather-info">${condition}   ${windSpeed} km/h</div>
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

          <!-- 天气预警 -->
          ${showWarning ? html`
            <div class="warning-section">
              <div class="warning-title">⚠️ 天气预警</div>
              <div class="warning-content">${warning}</div>
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
    
    const forecastDays = this._getForecastDays();
    const extremes = this._getTemperatureExtremes();
    
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
    
    return html`
      <div class="forecast-container">
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
            <div class="forecast-day">
              <!-- 星期（周X） -->
              <div class="forecast-weekday">${weekday}</div>
              
              <!-- 日期（mm月dd日） -->
              <div class="forecast-date">${dateStr}</div>
              
              <!-- 高温（橙色）和 低温（蓝色） -->
              <div class="forecast-temp-container">
                <div class="temp-curve-high" style="top: ${tempBounds.highTop}vw">
                  ${highTemp} °
                </div>
                <div class="temp-curve-low" style="top: ${tempBounds.lowTop}vw">
                  ${lowTemp} °
                </div>
                
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
    
    return html`
      <div class="forecast-container">
        <!-- 小时温度连接线 Canvas -->
        <canvas class="temp-line-canvas temp-line-canvas-high" id="hourly-temp-canvas-${this._getInstanceId()}"></canvas>
        
        ${hourlyForecast.map((hour, index) => {
          const timeStr = this._formatHourlyTime(hour.datetime);
          const dateStr = this._formatHourlyDate(hour.datetime);
          const temp = this._formatTemperature(hour.native_temperature);
          
          // 获取雨量信息
          const rainfall = parseFloat(hour.native_precipitation) || 0;
          
          // 计算温度位置（简化版）
          const { minTemp, maxTemp, range } = extremes;
          const availableHeight = WeatherCardLit.TEMPERATURE_CONSTANTS.CONTAINER_HEIGHT_VW - WeatherCardLit.TEMPERATURE_CONSTANTS.BUTTON_HEIGHT_VW;
          const unitPosition = range === 0 ? 0 : availableHeight / range;
          const tempValue = parseFloat(hour.native_temperature) || 0;
          const topPosition = (maxTemp - tempValue) * unitPosition;
          const finalTopPosition = Math.max(0, Math.min(topPosition, WeatherCardLit.TEMPERATURE_CONSTANTS.CONTAINER_HEIGHT_VW - WeatherCardLit.TEMPERATURE_CONSTANTS.BUTTON_HEIGHT_VW));
          
          // 计算雨量矩形高度和位置
          const RAINFALL_MAX = 20; // 最大雨量20mm
          const rainfallHeight = Math.min((rainfall / RAINFALL_MAX) * 25, 25);

          return html`
            <div class="forecast-day">
              <!-- 时间（hh:mm） -->
              <div class="forecast-weekday">${timeStr}</div>
              
              <!-- 日期（mm月dd日） -->
              <div class="forecast-date">${dateStr}</div>
              
              <!-- 温度（紫色） -->
              <div class="forecast-temp-container">
                <div class="temp-curve-hourly" style="top: ${finalTopPosition}vw">
                  ${temp} °
                </div>
                
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
            <div class="forecast-wind">
              <span class="wind-direction">${this._getWindDirectionIcon(windDirection)}</span>
              <span>${windSpeed}级</span>
            </div>
          </div>
        `;
      })}
    `;
  }

  _renderHourlyWindInfo(hourlyForecast) {
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
            <div class="forecast-wind">
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
