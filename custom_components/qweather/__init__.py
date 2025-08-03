"""
QWeather 插件初始化模块
此模块处理插件的初始化和卸载逻辑。
"""
import logging
import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall, callback
import homeassistant.helpers.config_validation as cv
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.entity_registry import async_get as get_entity_registry
from .const import DOMAIN, PLATFORMS
from homeassistant.const import CONF_HOST, CONF_API_KEY, CONF_NAME, ATTR_ENTITY_ID
_LOGGER = logging.getLogger(__name__)
CONFIG_SCHEMA = cv.deprecated(DOMAIN)

# 定义信号常量
QWEATHER_UPDATE_SIGNAL = f"{DOMAIN}_update"

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """设置从配置项加载的QWeather组件。"""
    hass.data.setdefault(DOMAIN, {})
    
    # 转发配置到平台
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """卸载QWeather配置项。"""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
