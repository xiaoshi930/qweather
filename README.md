# 和风天气-官方API版
基于原作者https://github.com/dscao/qweather 代码修改  

## 官方接口说明
[官方开发文档](https://dev.qweather.com/docs/)   
[和风天气数据更新时间](https://dev.qweather.com/docs/resource/glossary/#update-time)  

## 更新说明  
2025.08.08  
1、增加ha启动时，优先启动“移动应用” ，后启动本集成  

2025.08.02  
1、完善修改集成的逻辑 

2025.08.02  
1、删除天气预报（预报来源api不可访问）  
2、修复更新时间间隔不生效问题  

2025.07.29  
发布初始版本

## 如何下载
1、先添加自定义集成，后在HACS中搜索"和风天气"，安装此集成，重启Home Assistant  
2、将 `qweather` 文件夹复制到你的 Home Assistant 配置目录下的 `custom_components` 文件夹中，重启 Home Assistant

## 搜索天气说明
搜索天气的实体在城市为空时，是不再提供的状态，是正常的，别手动给删除了
录入城市后会重新加载的
