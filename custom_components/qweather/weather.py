"""
QWeather 天气实体模块
此模块实现 QWeather 插件的天气实体逻辑，包括数据更新、状态管理和预报功能。
"""
import logging
from datetime import datetime, timedelta
import homeassistant.util.dt as dt_util
import asyncio
import async_timeout
import aiohttp
import json
import re
import sys
import time
import logging
from dataclasses import dataclass, asdict
from pprint import pformat
from aiohttp import ClientConnectorError
from bs4 import BeautifulSoup
from requests import request
import voluptuous as vol
from aiohttp.client_exceptions import ClientConnectorError
from homeassistant.components import frontend
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.core import callback
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.weather import (
    ATTR_FORECAST_CONDITION,
    ATTR_FORECAST_NATIVE_PRECIPITATION,
    ATTR_FORECAST_NATIVE_TEMP,
    ATTR_FORECAST_NATIVE_TEMP_LOW,
    ATTR_FORECAST_NATIVE_WIND_SPEED,
    ATTR_FORECAST_NATIVE_PRESSURE,
    ATTR_FORECAST_PRECIPITATION_PROBABILITY,
    ATTR_FORECAST_TIME,
    ATTR_FORECAST_WIND_BEARING,
    Forecast,
    WeatherEntity,
    WeatherEntityFeature,
    ATTR_FORECAST_TIME,    
    ATTR_CONDITION_CLOUDY,
    ATTR_WEATHER_HUMIDITY,
    ATTR_FORECAST_WIND_BEARING,
    ATTR_FORECAST_PRESSURE,
    ATTR_FORECAST_PRECIPITATION,
    ATTR_FORECAST_TEMP,
    ATTR_FORECAST_TEMP_LOW,
    ATTR_FORECAST_WIND_SPEED,
)
from homeassistant.const import (
    CONF_HOST,
    CONF_API_KEY, 
    CONF_NAME,
    CONF_DEFAULT,
    CONF_LATITUDE, 
    CONF_LONGITUDE, 
    UnitOfLength,
    UnitOfPressure,    
    UnitOfSpeed,
    UnitOfTemperature,
    ATTR_ATTRIBUTION, 
)
from homeassistant.util import Throttle
import homeassistant.helpers.config_validation as cv
import homeassistant.util.dt as dt_util
from .const import (
    VERSION, 
    ROOT_PATH, 
    ATTRIBUTION,
    MANUFACTURER,
    DEFAULT_NAME,
    DOMAIN,
    
    CONF_STARTTIME,
    CONF_UPDATE_INTERVAL,
    CONF_ZONE_OR_DEVICE,
    CONF_NO_UPDATE_AT_NIGHT,
    ATTR_CONDITION_CN,
    ATTR_UPDATE_TIME,
    ATTR_AQI,
    ATTR_DAILY_FORECAST,
    ATTR_HOURLY_FORECAST,
    ATTR_FORECAST_PROBABLE_PRECIPITATION,
    CONDITION_CLASSES,
    )
    
from .condition import CONDITION_MAP, EXCEPTIONAL
_LOGGER = logging.getLogger(__name__)
# 设置日志级别为DEBUG，确保所有调试日志都能显示
_LOGGER.setLevel(logging.DEBUG)
DEFAULT_TIME = dt_util.now()
# 集成安装
async def async_setup_entry(hass, config_entry, async_add_entities):
    
    # 添加路由注册验证，避免重复注册
    try:
        await hass.http.async_register_static_paths([
            StaticPathConfig(ROOT_PATH, hass.config.path('custom_components/qweather/local'), False)
        ])
        _LOGGER.debug("静态路径注册成功")
    except RuntimeError as e:
        _LOGGER.debug(f"静态路径已注册，跳过: {str(e)}")
    
    # frontend.add_extra_js_url(hass, ROOT_PATH + '/qweather-card/qweather-card.js?ver=' + VERSION)
    # frontend.add_extra_js_url(hass, ROOT_PATH + '/qweather-card/qweather-more-info.js?ver=' + VERSION)
    name = config_entry.data.get(CONF_NAME)
    host = config_entry.data.get(CONF_HOST, "api.qweather.com")
    api_key = config_entry.data.get(CONF_API_KEY)
    unique_id = config_entry.unique_id
    
    # 新增选项：定位设备或搜索城市
    location_mode = config_entry.data.get("location_mode", "device")  # 默认为定位设备
    
    if location_mode == "城市搜索":
        # 搜索城市模式
        city = config_entry.data.get("城市搜索")
        if not city:
            return
        
        # 调用接口获取经纬度
        geo_url = f"https://{host}/geo/v2/city/lookup?location={city}&lang=zh&key={api_key}"
        session = async_get_clientsession(hass)
        try:
            async with async_timeout.timeout(10):
                response = await session.get(geo_url)
                if response.status != 200:
                    _LOGGER.error(f"获取城市经纬度失败: {response.status}")
                    return
                data = await response.json()
                if "location" not in data or len(data["location"]) == 0:
                    _LOGGER.error(f"未找到城市: {city}")
                    return
                longitude = data["location"][0]["lon"]
                latitude = data["location"][0]["lat"]
                location = f"{longitude},{latitude}"
        except Exception as e:
            _LOGGER.error(f"获取城市经纬度异常: {str(e)}")
            return
    else:
        # 定位设备模式
        zone_or_device = config_entry.data.get(CONF_ZONE_OR_DEVICE).split("(")[-1].split(")")[0].strip()
        if zone_or_device:
            entity_state = hass.states.get(zone_or_device)
            if entity_state:
                longitude = entity_state.attributes.get("longitude")
                latitude = entity_state.attributes.get("latitude")
                location = f"{longitude},{latitude}"
        else:
            # 使用默认配置的经纬度
            location = config_entry.data.get("location")
    
    # 优先从data中读取更新间隔值，因为这是用户最新设置的值
    if CONF_UPDATE_INTERVAL in config_entry.data:
        update_interval_minutes = int(config_entry.data.get(CONF_UPDATE_INTERVAL, 30))
        _LOGGER.debug(f"从data中读取的更新间隔时间: {update_interval_minutes} 分钟")
    else:
        # 如果data中没有，则从options中读取
        update_interval_minutes = config_entry.options.get(CONF_UPDATE_INTERVAL, 30)
        # 记录原始值和类型
        _LOGGER.debug(f"配置中的更新间隔原始值: {update_interval_minutes}, 类型: {type(update_interval_minutes)}")
        # 确保是整数
        update_interval_minutes = int(update_interval_minutes)
    starttime = config_entry.options.get(CONF_STARTTIME, 0)
    no_update_at_night = config_entry.options.get(CONF_NO_UPDATE_AT_NIGHT, False)
    _LOGGER.debug(f"从配置中读取的更新间隔时间: {update_interval_minutes} 分钟")
    config = {}
    config[CONF_API_KEY] = api_key
    
    # 如果是城市搜索模式，将城市名称添加到配置中
    if location_mode == "城市搜索":
        config["城市搜索"] = config_entry.data.get("城市搜索")
        config["location_mode"] = "城市搜索"
    
    # 保存更新间隔到hass.data中，供WeatherData类使用
    if DOMAIN not in hass.data:
        hass.data[DOMAIN] = {}
    if unique_id not in hass.data[DOMAIN]:
        hass.data[DOMAIN][unique_id] = {}
    hass.data[DOMAIN][unique_id]['update_interval'] = update_interval_minutes
  
    data = WeatherData(hass, name, unique_id, host, config, api_key, location, starttime, zone_or_device if location_mode == "选择设备" else None, update_interval_minutes)
    await data.async_update(dt_util.now())
    
    # 创建自定义更新函数，处理夜间不更新的逻辑
    async def custom_update(now):
        # 如果启用了夜间不更新选项，检查当前时间是否在夜间范围内（22:00-04:00）
        if no_update_at_night:
            current_hour = now.hour
            if 22 <= current_hour or current_hour < 4:
                _LOGGER.debug('[%s]夜间时段（22:00-04:00）不更新数据', name)
                return
        
        # 正常更新数据
        await data.async_update(now)
    
    # 注册定时更新
    async_track_time_interval(hass, custom_update, timedelta(minutes=update_interval_minutes))
    _LOGGER.debug('[%s]刷新间隔时间: %s 分钟，夜间不更新: %s', name, update_interval_minutes, no_update_at_night)
    
    if data._current:  # 检查是否有有效数据
        async_add_entities([HeFengWeather(data, unique_id, name)], True)
        _LOGGER.info(f"成功添加天气实体: {name}")
    else:
        _LOGGER.error("未能获取有效天气数据，无法创建实体")

class HeFengWeather(WeatherEntity):
    """Representation of a weather condition."""
    def __init__(self, data, unique_id, name):
        """Initialize the  weather."""
        self._name = name
        self._unique_id = unique_id
        self._condition = None
        self._condition_cn = None
        self._icon = None
        self._native_temperature = None
        self._data = data
        self._city = None
        self._update_listener = None
        self._humidity = None
        self._native_pressure = None
        self._native_wind_speed = None
        self._wind_bearing = None
        self._forecast = None
        self._data = data
        self._updatetime = None
        self._aqi = None
        self._winddir = None
        self._windscale = None
        self._daily_forecast = None
        self._hourly_forecast = None
        self._daily_twice_forecast = None
        self._feelslike = None
        self._cloud = None
        self._dew = None
        self._weather_warning = []
        self._attr_native_precipitation_unit = UnitOfLength.MILLIMETERS
        self._attr_native_pressure_unit = UnitOfPressure.HPA
        self._attr_native_temperature_unit = UnitOfTemperature.CELSIUS
        self._attr_native_visibility_unit = UnitOfLength.KILOMETERS
        self._attr_native_wind_speed_unit = UnitOfSpeed.KILOMETERS_PER_HOUR
        
        self._forecast_daily = list[list] | None
        self._forecast_hourly = list[list] | None
        self._forecast_twice_daily = list[list] | None
        self._attr_supported_features = 0
        if self._forecast_daily:
            self._attr_supported_features |= WeatherEntityFeature.FORECAST_DAILY
        if self._forecast_hourly:
            self._attr_supported_features |= WeatherEntityFeature.FORECAST_HOURLY
        if self._forecast_twice_daily:
            self._attr_supported_features |= WeatherEntityFeature.FORECAST_TWICE_DAILY
    @property
    def name(self):
        """Return the name of the sensor."""
        return self._name
        
    @property
    def unique_id(self):
        """Return a unique_id for this entity."""
        if self._unique_id:
            return f"{DOMAIN}_{self._unique_id}"
        # 如果没有提供unique_id，则使用名称作为备选
        return f"{DOMAIN}_{self._name}"
        
    @property
    def device_info(self):
        """Return the device info."""
        from homeassistant.helpers.device_registry import DeviceEntryType
        return {
            "identifiers": {(DOMAIN, self._unique_id)},
            "name": self.name,
            "manufacturer": MANUFACTURER,
            "model": "和风天气API",
            "entry_type": DeviceEntryType.SERVICE,
            "sw_version": VERSION
        }
    @property
    def registry_name(self):
        """返回实体的friendly_name属性."""
        return '{} {}'.format('和风天气', self._name)
    @property
    def should_poll(self):
        """attention No polling needed for a demo weather condition."""
        return True
    @property
    def native_temperature(self):
        """Return the temperature."""
        return self._native_temperature
    @property
    def humidity(self):
        """Return the humidity."""
        return self._humidity
    @property
    def wind_bearing(self):
        """Return the wind speed."""
        return self._wind_bearing
    @property
    def native_wind_speed(self):
        """Return the wind speed."""
        return self._native_wind_speed
    @property
    def native_pressure(self):
        """Return the pressure."""
        return self._native_pressure
    @property
    def condition(self):
        """Return the weather condition."""
        return self._condition
    @property
    def attribution(self):
        """Return the attribution."""
        return ATTRIBUTION
        
        
    async def async_forecast_daily(self) -> list[Forecast]:
        """Return the daily forecast."""
        if not self._daily_forecast:
            return None
            
        forecast_data = []
        for forecast in self._daily_forecast:
            forecast_dict = {
                ATTR_FORECAST_TIME: forecast.datetime,
                ATTR_FORECAST_NATIVE_TEMP: forecast.native_temperature,
                ATTR_FORECAST_NATIVE_TEMP_LOW: forecast.native_temp_low,
                ATTR_FORECAST_CONDITION: forecast.condition,
                ATTR_FORECAST_NATIVE_PRECIPITATION: forecast.native_precipitation,
                ATTR_FORECAST_NATIVE_WIND_SPEED: forecast.native_wind_speed,
                ATTR_FORECAST_WIND_BEARING: forecast.wind_bearing,
                ATTR_FORECAST_PRECIPITATION_PROBABILITY: None, 
                # 添加其他需要显示的属性
                "text": forecast.text,
                "icon": forecast.icon,
                "textnight": forecast.textnight,
                "winddirday": forecast.winddirday,
                "winddirnight": forecast.winddirnight,
                "windscaleday": forecast.windscaleday,
                "windscalenight": forecast.windscalenight,
                "iconnight": forecast.iconnight
            }
            forecast_data.append(forecast_dict)
        
        #_LOGGER.debug('转换后的每日预报数据: %s', forecast_data)
        return forecast_data
    async def async_forecast_hourly(self) -> list[Forecast]:
        """Return the hourly forecast."""
        if not self._hourly_forecast:
            return None
            
        forecast_data = []
        for forecast in self._hourly_forecast:
            forecast_dict = {
                ATTR_FORECAST_TIME: forecast.datetime,
                ATTR_FORECAST_NATIVE_TEMP: forecast.native_temperature,
                ATTR_FORECAST_CONDITION: forecast.condition,
                ATTR_FORECAST_NATIVE_PRECIPITATION: forecast.native_precipitation,
                ATTR_FORECAST_NATIVE_WIND_SPEED: forecast.native_wind_speed,
                ATTR_FORECAST_WIND_BEARING: forecast.wind_bearing,
                ATTR_FORECAST_PRECIPITATION_PROBABILITY: forecast.probable_precipitation,
                # 添加其他属性
                "text": forecast.text,
                "icon": forecast.icon,
                "humidity": forecast.humidity
            }
            forecast_data.append(forecast_dict)
        
        return forecast_data
    async def async_added_to_hass(self):
        """当实体被添加到 Home Assistant 时调用。"""
        pass

    async def async_forecast_twice_daily(self) -> list[Forecast]:
        """Return the twice daily forecast."""
        if not self._daily_twice_forecast:
            return None
            
        forecast_data = []
        for forecast in self._daily_twice_forecast:
            forecast_dict = {
                ATTR_FORECAST_TIME: forecast.datetime,
                ATTR_FORECAST_NATIVE_TEMP: forecast.native_temperature if forecast.is_daytime else None,
                ATTR_FORECAST_NATIVE_TEMP_LOW: None if forecast.is_daytime else forecast.native_temp_low,
                ATTR_FORECAST_CONDITION: forecast.condition,
                "is_daytime": forecast.is_daytime
            }
            forecast_data.append(forecast_dict)
        
        return forecast_data
    @property
    def state_attributes(self):
        attributes = super().state_attributes
        if self._condition is not None:
            # 转换数据类实例为字典 实体属性
            daily_forecast = [asdict(item) for item in self._daily_forecast] if self._daily_forecast else []
            hourly_forecast = [asdict(item) for item in self._hourly_forecast] if self._hourly_forecast else []
            weather_warning = [asdict(item) for item in self._weather_warning] if self._weather_warning else []
            
            attributes.update({
                "city": self._city,
                "qweather_icon": self._icon,
                ATTR_UPDATE_TIME: self._updatetime,
                ATTR_CONDITION_CN: self._condition_cn,
                ATTR_AQI: self._aqi,
                ATTR_DAILY_FORECAST: daily_forecast,
                ATTR_HOURLY_FORECAST: hourly_forecast,
                "warning": weather_warning,
                "winddir": self._winddir,
                "windscale": self._windscale,
                "sunrise": self._sun_data.get("sunrise", ""),
                "sunset": self._sun_data.get("sunset", ""),
                "feelslike": self._feelslike,
                "cloud": self._cloud,
                "dew": self._dew,
            })
        return attributes
        
        # 设置定时更新
    async def update_forecasts(self, _: datetime) -> None:
        if self._forecast_daily:
            self._forecast_daily = (
                self._forecast_daily[1:] + self._forecast_daily[:1]
            )
        if self._forecast_hourly:
            self._forecast_hourly = (
                self._forecast_hourly[1:] + self._forecast_hourly[:1]
            )
        if self._forecast_twice_daily:
            self._forecast_twice_daily = (
                self._forecast_twice_daily[1:] + self._forecast_twice_daily[:1]
            )
        await self.async_update_listeners(None)
      
    async def async_update(self, **kwargs):
        force_update = kwargs.get('force_update', False)
        if force_update or not hasattr(self, '_last_update') or \
           (dt_util.now() - self._last_update).total_seconds() > self._data._update_interval_minutes * 60:
            self._condition = self._data._condition
            self._condition_cn = self._data._condition_cn
            self._native_temperature = self._data._native_temperature
            self._humidity = self._data._humidity
            self._native_pressure = self._data._native_pressure
            self._native_wind_speed = self._data._native_wind_speed
            self._wind_bearing = self._data._wind_bearing
            self._daily_forecast = self._data._daily_forecast
            self._hourly_forecast = self._data._hourly_forecast
            self._daily_twice_forecast = self._data._daily_twice_forecast
            self._aqi = self._data._aqi
            self._winddir = self._data._winddir
            self._windscale = self._data._windscale
            self._weather_warning = self._data._weather_warning
            self._sun_data = self._data._sun_data
            self._city = self._data._city
            self._icon = self._data._icon
            self._feelslike = self._data._feelslike
            self._cloud = self._data._cloud
            self._dew = self._data._dew
            self._updatetime = self._data._refreshtime

@dataclass
class Forecast:
    datetime: str
    native_temperature: float = None
    native_temp_low: float = None
    condition: str = None
    text: str = None
    icon: str = None
    wind_bearing: float = None
    native_wind_speed: float = None
    native_precipitation: float = None
    humidity: float = None
    native_pressure: float = None
    cloud: int = None
    textnight: str = None
    winddirday: str = None
    winddirnight: str = None
    windscaleday: str = None
    windscalenight: str = None
    iconnight: str = None
    is_daytime: bool = False

@dataclass
class HourlyForecast:
    datetime: str
    native_temperature: int = None
    condition: str = None
    text: str = None
    icon: str = None
    wind_bearing: int = None
    native_wind_speed: int = None
    native_precipitation: int = None
    humidity: int = None
    probable_precipitation: int = None
    native_pressure: int = None
    cloud: int = None

@dataclass
class WarningData:
    pubTime: str
    startTime: str
    endTime: str
    sender: str
    title: str
    text: str
    severity: str
    severityColor: str
    level: str
    typeName: str

class WeatherData(object):
    """天气相关的数据，存储在这个类中."""
    def __init__(self, hass, name, unique_id, host, config, usetoken, location , starttime, zone_or_device=None, update_interval_minutes=60):
        super().__init__()
        """初始化函数."""
        self.hass = hass
        self._name = name
        self._condition = None
        self._condition_cn = None
        self._icon = None
        self._native_temperature = None
        self._humidity = None
        self._native_pressure = None
        self._native_wind_speed = None
        self._wind_bearing = None
        self._forecast = None
        self._updatetime = None
        self._daily_forecast = None
        self._hourly_forecast = None
        self._aqi = None 
        self._winddir = None
        self._windscale = None
        self._weather_warning = None
        self._city = None
        self._feelslike = None
        self._cloud = None
        self._dew = None
             
        self._unique_id = unique_id
        self._host = host
        self._config = config
        self._zone_or_device = zone_or_device
        self._starttime = starttime
        self._location = location
        self._current: dict = {}
        self._daily_data: list[dict] = []
        self._hourly_data: list[dict] = []
        self._warning_data: list[dict] = []
        self._air_data = []
        self._update_interval_minutes = update_interval_minutes
        self._sun_data = {} 
        self._fxlink = ""
        self._sundate = None
        today = datetime.now()        
        self._todaydate = today.strftime("%Y%m%d")
        
        # 初始化 API URL
        self._update_api_urls()
        self._update_time = None
        self._refreshtime = None
        
        self._pubtime = None
        self._updatetime_now = 0 
        self._updatetime_daily = 0 
        self._updatetime_air = 0 
        self._updatetime_hourly = 0 
        self._updatetime_warning = 0
        self._updatetime_sun = 0 
        self._responsecode = None
        
    def _update_api_urls(self):
        """更新所有 API URL"""
        self.geo_url = f"https://{self._host}/geo/v2/city/lookup?location={self._location}&lang=zh"
        self.now_url = f"https://{self._host}/v7/weather/now?location={self._location}&lang=zh"
        self.daily_url = f"https://{self._host}/v7/weather/10d?location={self._location}&lang=zh"
        self.air_url = f"https://{self._host}/v7/air/now?location={self._location}&lang=zh"
        self.hourly_url = f"https://{self._host}/v7/weather/24h?location={self._location}&lang=zh"
        self.warning_url = f"https://{self._host}/v7/warning/now?location={self._location}&lang=zh"
        self.sun_url = f"https://{self._host}/v7/astronomy/sun?location={self._location}&date={self._todaydate}&lang=zh"
        _LOGGER.debug(f"API URL 已更新为位置: {self._location}") 
    @property
    def name(self):
        """Return the name of the sensor."""
        return self._name
    @property
    def condition(self):
        """Return the current condition."""
        return CONDITION_MAP.get(self._current.get("icon"), EXCEPTIONAL)
        
    def validate_location(location):
        if not isinstance(location, str):
            return False
        
        # 检查是否为 zone 或 device_tracker 设备的 ID
        if location.startswith("zone.") or location.startswith("device_tracker."):
            device_state = self.hass.states.get(location)
            if device_state is not None:
                latitude = device_state.attributes.get("latitude")
                longitude = device_state.attributes.get("longitude")
                if latitude is not None and longitude is not None:
                    return f"{longitude},{latitude}"
            # 获取设备的经纬度属性
            device_attrs = hass.states.get(location)
            if device_attrs is None:
                _LOGGER.error(f"设备 {location} 不存在")
                return False
            
            longitude = device_attrs.attributes.get("longitude")
            latitude = device_attrs.attributes.get("latitude")
            
            if longitude is None or latitude is None:
                _LOGGER.error(f"设备 {location} 缺少经纬度属性")
                return False
            
            return True
        
        # 检查是否为传统坐标格式
        pattern = r"^-?\d+\.\d{1,2},^-?\d+\.\d{1,2}$"  # 允许负数坐标，小数点后1-2位
        match = re.match(pattern, location)
        if match:
            try:
                longitude, latitude = map(float, location.split(','))
                return True
            except ValueError:
                return False
        else:
            return False
            
    async def async_update(self, now, force_update=False):
        """获取天气数据"""
        _LOGGER.info("获取天气数据")
        # 如果是设备模式，每次更新时重新获取设备的经纬度并更新 API URL 
        if self._zone_or_device:
            entity_state = self.hass.states.get(self._zone_or_device)
            if entity_state:
                longitude = entity_state.attributes.get("longitude")
                latitude = entity_state.attributes.get("latitude")
                if longitude is not None and latitude is not None:
                    old_location = self._location
                    self._location = f"{longitude},{latitude}"
                    _LOGGER.debug(f"更新设备位置: 从 {old_location} 更新为 {self._location}")
                    
                    # 更新所有 API URL
                    self._update_api_urls()
                    
                else:
                    _LOGGER.error(f"设备 {self._zone_or_device} 缺少经纬度属性")
            else:
                _LOGGER.error(f"设备 {self._zone_or_device} 不存在")   

        # 如果是城市搜索模式，检查配置中是否有城市更新
        elif "城市搜索" in self._config and self._config.get("location_mode") == "城市搜索":
            city = self._config.get("城市搜索")
            _LOGGER.debug(f"城市搜索模式，当前城市: {city}")
            if city:
                # 调用接口获取经纬度
                geo_url = f"https://{self._host}/geo/v2/city/lookup?location={city}&lang=zh&key={self._config.get(CONF_API_KEY)}"
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(geo_url) as response:
                            if response.status == 200:
                                data = await response.json()
                                if "location" in data and len(data["location"]) > 0:
                                    longitude = data["location"][0]["lon"]
                                    latitude = data["location"][0]["lat"]
                                    new_location = f"{longitude},{latitude}"
                                    
                                    # 更新城市名称
                                    self._city = city
                                    
                                    # 如果位置有变化，更新位置和API URL
                                    if new_location != self._location:
                                        self._location = new_location
                                        _LOGGER.debug(f"更新城市位置: {self._location}")
                                        
                                        # 更新所有 API URL
                                        self._update_api_urls()
                                        
                                        # 强制更新数据
                                        force_update = True
                                    else:
                                        _LOGGER.debug(f"城市位置未变化: {self._location}")
                except Exception as e:
                    _LOGGER.error(f"获取城市经纬度异常: {str(e)}")
        _LOGGER.debug(f"设置HTTP连接参数")
        # 设置HTTP连接参数
        timeout = aiohttp.ClientTimeout(total=10)
        connector = aiohttp.TCPConnector(limit=80, force_close=True)
        
        # 统一管理更新间隔，使用用户配置的更新间隔
        min_intervals = {
            'warning': self._update_interval_minutes * 60,
            'now': self._update_interval_minutes * 60,
            'daily': self._update_interval_minutes * 60,
            'air': self._update_interval_minutes * 60,
            'hourly': self._update_interval_minutes * 60,
            'geo': self._update_interval_minutes * 60,
            'sun': self._update_interval_minutes * 60,
        }
         
        if self._responsecode == '402':
            min_intervals = {k: 7200 for k in min_intervals}
        
        # 设置请求头
        self.headers = {"X-QW-Api-Key": self._config.get(CONF_API_KEY)}
        
        _LOGGER.debug("设置请求头headers: %s", self.headers)
        
        # 创建异步任务列表
        current_time = int(datetime.now().timestamp())
        
        async def fetch_data(url, update_attr, data_attr, min_interval, json_key=None, force_update=False):
            last_update = getattr(self, update_attr, 0) or 0
            # 检查是否需要更新，如果是强制更新则跳过时间间隔检查
            _LOGGER.debug(f"上次更新时间: {last_update}, 当前时间: {current_time}, 最小间隔: {min_interval}")
            if not force_update and current_time - last_update < min_interval:
                _LOGGER.debug(f"跳过更新 {data_attr}：时间间隔不足 ({current_time - last_update} < {min_interval})")
                return False
            
            try:
                async with session.get(url) as response:
                    response.raise_for_status()
                    json_data = await response.json()
                    if url == self.now_url and 'code' in json_data:
                        self._responsecode = json_data.get("code")
                    
                    if json_key:
                        data = json_data.get(json_key)
                        if data is None:
                            if json_key == 'now' and 'now' in json_data:
                                data = json_data['now']
                            elif json_key == 'daily' and 'daily' in json_data:
                                data = json_data['daily']
                            else:
                                data = json_data
                    else:
                        data = json_data
                    
                    if data is not None:
                        setattr(self, data_attr, data)
                        setattr(self, update_attr, current_time)
                        _LOGGER.info(f"成功访问API: {url}")
                        return True
            except (aiohttp.ClientError, ValueError) as e:
                _LOGGER.warning("API请求失败 (%s): %s", url, str(e))
            return False
        
        async with aiohttp.ClientSession(
            connector=connector, 
            timeout=timeout, 
            headers=self.headers
        ) as session:
            tasks = []
            tasks.append(fetch_data(self.now_url, '_updatetime_now', '_current', min_intervals['now'], 'now', force_update))
            tasks.append(fetch_data(self.daily_url, '_updatetime_daily', '_daily_data', min_intervals['daily'], 'daily', force_update))
            tasks.append(fetch_data(self.air_url, '_updatetime_air', '_air_data', min_intervals['air'], 'now', force_update))
            tasks.append(fetch_data(self.hourly_url, '_updatetime_hourly', '_hourly_data', min_intervals['hourly'], 'hourly', force_update))
            tasks.append(fetch_data(self.warning_url, '_updatetime_warning', '_warning_data', min_intervals['warning'], 'warning', force_update))
            tasks.append(fetch_data(self.geo_url, '_updatetime_geo', '_geo_data', min_intervals['geo'], 'geo', force_update))
            tasks.append(fetch_data(self.sun_url, '_updatetime_sun', '_sun_data', min_intervals['sun'], 'sun', force_update))

            # 执行所有任务
            results = await asyncio.gather(*tasks)
            _LOGGER.debug("API更新结果: %s", results)
            
            # 单独处理日出日落数据
            if self._sundate != self._todaydate:
                try:
                    async with session.get(self.sun_url) as response:
                        sun_data = await response.json()
                        if 'daily' in sun_data and sun_data['daily']:
                            first_day = sun_data['daily'][0]
                            self._sun_data = {
                                'sunrise': first_day.get('sunrise', ''),
                                'sunset': first_day.get('sunset', '')
                            }
                            self._fxlink = sun_data.get("fxLink", "")
                        else:
                            self._sun_data = sun_data
                            self._fxlink = sun_data.get("fxLink", "")
                        self._sundate = self._todaydate
                except (aiohttp.ClientError, ValueError) as e:
                    _LOGGER.warning("日出日落API请求失败: %s", str(e))
                        
            
            # 单独处理城市信息 - 任何情况都更新
            if True:  # 原条件: if not self._city:
                try:
                    async with session.get(self.geo_url) as response:
                        geo_data = await response.json()
                        if 'location' in geo_data and geo_data['location']:
                            city1 = geo_data['location'][0].get("adm2", "城市")
                            city2 = geo_data['location'][0].get("name", "区域")
                            country = geo_data['location'][0].get("country", "国家")
                            if country == "中国":
                                self._city = f"{city1}-{city2}"
                            else:
                                self._city = f"{country}-{city2}"
                            
                            _LOGGER.info("[%s]天气所在城市：%s", self._name, self._city)
                        else:
                            self._city = "未知"
                except (aiohttp.ClientError, ValueError, IndexError, KeyError) as e:
                    _LOGGER.warning("城市信息API请求失败: %s", str(e))
                    self._city = "未知"
        
        if isinstance(self._current, dict):
            # 标准处理
            self._icon = self._current.get("icon", "")
            self._native_temperature = float(self._current.get("temp", 0))
            self._humidity = int(self._current.get("humidity", 0))
            self._condition = CONDITION_MAP.get(self._current.get("icon", ""), EXCEPTIONAL)
            self._condition_cn = self._current.get("text", "")
            self._native_pressure = int(self._current.get("pressure", 0))
            self._native_wind_speed = float(self._current.get("windSpeed", 0))
            self._wind_bearing = float(self._current.get("wind360", 0))
            self._winddir = self._current.get("windDir", "")
            self._windscale = self._current.get("windScale", "")
            self._textnight = self._current.get("textNight", "")
            self._winddirday = self._current.get("windDirday", "")
            self._winddirnight = self._current.get("windDirNight", "")
            self._windscaleday = self._current.get("windScaleDay", "")
            self._windscalenight = self._current.get("windScaleNight", "")
            self._iconnight = self._current.get("iconNight", "")
            self._feelslike = float(self._current.get("feelsLike", 0))
            self._cloud = self._current.get("cloud", "")
            self._dew = self._current.get("dew","")
            
        else:
            _LOGGER.error("实时天气数据格式不正确")
        
        # 处理更新时间
        if self._update_time:
            try:
                date_obj = datetime.fromisoformat(self._update_time.replace('Z', '+00:00'))
                self._updatetime = date_obj.strftime('%Y-%m-%d %H:%M')
            except ValueError:
                self._updatetime = "格式错误"
        else:
            self._updatetime = "未知"
        
        self._refreshtime = dt_util.as_local(now).strftime('%Y-%m-%d %H:%M')
        
        # 修复：正确处理空气质量数据结构
        if isinstance(self._air_data, dict):
            self._aqi = self._air_data
        elif isinstance(self._air_data, list) and self._air_data:
            self._aqi = self._air_data[0]
        else:
            self._aqi = {}
            _LOGGER.warning("空气质量数据结构异常")
        
        # 处理每日预报
        self._daily_forecast = []
        if self._daily_data:
            if isinstance(self._daily_data, dict) and 'daily' in self._daily_data:
                daily_list = self._daily_data['daily']
            elif isinstance(self._daily_data, list):
                daily_list = self._daily_data
            else:
                daily_list = []
                _LOGGER.warning("每日预报数据结构异常")
            
            for daily in daily_list:
                self._daily_forecast.append(Forecast(
                    datetime=daily.get("fxDate", ""),
                    native_temperature=float(daily.get("tempMax", 0)),
                    native_temp_low=float(daily.get("tempMin", 0)),
                    condition=CONDITION_MAP.get(daily.get("iconDay", ""), EXCEPTIONAL),
                    text=daily.get("textDay", ""),
                    icon=daily.get("iconDay", ""),
                    wind_bearing=float(daily.get("wind360Day", 0)),
                    native_wind_speed=float(daily.get("windSpeedDay", 0)),
                    native_precipitation=float(daily.get("precip", 0)),
                    humidity=float(daily.get("humidity", 0)),
                    native_pressure=float(daily.get("pressure", 0)),
                    textnight=daily.get("textNight", ""),
                    winddirday=daily.get("windDirDay", ""),
                    winddirnight=daily.get("windDirNight", ""),
                    windscaleday=daily.get("windScaleDay", ""),
                    windscalenight=daily.get("windScaleNight", ""),
                    iconnight=daily.get("iconNight", ""),
                    cloud=daily.get("cloud", ""),
                ))
        
        # 处理小时预报
        self._hourly_forecast = []        
        if self._hourly_data:
            # 修复：确保_hourly_data是列表
            hourly_list = self._hourly_data
            if isinstance(self._hourly_data, dict) and 'hourly' in self._hourly_data:
                hourly_list = self._hourly_data['hourly']
            
            for hourly in hourly_list:
                try:
                    date_obj = datetime.fromisoformat(hourly.get("fxTime", "").replace('Z', '+00:00'))
                    date_obj = dt_util.as_local(date_obj)
                    time_str = date_obj.strftime('%Y-%m-%d %H:%M')
                except ValueError:
                    time_str = "时间格式错误"
                
                self._hourly_forecast.append(HourlyForecast(
                    datetime=time_str,
                    native_temperature=float(hourly.get("temp", 0)),
                    condition=CONDITION_MAP.get(hourly.get("icon", ""), EXCEPTIONAL),
                    text=hourly.get("text", ""),
                    icon=hourly.get("icon", ""),
                    wind_bearing=float(hourly.get("wind360", 0)),
                    native_wind_speed=float(hourly.get("windSpeed", 0)),
                    native_precipitation=float(hourly.get("precip", 0)),
                    humidity=float(hourly.get("humidity", 0)),
                    probable_precipitation=int(hourly.get("pop", 0)),
                    native_pressure=float(hourly.get("pressure", 0)),
                    cloud=hourly.get("cloud"),
                ))
        
        # 处理白天/夜晚预报
        self._daily_twice_forecast = []
        if self._daily_data:
            # 使用上面处理过的daily_list
            for daily in daily_list:
                self._daily_twice_forecast.append(Forecast(
                    datetime=daily.get("fxDate", ""),
                    native_temperature=float(daily.get("tempMax", 0)),
                    condition=CONDITION_MAP.get(daily.get("iconDay", ""), EXCEPTIONAL),
                    is_daytime=True,
                    humidity=float(daily.get("humidity", 0))
                ))
                self._daily_twice_forecast.append(Forecast(
                    datetime=daily.get("fxDate", ""),
                    native_temp_low=float(daily.get("tempMin", 0)),
                    condition=CONDITION_MAP.get(daily.get("iconNight", ""), EXCEPTIONAL),
                    is_daytime=False,
                    humidity=float(daily.get("humidity", 0))
                ))
        
        # 处理天气预警
        self._weather_warning = []
        if self._warning_data:
            if isinstance(self._warning_data, dict) and 'warning' in self._warning_data:
                warning_list = self._warning_data['warning']
            elif isinstance(self._warning_data, list):
                warning_list = self._warning_data
            else:
                warning_list = []
                _LOGGER.warning("预警数据结构异常")
            
            for warningItem in warning_list:
                self._weather_warning.append(WarningData(
                    pubTime=warningItem.get("pubTime", ""),
                    startTime=warningItem.get("startTime", ""),
                    endTime=warningItem.get("endTime", ""),
                    sender=warningItem.get("sender", ""),
                    title=warningItem.get("title", ""),
                    text=warningItem.get("text", ""),
                    severity=warningItem.get("severity", ""),
                    severityColor=warningItem.get("severityColor", ""),
                    level=warningItem.get("level", ""),
                    typeName=warningItem.get("typeName", "")
                )) 
        
        # 处理API响应状态
        if self._responsecode == '402':
            _LOGGER.warning("API请求超过访问次数")
        elif self._responsecode == '200':
            _LOGGER.info("成功从API获取本地信息")
        else:
            _LOGGER.warning("请求API错误，未取得数据，可能是API不支持相关类型，尝试关闭格点天气试试。")
