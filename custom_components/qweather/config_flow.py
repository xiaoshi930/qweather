
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
    CONF_ENABLE_HOURLY,
    CONF_ENABLE_WARNING,
    CONF_ENABLE_AIR,
    CONF_ENABLE_YESTERDAY,
    CONF_ENABLE_INDICES,
    CONF_ENABLE_MINUTELY,
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
        self.user_input = {}
    
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
        """第1步：输入基本信息（名称、API密钥、API主机）"""
        self._errors = {}
        
        if user_input is not None:
            # 验证 API 密钥
            url = f"https://{user_input[CONF_HOST]}/v7/weather/now?location=116.41,39.92&lang=zh&unit=m"
            redata = await self.hass.async_add_executor_job(
                self.get_data, url, user_input
            )
            
            if not redata or redata.get('code') != "200":
                self._errors["base"] = "communication"
                _LOGGER.debug("API响应: %s", redata)
                return await self._show_user_form(user_input)
            else:
                # 保存用户输入到实例变量，以便在后续步骤中使用
                self.user_input = user_input
                # 进入第2步：选择模式
                return await self.async_step_mode()
        
        return await self._show_user_form(user_input)
    
    async def _show_user_form(self, user_input=None):
        """显示第1步表单：基本信息"""
        if user_input is None:
            user_input = {}
        
        data_schema = vol.Schema({
            vol.Required(CONF_NAME, default=user_input.get(CONF_NAME, "我的家")): str,
            vol.Required(CONF_API_KEY, default=user_input.get(CONF_API_KEY, "")): str,
            vol.Required(CONF_HOST, default=user_input.get(CONF_HOST, "api.qweather.com")): str,
        })
        
        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=self._errors,
        )
    
    async def async_step_mode(self, user_input=None):
        """第2步：选择模式（选择设备或城市搜索）"""
        self._errors = {}
        
        if user_input is not None:
            # 检查城市搜索模式是否已存在
            if user_input["location_mode"] == "城市搜索":
                # 检查是否已经存在使用城市搜索模式的集成
                for entry in self.hass.config_entries.async_entries(DOMAIN):
                    if entry.data.get("location_mode") == "城市搜索":
                        self._errors["base"] = "城市搜索模式只能添加1次集成"
                        return await self._show_mode_form(user_input)
            
            # 保存模式选择
            self.user_input.update(user_input)
            
            # 根据选择的模式进入不同的步骤
            if user_input["location_mode"] == "选择设备":
                return await self.async_step_device()
            else:
                return await self.async_step_city()
        
        return await self._show_mode_form(user_input)
    
    async def _show_mode_form(self, user_input=None):
        """显示第2步表单：选择模式"""
        if user_input is None:
            user_input = {}
        
        # 检查是否已存在城市搜索模式的集成
        city_search_exists = False
        for entry in self.hass.config_entries.async_entries(DOMAIN):
            if entry.data.get("location_mode") == "城市搜索":
                city_search_exists = True
                break
        
        # 如果已存在城市搜索模式，则只提供选择设备选项
        if city_search_exists:
            data_schema = vol.Schema({
                vol.Required("location_mode", default="选择设备"): vol.In(["选择设备"]),
            })
        else:
            data_schema = vol.Schema({
                vol.Required("location_mode", default="选择设备"): vol.In(["选择设备", "城市搜索"]),
            })
        
        return self.async_show_form(
            step_id="mode",
            data_schema=data_schema,
            errors=self._errors,
        )
    
    async def async_step_device(self, user_input=None):
        """第3步A：选择设备"""
        self._errors = {}
        
        if user_input is not None:
            if CONF_ZONE_OR_DEVICE in user_input:
                # 验证实体是否存在
                entity_id = user_input[CONF_ZONE_OR_DEVICE].split("(")[-1].split(")")[0].strip()
                entity_state = self.hass.states.get(entity_id)  # 获取真正的实体对象
                
                # 验证实体是否有经纬度属性
                if "longitude" not in entity_state.attributes or "latitude" not in entity_state.attributes:
                    self._errors["base"] = f"{entity_id} 实体没有经纬度属性"
                    return await self._show_device_form(user_input)
                
                # 保存设备选择
                self.user_input.update(user_input)
                
                # 进入第4步：更新周期设置
                return await self.async_step_update_interval()
            else:
                self._errors["base"] = "请选择设备或区域"
                return await self._show_device_form(user_input)
        
        return await self._show_device_form(user_input)
    
    async def _show_device_form(self, user_input=None):
        """显示第3步A表单：选择设备"""
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
        entity_list = zone_entities + device_tracker_entities
        
        data_schema = vol.Schema({
            vol.Required(CONF_ZONE_OR_DEVICE, default=user_input.get(CONF_ZONE_OR_DEVICE, "")): vol.In(entity_list),
        })
        
        return self.async_show_form(
            step_id="device",
            data_schema=data_schema,
            errors=self._errors,
        )
    
    async def async_step_city(self, user_input=None):
        """第3步B：输入城市"""
        self._errors = {}
        
        if user_input is not None:
            # 保存城市输入
            self.user_input.update(user_input)
            
            # 进入第4步：更新周期设置
            return await self.async_step_update_interval()
        
        return await self._show_city_form(user_input)
    
    async def _show_city_form(self, user_input=None):
        """显示第3步B表单：输入城市"""
        if user_input is None:
            user_input = {}
        
        data_schema = vol.Schema({
            vol.Required("城市搜索", default=user_input.get("城市搜索", "北京")): str,
        })
        
        return self.async_show_form(
            step_id="city",
            data_schema=data_schema,
            errors=self._errors,
        )
    
    async def async_step_update_interval(self, user_input=None):
        """第4步：设置更新周期"""
        self._errors = {}
        
        if user_input is not None:
            # 保存更新周期设置
            self.user_input.update(user_input)
            
            # 进入第5步：API功能选择
            return await self.async_step_api_features()
        
        return await self._show_update_interval_form(user_input)
    
    async def async_step_api_features(self, user_input=None):
        """第5步：选择API功能"""
        self._errors = {}

        if user_input is not None:
            # 验证：启用分钟预警必须启用小时预警
            if user_input.get(CONF_ENABLE_MINUTELY) and not user_input.get(CONF_ENABLE_HOURLY):
                self._errors["base"] = "启用分钟预警必须先启用小时预警"
                return await self._show_api_features_form(user_input)

            # 保存API功能设置
            self.user_input.update(user_input)

            # 创建配置条目
            await self.async_set_unique_id(f"qweather_{self.user_input[CONF_NAME].replace(' ', '_')}")
            self._abort_if_unique_id_configured()
            return self.async_create_entry(
                title=self.user_input[CONF_NAME],
                data=self.user_input
           )

        return await self._show_api_features_form(user_input)

    async def _show_update_interval_form(self, user_input=None):
        """显示第4步表单：设置更新周期"""
        if user_input is None:
            user_input = {}

        data_schema = vol.Schema({
            vol.Required(CONF_UPDATE_INTERVAL, default=user_input.get(CONF_UPDATE_INTERVAL, 60)): vol.In({10: "10分钟", 20: "20分钟", 30: "30分钟", 60: "60分钟"}),
            vol.Required(CONF_NO_UPDATE_AT_NIGHT, default=user_input.get(CONF_NO_UPDATE_AT_NIGHT, False)): bool
        })

        return self.async_show_form(
            step_id="update_interval",
            data_schema=data_schema,
            errors=self._errors,
        )

    async def _show_api_features_form(self, user_input=None):
        """显示第5步表单：选择API功能"""
        if user_input is None:
            user_input = {}

        data_schema = vol.Schema({
            vol.Required(CONF_ENABLE_HOURLY, default=user_input.get(CONF_ENABLE_HOURLY, False)): bool,
            vol.Required(CONF_ENABLE_MINUTELY, default=user_input.get(CONF_ENABLE_MINUTELY, False)): bool,
            vol.Required(CONF_ENABLE_WARNING, default=user_input.get(CONF_ENABLE_WARNING, False)): bool,
            vol.Required(CONF_ENABLE_AIR, default=user_input.get(CONF_ENABLE_AIR, False)): bool,
            vol.Required(CONF_ENABLE_YESTERDAY, default=user_input.get(CONF_ENABLE_YESTERDAY, False)): bool,
            vol.Required(CONF_ENABLE_INDICES, default=user_input.get(CONF_ENABLE_INDICES, False)): bool,
        })

        return self.async_show_form(
            step_id="api_features",
            data_schema=data_schema,
            errors=self._errors,
        )

    async def async_step_import(self, user_input):
        # 如果是城市搜索模式，检查是否已存在
        if user_input.get("location_mode") == "城市搜索":
            for entry in self._async_current_entries():
                if entry.data.get("location_mode") == "城市搜索":
                    return self.async_abort(reason="city_search_already_exists")
        
        # 对于其他模式，允许多次添加
        return self.async_create_entry(title="configuration.yaml", data=user_input)
    
    async def _check_existing(self, host):
        for entry in self._async_current_entries():
            if host == entry.data.get(CONF_NAME):
                return True

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
            vol.Optional(CONF_NO_UPDATE_AT_NIGHT, default=user_input.get(CONF_NO_UPDATE_AT_NIGHT, False)): bool,
            vol.Optional(CONF_ENABLE_HOURLY, default=user_input.get(CONF_ENABLE_HOURLY, False)): bool,
            vol.Optional(CONF_ENABLE_MINUTELY, default=user_input.get(CONF_ENABLE_MINUTELY, False)): bool,
            vol.Optional(CONF_ENABLE_WARNING, default=user_input.get(CONF_ENABLE_WARNING, False)): bool,
            vol.Optional(CONF_ENABLE_AIR, default=user_input.get(CONF_ENABLE_AIR, False)): bool,
            vol.Optional(CONF_ENABLE_YESTERDAY, default=user_input.get(CONF_ENABLE_YESTERDAY, False)): bool,
            vol.Optional(CONF_ENABLE_INDICES, default=user_input.get(CONF_ENABLE_INDICES, False)): bool
        })
        # 每次显示表单时不带出之前的参数
        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=self._errors,
        )
    
    async def async_step_user(self, user_input=None):
        # 修改集成的配置选项
        if user_input is not None:
            # 验证：启用分钟预警必须启用小时预警
            if user_input.get(CONF_ENABLE_MINUTELY) and not user_input.get(CONF_ENABLE_HOURLY):
                self._errors["base"] = "启用分钟预警必须先启用小时预警"
                config_data = {**self._config}
                config_data.update(self._config_entry.options)
                return self.async_show_form(
                    step_id="user",
                    data_schema=vol.Schema(
                        {
                            vol.Required(
                                CONF_API_KEY,
                                default=config_data.get(CONF_API_KEY, "")
                            ): str,
                            vol.Required(
                                CONF_HOST,
                                default=config_data.get(CONF_HOST, "api.qweather.com")
                            ): str,
                            vol.Required(
                                CONF_UPDATE_INTERVAL,
                                default=config_data.get(CONF_UPDATE_INTERVAL, 60)
                            ): vol.In({10: "10分钟", 20: "20分钟", 30: "30分钟", 60: "60分钟"}),
                            vol.Required(
                                CONF_NO_UPDATE_AT_NIGHT,
                                default=config_data.get(CONF_NO_UPDATE_AT_NIGHT, False)
                            ): bool,
                            vol.Required(
                                CONF_ENABLE_HOURLY,
                                default=config_data.get(CONF_ENABLE_HOURLY, False)
                            ): bool,
                            vol.Required(
                                CONF_ENABLE_MINUTELY,
                                default=config_data.get(CONF_ENABLE_MINUTELY, False)
                            ): bool,
                            vol.Required(
                                CONF_ENABLE_WARNING,
                                default=config_data.get(CONF_ENABLE_WARNING, False)
                            ): bool,
                            vol.Required(
                                CONF_ENABLE_AIR,
                                default=config_data.get(CONF_ENABLE_AIR, False)
                            ): bool,
                            vol.Required(
                                CONF_ENABLE_YESTERDAY,
                                default=config_data.get(CONF_ENABLE_YESTERDAY, False)
                            ): bool,
                            vol.Required(
                                CONF_ENABLE_INDICES,
                                default=config_data.get(CONF_ENABLE_INDICES, False)
                            ): bool,
                        }
                    ),
                    errors=self._errors,
                )

            # 确保更新间隔时间正确保存为整数值
            if CONF_UPDATE_INTERVAL in user_input:
                # 记录原始值和类型
                _LOGGER.debug(f"保存前的更新间隔值: {user_input[CONF_UPDATE_INTERVAL]}, 类型: {type(user_input[CONF_UPDATE_INTERVAL])}")
                # 确保是整数
                user_input[CONF_UPDATE_INTERVAL] = int(user_input[CONF_UPDATE_INTERVAL])
                _LOGGER.debug(f"保存后的更新间隔值: {user_input[CONF_UPDATE_INTERVAL]}, 类型: {type(user_input[CONF_UPDATE_INTERVAL])}")

            # 保留原始配置中的其他参数
            updated_data = {**self._config}
            # 更新用户修改的参数
            updated_data.update(user_input)
            # 记录日志
            _LOGGER.debug(f"更新后的配置: {updated_data}")

            # 更新配置条目的data
            self.hass.config_entries.async_update_entry(
                self._config_entry,
                data=updated_data
            )
            _LOGGER.info(f"已更新配置条目的data: {updated_data}")

            # 返回更新后的配置
            return self.async_create_entry(title="", data=updated_data)

        # 获取之前的配置值，优先使用data，然后使用options
        config_data = {**self._config}
        config_data.update(self._config_entry.options)
        
        # 记录当前配置状态，用于调试
        _LOGGER.debug(f"Options Flow 当前配置: {config_data}")
        _LOGGER.debug(f"原始data: {self._config}")
        _LOGGER.debug(f"options: {self._config_entry.options}")
        
        # 显示所有配置参数
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_API_KEY,
                        default=config_data.get(CONF_API_KEY, "")
                    ): str,
                    vol.Required(
                        CONF_HOST,
                        default=config_data.get(CONF_HOST, "api.qweather.com")
                    ): str,
                    vol.Required(
                        CONF_UPDATE_INTERVAL,
                        default=config_data.get(CONF_UPDATE_INTERVAL, 60)
                    ): vol.In({10: "10分钟", 20: "20分钟", 30: "30分钟", 60: "60分钟"}),
                    vol.Required(
                        CONF_NO_UPDATE_AT_NIGHT,
                        default=config_data.get(CONF_NO_UPDATE_AT_NIGHT, False)
                    ): bool,
                    vol.Required(
                        CONF_ENABLE_HOURLY,
                        default=config_data.get(CONF_ENABLE_HOURLY, False)
                    ): bool,
                    vol.Required(
                        CONF_ENABLE_MINUTELY,
                        default=config_data.get(CONF_ENABLE_MINUTELY, False)
                    ): bool,
                    vol.Required(
                        CONF_ENABLE_WARNING,
                        default=config_data.get(CONF_ENABLE_WARNING, False)
                    ): bool,
                    vol.Required(
                        CONF_ENABLE_AIR,
                        default=config_data.get(CONF_ENABLE_AIR, False)
                    ): bool,
                    vol.Required(
                        CONF_ENABLE_YESTERDAY,
                        default=config_data.get(CONF_ENABLE_YESTERDAY, False)
                    ): bool,
                    vol.Required(
                        CONF_ENABLE_INDICES,
                        default=config_data.get(CONF_ENABLE_INDICES, False)
                    ): bool,
                }
            )
        )
