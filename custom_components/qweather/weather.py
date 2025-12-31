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
    CONF_ENABLE_HOURLY,
    CONF_ENABLE_WARNING,
    CONF_ENABLE_AIR,
    CONF_ENABLE_YESTERDAY,
    CONF_ENABLE_INDICES,
    CONF_ENABLE_MINUTELY,
    ATTR_CONDITION_CN,
    ATTR_UPDATE_TIME,
    ATTR_AQI,
    ATTR_DAILY_FORECAST,
    ATTR_HOURLY_FORECAST,
    ATTR_MINUTELY_FORECAST,
    ATTR_MINUTELY_SUMMARY,
    ATTR_FORECAST_PROBABLE_PRECIPITATION,
    CONDITION_CLASSES,
)
    
from .condition import CONDITION_MAP, EXCEPTIONAL
_LOGGER = logging.getLogger(__name__)
# 设置日志级别为DEBUG，确保所有调试日志都能显示
_LOGGER.setLevel(logging.DEBUG)
DEFAULT_TIME = dt_util.now()

def create_no_city_entity(config_entry):
    """创建无搜索城市实体"""
    name = config_entry.data.get(CONF_NAME)
    unique_id = config_entry.unique_id
    return NoCityWeather(unique_id, name)

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
    name = config_entry.data.get(CONF_NAME)
    host = config_entry.data.get(CONF_HOST, "api.qweather.com")
    api_key = config_entry.data.get(CONF_API_KEY)
    unique_id = config_entry.unique_id
    
    # 定位设备或搜索城市
    location_mode = config_entry.data.get("location_mode", "device")  # 默认为定位设备
    
    if location_mode == "城市搜索":
        # 搜索城市模式
        city = config_entry.data.get("城市搜索")
        if not city:
            _LOGGER.debug(f"城市搜索为空，跳过")
            # 创建无搜索城市实体
            no_city_entity = create_no_city_entity(config_entry)
            async_add_entities([no_city_entity], True)
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
    
    # 添加API功能开关配置 - 优先从data读取，如果没有则从options读取
    config[CONF_ENABLE_HOURLY] = config_entry.data.get(CONF_ENABLE_HOURLY, config_entry.options.get(CONF_ENABLE_HOURLY, False))
    config[CONF_ENABLE_WARNING] = config_entry.data.get(CONF_ENABLE_WARNING, config_entry.options.get(CONF_ENABLE_WARNING, False))
    config[CONF_ENABLE_AIR] = config_entry.data.get(CONF_ENABLE_AIR, config_entry.options.get(CONF_ENABLE_AIR, False))
    config[CONF_ENABLE_YESTERDAY] = config_entry.data.get(CONF_ENABLE_YESTERDAY, config_entry.options.get(CONF_ENABLE_YESTERDAY, False))
    config[CONF_ENABLE_INDICES] = config_entry.data.get(CONF_ENABLE_INDICES, config_entry.options.get(CONF_ENABLE_INDICES, False))
    config[CONF_ENABLE_MINUTELY] = config_entry.data.get(CONF_ENABLE_MINUTELY, config_entry.options.get(CONF_ENABLE_MINUTELY, False))

    # 记录API功能开关状态，方便调试
    _LOGGER.debug(f"API功能开关状态: 小时天气={config[CONF_ENABLE_HOURLY]}, 预警={config[CONF_ENABLE_WARNING]}, 空气质量={config[CONF_ENABLE_AIR]}, 昨日天气={config[CONF_ENABLE_YESTERDAY]}, 天气指数={config[CONF_ENABLE_INDICES]}, 分钟预警={config[CONF_ENABLE_MINUTELY]}")
    
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
    
    # 注册定时更新并保存回调对象，以便卸载时取消
    update_listener = async_track_time_interval(hass, custom_update, timedelta(minutes=update_interval_minutes))
    _LOGGER.debug('[%s]刷新间隔时间: %s 分钟，夜间不更新: %s', name, update_interval_minutes, no_update_at_night)
    
    # 保存定时任务回调到hass.data，供卸载时使用
    hass.data[DOMAIN][unique_id]['update_listener'] = update_listener
    
    if data._current:  # 检查是否有有效数据
        async_add_entities([HeFengWeather(data, unique_id, name)], True)
        _LOGGER.info(f"成功添加天气实体: {name}")
    else:
        _LOGGER.error("未能获取有效天气数据，无法创建实体")

class NoCityWeather(WeatherEntity):
    """无搜索城市实体，显示固定状态"""
    def __init__(self, unique_id, name):
        """Initialize the no city weather entity."""
        self._name = name
        self._unique_id = unique_id
        self._attr_native_temperature = None
        self._attr_condition = None
        self._attr_humidity = None
        self._attr_native_pressure = None
        self._attr_native_wind_speed = None
        self._attr_wind_bearing = None
        self._attr_native_precipitation_unit = UnitOfLength.MILLIMETERS
        self._attr_native_pressure_unit = UnitOfPressure.HPA
        self._attr_native_temperature_unit = UnitOfTemperature.CELSIUS
        self._attr_native_visibility_unit = UnitOfLength.KILOMETERS
        self._attr_native_wind_speed_unit = UnitOfSpeed.KILOMETERS_PER_HOUR
        self._attr_supported_features = 0

    @property
    def name(self):
        """Return the name of the sensor."""
        return self._name

    @property
    def unique_id(self):
        """Return a unique_id for this entity."""
        if self._unique_id:
            return f"{DOMAIN}_{self._unique_id}"
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
            "sw_version": VERSION
        }

    @property
    def state(self):
        """Return the state of the entity."""
        return "无搜索城市"

    async def async_update(self):
        """Update the entity - no-op for this entity."""
        pass

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
        self._minutely_forecast = None
        self._minutely_summary = None
        self._feelslike = None
        self._cloud = None
        self._vis = None
        self._dew = None
        self._weather_warning = []
        self._sun_data = {}
        self._air_indices = {}
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
                "text": forecast.text,
                "textnight": forecast.textnight,
                "winddirday": forecast.winddirday,
                "winddirnight": forecast.winddirnight,
                "windscaleday": forecast.windscaleday,
                "windscalenight": forecast.windscalenight
            }
            forecast_data.append(forecast_dict)

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
                "text": forecast.text,
                "humidity": forecast.humidity,
                "windscaleday": forecast.windscaleday
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
            minutely_forecast = [asdict(item) for item in self._minutely_forecast] if self._minutely_forecast else []
            weather_warning = [asdict(item) for item in self._weather_warning] if self._weather_warning else []

            attributes.update({
                ATTR_CONDITION_CN: self._condition_cn,
                "city": self._city,
                "winddir": self._winddir,
                "windscale": self._windscale,
                "cloud_coverage": self._cloud,
                "visibility": self._vis,
                "dew_point": self._dew,
                "apparent_temperature": self._feelslike,
                ATTR_UPDATE_TIME: self._updatetime,
                ATTR_MINUTELY_SUMMARY: self._minutely_summary,
                "aqis": self._aqi.get("aqi") if isinstance(self._aqi, dict) else None,
                ATTR_AQI: self._aqi,
                ATTR_DAILY_FORECAST: daily_forecast,
                ATTR_HOURLY_FORECAST: hourly_forecast,
                ATTR_MINUTELY_FORECAST: minutely_forecast,
                "air_indices": self._air_indices.get("daily", []) if isinstance(self._air_indices, dict) else (self._air_indices if isinstance(self._air_indices, list) else []),
                "sun": {
                    "sunrise": self._sun_data.get("sunrise", ""),
                    "sunset": self._sun_data.get("sunset", "")
                },
                "warning": weather_warning,
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
            self._minutely_forecast = self._data._minutely_forecast
            self._minutely_summary = self._data._minutely_summary
            self._aqi = self._data._aqi
            self._winddir = self._data._winddir
            self._windscale = self._data._windscale
            self._weather_warning = self._data._weather_warning
            self._sun_data = self._data._sun_data
            self._air_indices = self._data._air_indices
            self._city = self._data._city
            self._icon = self._data._icon
            self._feelslike = self._data._feelslike
            self._cloud = self._data._cloud
            self._vis = self._data._vis
            self._dew = self._data._dew
            self._updatetime = self._data._refreshtime

@dataclass
class Forecast:
    datetime: str
    native_temperature: float = None
    native_temp_low: float = None
    condition: str = None
    text: str = None
    wind_bearing: float = None
    native_wind_speed: float = None
    native_precipitation: float = None
    humidity: float = None
    native_pressure: float = None
    textnight: str = None
    winddirday: str = None
    winddirnight: str = None
    windscaleday: str = None
    windscalenight: str = None
    visibility: int = None
    cloud_coverage: int = None
    uv_index: int = None
    is_daytime: bool = False

@dataclass
class HourlyForecast:
    datetime: str
    native_temperature: int = None
    condition: str = None
    text: str = None
    wind_bearing: int = None
    native_wind_speed: int = None
    native_precipitation: int = None
    humidity: int = None
    probable_precipitation: int = None
    native_pressure: int = None
    cloud_coverage: int = None
    windscaleday: str = None

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

@dataclass
class MinutelyForecast:
    datetime: str
    native_temperature: float = None
    condition: str = None
    text: str = None
    wind_bearing: float = None
    native_wind_speed: float = None
    native_precipitation: float = None
    humidity: float = None
    probable_precipitation: int = None
    native_pressure: float = None
    cloud_coverage: int = None
    windscaleday: str = None

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
        self._minutely_forecast = None
        self._minutely_summary = None
        self._aqi = None
        self._winddir = None
        self._windscale = None
        self._weather_warning = None
        self._city = None
        self._feelslike = None
        self._cloud = None
        self._vis = None
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
        self._minutely_data: list[dict] = []
        self._warning_data: list[dict] = []
        self._air_data = []
        self._update_interval_minutes = update_interval_minutes
        self._sun_data = {} 
        self._air_indices = {}
        self._yesterday_data = {}
        self._location_id = None  # 用于存储LocationID
        self._fxlink = ""
        # 昨日日期将在每次更新时动态计算，不在初始化时计算
        self._yesterday = None
        self._yesterday_api = None
        
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
        self._updatetime_indices = 0
        self._updatetime_yesterday = 0
        self._updatetime_minutely = 0
        self._responsecode = None
        
        # 读取API功能开关配置
        self._enable_hourly = self._config.get(CONF_ENABLE_HOURLY, False)
        self._enable_warning = self._config.get(CONF_ENABLE_WARNING, False)
        self._enable_air = self._config.get(CONF_ENABLE_AIR, False)
        self._enable_yesterday = self._config.get(CONF_ENABLE_YESTERDAY, False)
        self._enable_indices = self._config.get(CONF_ENABLE_INDICES, False)
        self._enable_minutely = self._config.get(CONF_ENABLE_MINUTELY, False)
        
    def _update_api_urls(self):
        """更新所有 API URL"""
        self.geo_url = f"https://{self._host}/geo/v2/city/lookup?location={self._location}&lang=zh"
        self.now_url = f"https://{self._host}/v7/weather/now?location={self._location}&lang=zh"
        self.daily_url = f"https://{self._host}/v7/weather/10d?location={self._location}&lang=zh"
        self.air_url = f"https://{self._host}/airquality/v1/current/{self._location.split(',')[1].strip()}/{self._location.split(',')[0].strip()}?lang=zh"
        self.hourly_url = f"https://{self._host}/v7/weather/24h?location={self._location}&lang=zh"
        self.warning_url = f"https://{self._host}/weatheralert/v1/current/{self._location.split(',')[1].strip()}/{self._location.split(',')[0].strip()}?lang=zh"
        self.indices_url = f"https://{self._host}/v7/indices/1d?type=0&location={self._location}&lang=zh"
        self.yesterday_url = None  # 将在获取到LocationID后动态设置
        self.minutely_url = f"https://{self._host}/v7/minutely/5m?location={self._location}&lang=zh"
        _LOGGER.debug(f"API URL 已更新为位置: {self._location}") 
    @property
    def name(self):
        """Return the name of the sensor."""
        return self._name
    @property
    def condition(self):
        """Return the current condition."""
        return CONDITION_MAP.get(self._current.get("icon"), EXCEPTIONAL)
        
    def _convert_new_air_format_to_old(self, new_data):
        """将新的空气质量API格式转换为旧格式"""
        # 首先检查输入数据是否有效
        if not new_data or not isinstance(new_data, dict):
            _LOGGER.debug("空气质量数据为空或格式不正确")
            return None
            
        try:
            # 获取当前时间作为发布时间
            from datetime import datetime
            current_time = datetime.now().strftime('%Y-%m-%dT%H:%M:%S+08:00')
            
            # 获取污染物数据
            pollutants = {}
            for p in new_data.get('pollutants', []):
                if isinstance(p, dict) and 'code' in p and 'concentration' in p and isinstance(p['concentration'], dict):
                    pollutants[p['code']] = p['concentration'].get('value', 0)
            
            # 获取US EPA AQI数据
            us_epa_index = None
            for index in new_data.get('indexes', []):
                if isinstance(index, dict) and index.get('code') == 'us-epa':
                    us_epa_index = index
                    break
            
            if not us_epa_index and new_data.get('indexes'):
                # 如果没有US EPA数据，使用第一个index
                first_index = new_data['indexes'][0]
                if isinstance(first_index, dict):
                    us_epa_index = first_index
            
            # 如果仍然没有有效的index数据，返回None
            if not us_epa_index:
                _LOGGER.debug("未找到有效的空气质量指数数据")
                return None
            
            # 构建旧格式的数据
            old_format = {
                "pubTime": current_time,
                "aqi": str(int(us_epa_index.get('aqi', 0))),
                "level": str(us_epa_index.get('level', '1')),
                "category": us_epa_index.get('category', '未知'),
                "primary": (us_epa_index.get('primaryPollutant', {}).get('code', 'NA').upper() 
                           if isinstance(us_epa_index.get('primaryPollutant'), dict) else 'NA'),
                "pm10": str(int(pollutants.get('pm10', 0))),
                "pm2p5": str(int(pollutants.get('pm2p5', 0))),
                "no2": str(int(pollutants.get('no2', 0))),
                "so2": str(int(pollutants.get('so2', 0))), 
                "co": str(float(pollutants.get('co', 0))),
                "o3": str(int(pollutants.get('o3', 0)))
            }
            
            _LOGGER.debug(f"空气质量数据转换完成: {old_format}")
            return old_format
            
        except Exception as e:
            _LOGGER.error(f"空气质量数据格式转换失败: {str(e)}")
            return None

    def _convert_new_warning_format_to_old(self, new_data):
        """将新的预警API格式转换为旧格式"""
        # 首先检查输入数据是否有效
        if not new_data or not isinstance(new_data, dict):
            _LOGGER.debug("预警数据为空或格式不正确")
            return None
        
        try:
            # 检查是否有无预警结果
            if new_data.get('metadata', {}).get('zeroResult', False):
                _LOGGER.debug("当前区域无预警信息")
                return None
            
            # 获取预警列表
            alerts = new_data.get('alerts', [])
            if not alerts:
                _LOGGER.debug("预警列表为空")
                return None
            
            # 颜色代码到中文级别的映射
            color_level_mapping = {
                "white": "白色",
                "gray": "灰色", 
                "green": "绿色",
                "blue": "蓝色",
                "yellow": "黄色",
                "amber": "琥珀色",
                "orange": "橙色",
                "red": "红色",
                "purple": "紫色",
                "black": "黑色"
            }
            
            # 转换为旧格式
            old_format_list = []
            for alert in alerts:
                # 获取颜色代码并转换为中文级别
                color_code = ""
                level_cn = ""
                if isinstance(alert.get("color"), dict):
                    color_code = alert.get("color", {}).get("code", "")
                    level_cn = color_level_mapping.get(color_code, "")
                
                old_format_warning = {
                    "id": alert.get("id", ""),
                    "sender": alert.get("senderName", ""),
                    "pubTime": alert.get("issuedTime", ""),
                    "title": alert.get("headline", ""),
                    "startTime": alert.get("effectiveTime", ""),
                    "endTime": alert.get("expireTime", ""),
                    "status": "active",  # 新API中没有status字段，默认为active
                    "level": level_cn,  # 使用转换后的中文级别
                    "severity": alert.get("severity", ""),
                    "severityColor": color_code,
                    "type": alert.get("eventType", {}).get("code", "") if isinstance(alert.get("eventType"), dict) else "",
                    "typeName": alert.get("eventType", {}).get("name", "") if isinstance(alert.get("eventType"), dict) else "",
                    "urgency": "",
                    "certainty": "",
                    "text": alert.get("description", ""),
                    "related": ""
                }
                old_format_list.append(old_format_warning)
            
            # 返回包含warning字段的字典，保持与旧API结构一致
            return {"warning": old_format_list}
            
        except Exception as e:
            _LOGGER.error(f"预警数据格式转换失败: {str(e)}")
            return None

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
            'indices': self._update_interval_minutes * 60,
            'yesterday': self._update_interval_minutes * 60,
            'minutely': self._update_interval_minutes * 60,
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
                    # 处理空气质量API返回400的情况
                    if url == self.air_url and response.status == 400:
                        _LOGGER.debug("空气质量API返回400，说明当前地址不支持空气质量数据，设置为空数据")
                        setattr(self, data_attr, None)
                        setattr(self, update_attr, current_time)
                        return True
                    
                    response.raise_for_status()
                    json_data = await response.json()
                    if url == self.now_url and 'code' in json_data:
                        self._responsecode = json_data.get("code")
                    
                    # 处理预警API的无数据情况
                    if url == self.warning_url and json_data.get('metadata', {}).get('zeroResult', False):
                        _LOGGER.debug("预警API返回无数据，设置为空列表")
                        setattr(self, data_attr, None)
                        setattr(self, update_attr, current_time)
                        return True
                    
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
            except asyncio.TimeoutError as e:
                # 超时时不更新时间戳，允许下次重试
                _LOGGER.warning("API请求超时 (%s): %s，下次更新将重试", url, str(e))
                return False
            except (aiohttp.ClientError, ValueError) as e:
                # 其他错误也不更新时间戳，但记录错误
                _LOGGER.warning("API请求失败 (%s): %s", url, str(e))
                return False
            return False
        
        async with aiohttp.ClientSession(
            connector=connector, 
            timeout=timeout, 
            headers=self.headers
        ) as session:
            tasks = []
            tasks.append(fetch_data(self.now_url, '_updatetime_now', '_current', min_intervals['now'], 'now', force_update))
            tasks.append(fetch_data(self.daily_url, '_updatetime_daily', '_daily_data', min_intervals['daily'], 'daily', force_update))
            tasks.append(fetch_data(self.geo_url, '_updatetime_geo', '_geo_data', min_intervals['geo'], 'geo', force_update))
            
            # 根据配置决定是否调用各个API
            _LOGGER.debug(f"API功能调用前状态: 小时天气={self._enable_hourly}, 预警={self._enable_warning}, 空气质量={self._enable_air}, 昨日天气={self._enable_yesterday}, 天气指数={self._enable_indices}, 分钟预警={self._enable_minutely}")

            if self._enable_air:
                _LOGGER.debug(f"添加空气质量API任务: {self.air_url}")
                tasks.append(fetch_data(self.air_url, '_updatetime_air', '_air_data', min_intervals['air'], None, force_update))
            if self._enable_hourly:
                _LOGGER.debug(f"添加小时天气API任务: {self.hourly_url}")
                tasks.append(fetch_data(self.hourly_url, '_updatetime_hourly', '_hourly_data', min_intervals['hourly'], 'hourly', force_update))
            if self._enable_minutely:
                _LOGGER.debug(f"添加分钟预警API任务: {self.minutely_url}")
                tasks.append(fetch_data(self.minutely_url, '_updatetime_minutely', '_minutely_data', min_intervals['minutely'], None, force_update))
            if self._enable_warning:
                _LOGGER.debug(f"添加预警API任务: {self.warning_url}")
                tasks.append(fetch_data(self.warning_url, '_updatetime_warning', '_warning_data', min_intervals['warning'], None, force_update))

            if self._enable_indices:
                _LOGGER.debug(f"添加天气指数API任务: {self.indices_url}")
                tasks.append(fetch_data(self.indices_url, '_updatetime_indices', '_air_indices', min_intervals['indices'], 'daily', force_update))
          
            
            # 执行所有任务（除了昨日天气）- 使用 return_exceptions=True 防止单个失败影响整体
            results = await asyncio.gather(*tasks, return_exceptions=True)
            _LOGGER.debug("API更新结果: %s", results)
            
            # 检查结果中的异常并记录
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    # 根据任务索引确定是哪个API失败了
                    api_names = ["now", "daily", "geo"]
                    if self._enable_air:
                        api_names.append("air")
                    if self._enable_hourly:
                        api_names.append("hourly")
                    if self._enable_minutely:
                        api_names.append("minutely")
                    if self._enable_warning:
                        api_names.append("warning")
                    if self._enable_indices:
                        api_names.append("indices")
                    api_name = api_names[i] if i < len(api_names) else f"task_{i}"
                    _LOGGER.warning(f"API请求失败 ({api_name}): {str(result)}")
                    
                    # 如果是超时异常，不更新时间戳以便下次重试
                    if "TimeoutError" in str(type(result)) or "timeout" in str(result).lower():
                        _LOGGER.info(f"API ({api_name}) 超时，下次更新时将重试")
            
            # 处理geo数据获取LocationID，然后设置昨日天气URL并调用
            if self._geo_data and isinstance(self._geo_data, dict) and 'location' in self._geo_data and self._geo_data['location']:
                # 提取LocationID用于昨日天气API
                self._location_id = self._geo_data['location'][0].get("id")
                if self._location_id and self._enable_yesterday:
                    # 每次更新时重新计算昨日日期
                    yesterday = datetime.now() - timedelta(days=1)
                    self._yesterday = yesterday.strftime("%Y-%m-%d")  # 用于比较的格式
                    self._yesterday_api = yesterday.strftime("%Y%m%d")  # API使用的格式
                    _LOGGER.debug(f"计算昨日日期: {self._yesterday} (API格式: {self._yesterday_api})")
                    
                    # 使用YYYYMMDD格式供API使用
                    self.yesterday_url = f"https://{self._host}/v7/historical/weather?location={self._location_id}&date={self._yesterday_api}"
                    _LOGGER.debug(f"设置昨日天气API URL: {self.yesterday_url}")
                    
                    # 昨日天气API总是强制更新，因为日期每天都在变化
                    await fetch_data(self.yesterday_url, '_updatetime_yesterday', '_yesterday_data', min_intervals['yesterday'], None, force_update=True) 
            
            # 单独处理城市信息 - 任何情况都更新
            if True:  # 原条件: if not self._city:
                try:
                    geo_data = self._geo_data  # 使用已经获取的geo数据
                    if geo_data and 'location' in geo_data and geo_data['location']:
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
                except (IndexError, KeyError) as e:
                    _LOGGER.warning("城市信息解析失败: %s", str(e))
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
            self._windscale = int(self._current.get("windScale", 0))
            self._textnight = self._current.get("textNight", "")
            self._winddirday = self._current.get("windDirday", "")
            self._winddirnight = self._current.get("windDirNight", "")
            self._windscaleday = self._current.get("windScaleDay", "")
            self._windscalenight = self._current.get("windScaleNight", "")
            self._iconnight = self._current.get("iconNight", "")
            self._feelslike = float(self._current.get("feelsLike", 0))
            self._cloud = int(self._current.get("cloud", 0))
            self._vis = float(self._current.get("vis", 0))
            self._dew = float(self._current.get("dew", 0))
            
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
        
        #处理空气质量
        if self._air_data is None:
            self._aqi = {}
            _LOGGER.debug("空气质量数据为空，可能当前地址不支持空气质量监测")
        elif isinstance(self._air_data, dict):
            # 检查是否为新API格式
            if 'indexes' in self._air_data and 'pollutants' in self._air_data:
                # 新API格式转换
                self._aqi = self._convert_new_air_format_to_old(self._air_data)
            else:
                self._aqi = {}
        else:
            self._aqi = {}
            _LOGGER.debug("空气质量数据为空")
        
        # 处理每日预报
        self._daily_forecast = []
        daily_list = []
        if self._daily_data:
            if isinstance(self._daily_data, dict) and 'daily' in self._daily_data:
                daily_list = self._daily_data['daily']
            elif isinstance(self._daily_data, list):
                daily_list = self._daily_data
            else:
                daily_list = []
                _LOGGER.warning("每日预报数据结构异常")
        
        # 检查是否需要插入昨日天气数据
        yesterday_inserted = False
        if self._enable_yesterday:
            # 添加调试日志
            _LOGGER.debug(f"昨日天气处理: 昨日日期={self._yesterday}, 昨日数据存在={bool(self._yesterday_data)}")
            
            if self._yesterday_data and isinstance(self._yesterday_data, dict) and 'weatherDaily' in self._yesterday_data:
                yesterday_weather = self._yesterday_data['weatherDaily']
                yesterday_date = self._yesterday  # 使用计算的昨日日期 YYYY-MM-DD 格式
                
                # 检查昨日日期是否在每日数组内
                has_yesterday = any(daily.get("fxDate", "") == yesterday_date for daily in daily_list)
                
                _LOGGER.debug(f"昨日数据检查: 昨日是否在daily_list中={has_yesterday}")
                
                # 只有在昨日日期不在每日数组内时才插入
                if not has_yesterday:
                    hourly_data = {}
                    if 'weatherHourly' in self._yesterday_data and isinstance(self._yesterday_data['weatherHourly'], list) and self._yesterday_data['weatherHourly']:
                        first_hour = self._yesterday_data['weatherHourly'][0]
                        hourly_data = {
                            "icon": first_hour.get("icon", ""),
                            "text": first_hour.get("text", ""),
                            "wind360": first_hour.get("wind360", ""),
                            "windDir": first_hour.get("windDir", ""),
                            "windScale": first_hour.get("windScale", ""),
                            "windSpeed": first_hour.get("windSpeed", "")
                        }
                    # 将昨日天气数据转换为今日格式并插入到开头
                    yesterday_forecast = {
                        "fxDate": yesterday_date,
                        "sunrise": yesterday_weather.get("sunrise", ""),
                        "sunset": yesterday_weather.get("sunset", ""),
                        "moonrise": yesterday_weather.get("moonrise", ""),
                        "moonset": yesterday_weather.get("moonset", ""),
                        "moonPhase": yesterday_weather.get("moonPhase", ""),
                        "moonPhaseIcon": "",
                        "tempMax": yesterday_weather.get("tempMax", 0),
                        "tempMin": yesterday_weather.get("tempMin", 0),
                        "iconDay": hourly_data.get("icon", ""),
                        "textDay": hourly_data.get("text", ""),
                        "iconNight": hourly_data.get("icon", ""),
                        "textNight": hourly_data.get("text", ""),
                        "wind360Day": hourly_data.get("wind360", 0),
                        "windDirDay": hourly_data.get("windDir", ""),
                        "windScaleDay": hourly_data.get("windScale", ""),
                        "windSpeedDay": hourly_data.get("windSpeed", 0),
                        "wind360Night": hourly_data.get("wind360", ""),
                        "windDirNight": hourly_data.get("windDir", ""),
                        "windScaleNight": hourly_data.get("windScale", ""),
                        "windSpeedNight": hourly_data.get("windSpeed", ""),
                        "humidity": yesterday_weather.get("humidity", 0),
                        "precip": yesterday_weather.get("precip", 0),
                        "pressure": yesterday_weather.get("pressure", 0), 
                        "cloud_coverage": "",
                        "visibility": "",
                        "uv_index": ""
                    }
                    daily_list.insert(0, yesterday_forecast)
                    yesterday_inserted = True
                    _LOGGER.info(f"成功插入昨日天气数据: {yesterday_date}")
                else:
                    _LOGGER.info(f"昨日数据已存在于每日预报中，无需插入: {yesterday_date}")
        else:
            if self._enable_yesterday:
                _LOGGER.debug(f"昨日天气数据不可用或格式错误: 数据类型={type(self._yesterday_data)}, 数据内容={self._yesterday_data}")
            else:
                _LOGGER.debug("昨日天气功能未启用，跳过处理")
        
        # 从每日预报数据中提取今天日期的日出日落
        today_date = datetime.now().strftime('%Y-%m-%d')
        for daily in daily_list:
            # 如果是今天的数据，提取日出日落信息
            if daily.get("fxDate") == today_date:
                self._sun_data = {
                    'sunrise': daily.get('sunrise', ''),
                    'sunset': daily.get('sunset', '')
                }
            
            self._daily_forecast.append(Forecast(
                    datetime=daily.get("fxDate", ""),
                    native_temperature=float(daily.get("tempMax", 0)),
                    native_temp_low=float(daily.get("tempMin", 0)),
                    condition=CONDITION_MAP.get(daily.get("iconDay", ""), EXCEPTIONAL),
                    text=daily.get("textDay", ""),
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
                    cloud_coverage=int(daily.get("cloud", 0)),
                    visibility=int(daily.get("vis", 0)),
                    uv_index=int(daily.get("uvIndex", 0))
                ))
        
        # 处理小时预报
        self._hourly_forecast = []        
        if self._hourly_data:
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
                    wind_bearing=float(hourly.get("wind360", 0)),
                    native_wind_speed=float(hourly.get("windSpeed", 0)),
                    native_precipitation=float(hourly.get("precip", 0)),
                    humidity=float(hourly.get("humidity", 0)),
                    probable_precipitation=int(hourly.get("pop", 0)),
                    native_pressure=float(hourly.get("pressure", 0)),
                    cloud_coverage=int(hourly.get("cloud", 0)) if hourly.get("cloud") is not None else None,
                    windscaleday=str(hourly.get("windScale", "0")) if hourly.get("windScale") is not None else "0"
                ))

        # 处理分钟预报
        self._minutely_forecast = []
        self._minutely_summary = None

        if self._minutely_data:
            # 提取summary字段
            if isinstance(self._minutely_data, dict):
                self._minutely_summary = self._minutely_data.get('summary')

            minutely_list = []
            if isinstance(self._minutely_data, dict) and 'minutely' in self._minutely_data:
                minutely_list = self._minutely_data['minutely']
            elif isinstance(self._minutely_data, list):
                minutely_list = self._minutely_data

            # 创建小时预报的字典，用于快速查找匹配的小时数据
            # 键格式：年-月-日-小时
            hourly_dict = {}
            if self._hourly_forecast:
                for hourly in self._hourly_forecast:
                    try:
                        datetime_parts = hourly.datetime.split(' ')
                        date_part = datetime_parts[0]  # 年-月-日
                        time_part = datetime_parts[1].split(':')[0]  # 小时
                        key = f"{date_part}-{time_part}"
                        hourly_dict[key] = hourly
                    except (IndexError, AttributeError):
                        continue

            # 获取实时天气数据作为默认值
            default_temperature = self._native_temperature
            default_humidity = self._humidity
            default_wind_speed = self._native_wind_speed
            default_wind_bearing = self._wind_bearing
            default_pressure = self._native_pressure
            default_cloud = self._cloud
            default_wind_scale = self._windscale

            for minutely in minutely_list:
                try:
                    date_obj = datetime.fromisoformat(minutely.get("fxTime", "").replace('Z', '+00:00'))
                    date_obj = dt_util.as_local(date_obj)
                    time_str = date_obj.strftime('%Y-%m-%d %H:%M')
                    # 构建匹配键：年-月-日-小时
                    match_key = date_obj.strftime('%Y-%m-%d-%H')
                except ValueError:
                    time_str = "时间格式错误"
                    match_key = None

                # 从小时预报中获取匹配的数据
                temperature = default_temperature
                humidity = default_humidity
                wind_speed = default_wind_speed
                wind_bearing = default_wind_bearing
                pressure = default_pressure
                cloud = default_cloud
                wind_scale = default_wind_scale
                condition = None
                text = None

                if match_key and match_key in hourly_dict:
                    hourly_data = hourly_dict[match_key]
                    temperature = hourly_data.native_temperature
                    humidity = hourly_data.humidity
                    wind_speed = hourly_data.native_wind_speed
                    wind_bearing = hourly_data.wind_bearing
                    pressure = hourly_data.native_pressure
                    cloud = hourly_data.cloud_coverage
                    wind_scale = hourly_data.windscaleday
 
                # 降水类型转换
                precip_type = minutely.get("type", "")
                precip_value = float(minutely.get("precip", 0))

                # 当分钟降水为0时，继承小时天气或实时天气数据
                if precip_value == 0:
                    if match_key and match_key in hourly_dict:
                        # 优先继承小时天气数据
                        hourly_data = hourly_dict[match_key]
                        condition = hourly_data.condition
                        text = hourly_data.text
                    else:
                        # 没有匹配的小时数据，使用实时天气数据
                        condition = self._condition
                        text = self._condition_cn
                else:
                    # 有降水时，根据降水类型设置
                    if precip_type == "rain":
                        condition = "rainy"
                        text = "雨"
                    elif precip_type == "snow":
                        condition = "snowy"
                        text = "雪"

                self._minutely_forecast.append(MinutelyForecast(
                    datetime=time_str,
                    native_temperature=temperature,
                    condition=condition,
                    text=text,
                    wind_bearing=wind_bearing,
                    native_wind_speed=wind_speed,
                    native_precipitation=float(minutely.get("precip", 0)),
                    humidity=humidity,
                    probable_precipitation=float(minutely.get("precip", 0)),
                    native_pressure=pressure,
                    cloud_coverage=cloud,
                    windscaleday=wind_scale
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
            if isinstance(self._warning_data, dict) and 'metadata' in self._warning_data:
                converted_data = self._convert_new_warning_format_to_old(self._warning_data)
                if converted_data and 'warning' in converted_data:
                    warning_list = converted_data['warning']
                else:
                    warning_list = []
                    _LOGGER.debug("无预警数据或转换失败")
            else:
                warning_list = []
                _LOGGER.debug("无预警数据")
            
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
