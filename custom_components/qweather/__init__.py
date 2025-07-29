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

# 定义服务数据架构
SET_CITY_SCHEMA = vol.Schema({
    vol.Required("entity_id"): cv.entity_id,
    vol.Required("city"): cv.string,
})

# 定义信号常量
QWEATHER_UPDATE_SIGNAL = f"{DOMAIN}_update"

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """设置从配置项加载的QWeather组件。"""
    hass.data.setdefault(DOMAIN, {})
    
    # 转发配置到平台
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    # 注册服务
    async def set_city_service(call: ServiceCall) -> None:
        """设置城市服务处理函数。"""
        entity_id = call.data[ATTR_ENTITY_ID] 
        city = call.data["city"]
        
        # 获取实体注册表
        entity_registry = get_entity_registry(hass)
        entity_entry = entity_registry.async_get(entity_id)
        
        if not entity_id:
            _LOGGER.error(f"实体 {entity_id} 不存在")
            return
            
        if not entity_entry:
            _LOGGER.error(f"实体 {entity_id} 在注册表中不存在")
            return
            
        if not hasattr(entity_entry, "config_entry_id") or not entity_entry.config_entry_id:
            _LOGGER.error(f"实体 {entity_id} 没有关联的配置项")
            return
        
        # 更新集成配置中的"搜索城市"字段
        config_entry = hass.config_entries.async_get_entry(entity_entry.config_entry_id)
        if config_entry:
            hass.config_entries.async_update_entry(
                config_entry,
                data={
                    **config_entry.data,
                    "城市搜索": city,
                    "location_mode": "城市搜索"
                }
            )
        
        # 发送更新信号，触发实体重新加载和天气数据更新
        _LOGGER.debug(f"发送更新信号给实体 {entity_id}")
        async_dispatcher_send(hass, f"{QWEATHER_UPDATE_SIGNAL}_{entity_id}", {"city": city, "reload": True, "城市搜索": city, "location_mode": "城市搜索"})
        
        # 重新加载配置项，使更改生效
        await hass.config_entries.async_reload(entity_entry.config_entry_id)
        
    # 注册服务
    hass.services.async_register(
        DOMAIN, "set_city", set_city_service, schema=SET_CITY_SCHEMA
    )
    
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """卸载QWeather配置项。"""
    # 卸载服务
    hass.services.async_remove(DOMAIN, "set_city")
    
    # 卸载平台
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
