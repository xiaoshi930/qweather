"""
QWeather 服务模块
此模块提供手动更新天气数据的服务。
"""
import logging
import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers.entity_platform import async_get_platforms
from homeassistant.helpers.entity_registry import async_get as get_entity_registry
from homeassistant.helpers import config_validation as cv
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

SERVICE_UPDATE_WEATHER = "update_weather"


async def async_setup_services(hass: HomeAssistant):
    """设置QWeather服务。"""

    async def async_handle_update_weather(call: ServiceCall):
        """处理更新天气服务调用。"""
        entity_id = call.data.get("entity_id")

        if not entity_id:
            _LOGGER.error("未提供entity_id，无法执行更新")
            return

        _LOGGER.info(f"收到更新天气服务调用: {entity_id}")

        # 检查是否是QWeather域的天气实体
        if not entity_id.startswith("weather."):
            _LOGGER.error(f"实体 {entity_id} 不是天气实体")
            return

        # 获取实体注册表
        entity_registry = get_entity_registry(hass)
        registry_entry = entity_registry.async_get(entity_id)

        if not registry_entry:
            _LOGGER.error(f"找不到实体: {entity_id}")
            return

        # 检查是否是QWeather组件的实体
        if registry_entry.platform != DOMAIN:
            _LOGGER.error(f"实体 {entity_id} 不是QWeather组件的实体")
            return

        # 获取天气实体
        state = hass.states.get(entity_id)
        if not state:
            _LOGGER.error(f"找不到天气实体状态: {entity_id}")
            return

        # 遍历所有平台找到对应的天气实体
        from homeassistant.components.weather import WeatherEntity

        weather_entity = None
        for platform in async_get_platforms(hass, DOMAIN):
            if hasattr(platform, 'entities'):
                for entity in platform.entities.values():
                    if entity.entity_id == entity_id and isinstance(entity, WeatherEntity):
                        weather_entity = entity
                        break
            if weather_entity:
                break

        if not weather_entity:
            _LOGGER.error(f"找不到QWeather天气实体: {entity_id}")
            return

        try:
            # 强制更新数据
            _LOGGER.info(f"开始更新实体: {entity_id}")

            # 检查是否有 _data 对象
            if not hasattr(weather_entity, '_data'):
                _LOGGER.error(f"天气实体 {entity_id} 没有 _data 属性")
                return

            # 导入dt_util以获取当前时间
            import homeassistant.util.dt as dt_util

            # 强制更新底层数据，传递当前时间而不是None
            await weather_entity._data.async_update(now=dt_util.now(), force_update=True)

            # 更新实体状态（从 _data 获取最新数据）
            weather_entity._condition = weather_entity._data._condition
            weather_entity._condition_cn = weather_entity._data._condition_cn
            weather_entity._native_temperature = weather_entity._data._native_temperature
            weather_entity._humidity = weather_entity._data._humidity
            weather_entity._native_pressure = weather_entity._data._native_pressure
            weather_entity._native_wind_speed = weather_entity._data._native_wind_speed
            weather_entity._wind_bearing = weather_entity._data._wind_bearing
            weather_entity._daily_forecast = weather_entity._data._daily_forecast
            weather_entity._hourly_forecast = weather_entity._data._hourly_forecast
            weather_entity._daily_twice_forecast = weather_entity._data._daily_twice_forecast
            weather_entity._minutely_forecast = weather_entity._data._minutely_forecast
            weather_entity._minutely_summary = weather_entity._data._minutely_summary
            weather_entity._aqi = weather_entity._data._aqi
            weather_entity._winddir = weather_entity._data._winddir
            weather_entity._windscale = weather_entity._data._windscale
            weather_entity._weather_warning = weather_entity._data._weather_warning
            weather_entity._sun_data = weather_entity._data._sun_data
            weather_entity._air_indices = weather_entity._data._air_indices
            weather_entity._city = weather_entity._data._city
            weather_entity._icon = weather_entity._data._icon
            weather_entity._feelslike = weather_entity._data._feelslike
            weather_entity._cloud = weather_entity._data._cloud
            weather_entity._vis = weather_entity._data._vis
            weather_entity._dew = weather_entity._data._dew
            weather_entity._updatetime = weather_entity._data._refreshtime

            # 异步调度状态更新
            weather_entity.async_write_ha_state()

            _LOGGER.info(f"成功更新实体: {entity_id}")
        except Exception as e:
            _LOGGER.error(f"更新实体 {entity_id} 失败: {e}", exc_info=True)

    # 注册服务
    hass.services.async_register(
        "qweather",
        SERVICE_UPDATE_WEATHER,
        async_handle_update_weather,
        schema=vol.Schema({
            vol.Required("entity_id"): cv.entity_id
        })
    )

    _LOGGER.info("QWeather服务已注册")


async def async_unload_services(hass: HomeAssistant):
    """卸载QWeather服务。"""
    if hass.services.has_service("qweather", SERVICE_UPDATE_WEATHER):
        hass.services.async_remove("qweather", SERVICE_UPDATE_WEATHER)
        _LOGGER.info("QWeather服务已卸载")
