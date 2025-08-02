
"""
QWeather 配置流程模块
此模块处理 QWeather 插件的配置流程，包括用户输入验证、API 密钥验证和位置选择。
"""
import logging
import requests
import json
import sys
import time
import homeassistant.helpers.config_validation as cv
from homeassistant.const import CONF_HOST, CONF_API_KEY, CONF_NAME, ATTR_ENTITY_ID
from collections import OrderedDict
from homeassistant import config_entries
from homeassistant.core import callback
from .const import (
    DOMAIN,
    CONF_ZONE_OR_DEVICE,
    CONF_STARTTIME,
    CONF_UPDATE_INTERVAL,
    CONF_NO_UPDATE_AT_NIGHT,
    )
import voluptuous as vol

_LOGGER = logging.getLogger(__name__)

@config_entries.HANDLERS.register(DOMAIN)

#新建集成
class QWeatherConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        # 获取此处理器的选项流程
        return QweatherOptionsFlow(config_entry)

    def __init__(self):
        """Initialize."""
        self._errors = {}
    
    def get_data(self, url, config):
        headers = {"X-QW-Api-Key": config[CONF_API_KEY]}
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            _LOGGER.error("请求失败: %s", e)
            return None

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        self._errors = {}
        
        # 注册服务
        async def async_set_city(call):
            """Handle the service call to set city."""
            data = call.data
            city = call.data.get("city")
            entity_id = data.get(ATTR_ENTITY_ID)
            
            if not entity_id:
                _LOGGER.error("Missing required parameter: entity_id")
                return
            if not entity_id.startswith("weather."):
                _LOGGER.error("必须是weather实体类型")
                return
            if not city:
                _LOGGER.error("必须包含属性: city")
                return
            
            # 更新城市值
            # 查找匹配的配置条目
            _LOGGER.debug(f"开始查找与实体 {entity_id} 关联的配置条目")
            matching_entry = None
            
            # 获取实体注册信息
            entity_registry = self.hass.data["entity_registry"]
            entity_entry = entity_registry.async_get(entity_id)
            
            if not entity_entry:
                _LOGGER.error(f"实体 {entity_id} 未在实体注册表中找到")
                return
            
            # 遍历所有配置条目
            for entry in self.hass.config_entries.async_entries(DOMAIN):
                # 检查配置条目ID是否与实体关联
                if entry.entry_id == entity_entry.config_entry_id:
                    matching_entry = entry
                    break
                
                # 检查实体ID是否存储在entry.data中
                if "entity_id" in entry.data and entry.data["entity_id"] == entity_id:
                    matching_entry = entry
                    break
                
                # 检查实体ID是否存储在entry.options中
                if "entity_id" in entry.options and entry.options["entity_id"] == entity_id:
                    matching_entry = entry
                    break
            
            if not matching_entry:
                _LOGGER.error(f"未找到与天气实体 {entity_id} 关联的配置条目")
                return
                
            self.hass.config_entries.async_update_entry(
                matching_entry,
                data={
                    **matching_entry.data,
                    "城市搜索": city
                }
            )
            _LOGGER.info(f"已为天气实体 {entity_id} 更新城市为 {city}")
        
        # 注册服务
        self.hass.services.async_register(
            DOMAIN, 
            "set_city",
            async_set_city,
            schema=vol.Schema({
                vol.Required(ATTR_ENTITY_ID): cv.entity_id,
                vol.Required("city"): str
            })
        )
        
        if user_input is not None:
            if user_input["location_mode"] == "选择设备":
                if CONF_ZONE_OR_DEVICE in user_input:
                    # 验证实体是否存在
                    entity_id = user_input[CONF_ZONE_OR_DEVICE].split("(")[-1].split(")")[0].strip()
                    entity_state = self.hass.states.get(entity_id)  # 获取真正的实体对象
                    
                    # 验证实体是否有经纬度属性
                    if "longitude" not in entity_state.attributes or "latitude" not in entity_state.attributes:
                        self._errors["base"] = f"{entity_id} 实体没有经纬度属性"
                        return await self._show_config_form(user_input)
                    
                    # 保存配置
                    return self.async_create_entry(
                        title=user_input[CONF_NAME],
                        data=user_input,
                    )
                else:
                    self._errors["base"] = "请选择设备或区域"
                    return await self._show_config_form(user_input)
            
            # 验证 API 密钥
            url = f"https://{user_input[CONF_HOST]}/v7/weather/now?location=116.41,39.92&lang=zh&unit=m"
            redata = await self.hass.async_add_executor_job(
                self.get_data, url, user_input
            )
            
            if not redata or redata.get('code') != "200":
                self._errors["base"] = "communication"
                _LOGGER.debug("API响应: %s", redata)
            else:
                await self.async_set_unique_id(f"qweather_{user_input[CONF_NAME].replace(' ', '_')}")
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=user_input[CONF_NAME], data=user_input
                )
            
            return await self._show_config_form(user_input)
        
        return await self._show_config_form(user_input)


    async def _show_config_form(self, user_input=None):
        """Show the configuration form."""
        if user_input is None:
            user_input = {}
            
        # 获取所有 zone 和 device_tracker 实体
        zone_entities = [
            f"{state.attributes.get('friendly_name', state.entity_id)} ({state.entity_id})" for state in self.hass.states.async_all()
            if state.domain == "zone"
        ]
        device_tracker_entities = [
            f"{state.attributes.get('friendly_name', state.entity_id)} ({state.entity_id})" for state in self.hass.states.async_all()
            if state.domain == "device_tracker"
        ] 
 
        # 合并实体列表
        entity_list =  zone_entities + device_tracker_entities
        
        # 设置默认名称，如果实体列表为空则使用默认名称
        default_name = user_input.get(CONF_NAME, "和风天气")
        if entity_list and len(entity_list) > 0:
            default_name = user_input.get(CONF_NAME, entity_list[0].split("(")[0].strip())
        
        base_schema = {
            vol.Required(CONF_NAME, default=default_name): str,
            vol.Required(CONF_API_KEY, default=user_input.get(CONF_API_KEY, "")): str,
            vol.Required(CONF_HOST, default=user_input.get(CONF_HOST, "api.qweather.com")): str,
            vol.Required("location_mode", default=user_input.get("location_mode", "device")): vol.In(["选择设备", "城市搜索"]),
        }

        if user_input.get("location_mode", "device") == "选择设备":
            base_schema.update({
                vol.Optional(CONF_ZONE_OR_DEVICE, default=user_input.get(CONF_ZONE_OR_DEVICE, "")): vol.In(entity_list),
            })
        else:
            base_schema.update({
                vol.Optional("城市搜索", default=user_input.get("城市搜索", "北京")): str,
            })

        data_schema = vol.Schema(base_schema).extend({
            vol.Optional(CONF_UPDATE_INTERVAL, default=user_input.get(CONF_UPDATE_INTERVAL, 60)): vol.In({10: "10分钟", 20: "20分钟", 30: "30分钟", 60: "60分钟"}),
            vol.Optional(CONF_NO_UPDATE_AT_NIGHT, default=user_input.get(CONF_NO_UPDATE_AT_NIGHT, False)): bool
        })
        return self.async_show_form(
            step_id="user",
            data_schema = data_schema, 
            errors=self._errors,
        )

    async def async_step_import(self, user_input):
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        return self.async_create_entry(title="configuration.yaml", data={})
    
    async def _check_existing(self, host):
        for entry in self._async_current_entries():
            if host == entry.data.get(CONF_NAME):
                return True

#修改集成
class QweatherOptionsFlow(config_entries.OptionsFlow):
    # 初始化选项流
    def __init__(self, config_entry):
        # 不再直接设置 self.config_entry
        self._config_entry = config_entry  # 使用下划线前缀表示私有变量
        self._config = dict(config_entry.data)
        self._errors = {}

    async def async_step_init(self, user_input=None):
        return await self.async_step_user()

    async def _show_config_form(self, user_input=None):
        # 获取配置
        if user_input is None:
            user_input = {}
             
        # 获取所有 zone 和 device_tracker 实体
        zone_entities = [
            f"{state.attributes.get('friendly_name', state.entity_id)} ({state.entity_id})" for state in self.hass.states.async_all()
            if state.domain == "zone"
        ]
        device_tracker_entities = [
            f"{state.attributes.get('friendly_name', state.entity_id)} ({state.entity_id})" for state in self.hass.states.async_all()
            if state.domain == "device_tracker"
        ]
        
        # 合并实体列表
        entity_list =  zone_entities + device_tracker_entities
        
        # 设置默认名称，如果实体列表为空则使用默认名称
        default_name = user_input.get(CONF_NAME, "和风天气")
        if entity_list and len(entity_list) > 0:
            default_name = user_input.get(CONF_NAME, entity_list[0].split("(")[0].strip())
        
        data_schema = vol.Schema({
            vol.Required(CONF_NAME, default=default_name): str,
            vol.Required(CONF_API_KEY, default=user_input.get(CONF_API_KEY, "")): str,
            vol.Required(CONF_HOST, default=user_input.get(CONF_HOST, "api.qweather.com")): str,
            vol.Required("location_mode", default="device"): vol.In(["选择设备", "城市搜索"]),
            vol.Optional("城市搜索", default=user_input.get("城市搜索", "")): str,
            vol.Optional(CONF_ZONE_OR_DEVICE, default=user_input.get(CONF_ZONE_OR_DEVICE, "")): vol.In(entity_list),
            vol.Optional("城市搜索", default=user_input.get("城市搜索", "")): str,
        }).extend({
            vol.Optional(CONF_UPDATE_INTERVAL, default=user_input.get(CONF_UPDATE_INTERVAL, 60)): vol.In({10: "10分钟", 20: "20分钟", 30: "30分钟", 60: "60分钟"}),
            vol.Optional(CONF_NO_UPDATE_AT_NIGHT, default=user_input.get(CONF_NO_UPDATE_AT_NIGHT, False)): bool
        })
        return self.async_show_form(
            step_id="user",
            data_schema = data_schema,  
            errors=self._errors,
        )
    
    async def async_step_user(self, user_input=None):
        # 修改集成的配置选项
        if user_input is not None:
            # 确保更新间隔时间正确保存为整数值
            if CONF_UPDATE_INTERVAL in user_input:
                # 记录原始值和类型
                _LOGGER.debug(f"保存前的更新间隔值: {user_input[CONF_UPDATE_INTERVAL]}, 类型: {type(user_input[CONF_UPDATE_INTERVAL])}")
                # 确保是整数
                user_input[CONF_UPDATE_INTERVAL] = int(user_input[CONF_UPDATE_INTERVAL])
                _LOGGER.debug(f"保存后的更新间隔值: {user_input[CONF_UPDATE_INTERVAL]}, 类型: {type(user_input[CONF_UPDATE_INTERVAL])}")
            
            # 直接返回选项，而不是更新self._config
            return self.async_create_entry(title="", data=user_input)

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_API_KEY,
                        default=self._config_entry.options.get(CONF_API_KEY, "")
                    ): str,
                    vol.Optional(
                        CONF_HOST,
                        default=self._config_entry.options.get(CONF_HOST, "api.qweather.com")
                    ): str,
                    vol.Optional(
                        CONF_UPDATE_INTERVAL,
                        default=self._config_entry.options.get(CONF_UPDATE_INTERVAL, 60)
                    ): vol.In({10: "10分钟", 20: "20分钟", 30: "30分钟", 60: "60分钟"}),
                    vol.Optional(
                        CONF_NO_UPDATE_AT_NIGHT,
                        default=self._config_entry.options.get(CONF_NO_UPDATE_AT_NIGHT, False)
                    ): bool,
                }
            )
        )
