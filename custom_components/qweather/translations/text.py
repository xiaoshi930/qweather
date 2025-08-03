"""
QWeather 文本实体模块
此模块实现 QWeather 插件的文本实体逻辑，包括城市名称显示。
"""
import logging
import asyncio
from homeassistant.components.text import TextEntity
from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from .const import DOMAIN, MANUFACTURER, VERSION, QWEATHER_UPDATE_SIGNAL

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass, config_entry, async_add_entities):
    """设置文本实体。"""
    name = config_entry.data.get("name", "和风天气")
    unique_id = config_entry.unique_id
    
    # 检查是否是城市搜索模式
    location_mode = config_entry.data.get("location_mode", "device")
    
    if location_mode == "城市搜索":
        city = config_entry.data.get("城市搜索", "")
        text_city = config_entry.data.get("text.set_city", "")
        
        # 创建并添加 text.set_city 实体
        city_entity = QWeatherCityText(hass, unique_id, name, city, text_city)
        async_add_entities([city_entity], True)
        _LOGGER.info(f"成功添加城市文本实体: {name}_city")

class QWeatherCityText(TextEntity):
    """表示城市名称的文本实体。"""
    
    def __init__(self, hass, unique_id, name, city, text_city):
        """初始化文本实体。"""
        self.entity_id = "text.set_city"
        self._attr_name = "设置城市"
        self._attr_unique_id = f"{unique_id}set_city"
        self.hass = hass
        self._unique_id = unique_id
        self._name = "设置城市"
        self._city = city
        self._update_listener = None
    
    @property
    def name(self):
        """返回实体的名称。"""
        return self._name
    
    @property
    def unique_id(self):
        """返回实体的唯一ID。"""
        if self._unique_id:
            return f"{DOMAIN}_text_{self._unique_id}"
        return f"{DOMAIN}_text_{self._name}"
    
    @property
    def device_info(self):
        """返回设备信息。"""
        from homeassistant.helpers.device_registry import DeviceEntryType
        return {
            "identifiers": {(DOMAIN, self._unique_id)},
            "name": self._name.replace("_city", ""),
            "manufacturer": MANUFACTURER,
            "model": "和风天气API",
            "entry_type": DeviceEntryType.SERVICE,
            "sw_version": VERSION
        }
    
    @property
    def native_value(self):
        """返回文本值。"""
        return self._city
    
    @property
    def icon(self):
        """返回图标。"""
        return "mdi:city"
    
    async def async_set_value(self, value):
        """设置文本值。"""
        self._city = value
        
        # 更新配置条目
        for entry in self.hass.config_entries.async_entries(DOMAIN):
            if entry.unique_id == self._unique_id:
                self.hass.config_entries.async_update_entry(
                    entry,
                    data={
                        **entry.data,
                        "城市搜索": value,
                        "text.set_city": value
                    }
                )
                
                # 查找关联的天气实体并发送更新信号
                from homeassistant.helpers.dispatcher import async_dispatcher_send
                from homeassistant.helpers.entity_registry import async_get
                
                # 获取实体注册表
                entity_registry = async_get(self.hass)
                 
                # 查找与当前配置条目关联的天气实体
                _LOGGER.debug(f"开始查找与配置条目关联的天气实体，entry_id={entry.entry_id}")
                weather_entities = []
                for entity_id, entity_entry in entity_registry.entities.items():
                    if not entity_id.startswith("weather."):
                        continue
                    
                    _LOGGER.debug(f"检查天气实体 {entity_id}，其config_entry_id={entity_entry.config_entry_id}")
                    if entity_entry.config_entry_id == entry.entry_id:
                        weather_entities.append(entity_id)
                        _LOGGER.debug(f"找到直接关联的天气实体: {entity_id}")
                
                # 重载集成以更新所有关联的天气实体
                _LOGGER.debug(f"重载集成以更新天气实体: {value}")
                await self.hass.services.async_call(
                    "homeassistant",
                    "reload_config_entry",
                    {"entry_id": entry.entry_id},
                    blocking=True
                )
                _LOGGER.info(f"已重载集成: {value}")
                break
    
    async def async_added_to_hass(self):
        """当实体被添加到 Home Assistant 时调用。"""
        
        @callback
        async def handle_update_signal(data):
            """处理更新信号。"""
            if "city" in data:
                self._city = data["city"]
            
            if "text.set_city" in data:
                # 保持 text.set_city 的值，但不影响实体显示值
                pass
            
            self.async_write_ha_state()
