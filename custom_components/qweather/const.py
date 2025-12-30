VERSION = '2025.7.29'
ROOT_PATH = '/qweather-local'
DEFAULT_NAME = "和风天气"
DOMAIN = "qweather"
PLATFORMS = ["weather", "text"]

ATTRIBUTION = "数据来源和风天气"
MANUFACTURER = "和风天气"
CONF_ZONE_OR_DEVICE="zone_or_device"
CONF_LOCATION_ID = "location_id"
CONF_API_KEY = "api_key"
CONF_API_VERSION = "api_version"
CONF_STARTTIME = "starttime"
CONF_UPDATE_INTERVAL = "update_interval_minutes"
CONF_NO_UPDATE_AT_NIGHT = "no_update_at_night"

# 新增API功能开关
CONF_ENABLE_HOURLY = "enable_hourly"
CONF_ENABLE_WARNING = "enable_warning"
CONF_ENABLE_AIR = "enable_air"
CONF_ENABLE_YESTERDAY = "enable_yesterday"
CONF_ENABLE_INDICES = "enable_indices"
CONF_ENABLE_MINUTELY = "enable_minutely"
ATTR_CONDITION_CN = "condition_cn"
ATTR_UPDATE_TIME = "update_time"
ATTR_AQI = "aqi"
ATTR_DAILY_FORECAST = "daily_forecast"
ATTR_HOURLY_FORECAST = "hourly_forecast"
ATTR_MINUTELY_FORECAST = "minutely_forecast"
ATTR_MINUTELY_SUMMARY = "minutely_summary"
ATTR_FORECAST_PROBABLE_PRECIPITATION = 'probable_precipitation'

CONDITION_CLASSES = {
    'sunny': ["晴"],
    'cloudy': ["多云"],
    'partlycloudy': ["少云", "晴间多云", "阴"],
    'windy': ["有风", "微风", "和风", "清风"],
    'windy-variant': ["强风", "疾风", "大风", "烈风"],
    'hurricane': ["飓风", "龙卷风", "热带风暴", "狂暴风", "风暴"],
    'rainy': ["雨", "毛毛雨", "小雨", "中雨", "大雨", "阵雨", "极端降雨"],
    'pouring': ["暴雨", "大暴雨", "特大暴雨", "强阵雨"],
    'lightning-rainy': ["雷阵雨", "强雷阵雨"],
    'fog': ["雾", "薄雾"],
    'hail': ["雷阵雨伴有冰雹"],
    'snowy': ["雪", "小雪", "中雪", "大雪", "暴雪", "阵雪"],
    'snowy-rainy': ["雨夹雪", "雨雪天气", "阵雨夹雪"],
}

# 定义信号常量
QWEATHER_UPDATE_SIGNAL = f"{DOMAIN}_update"
