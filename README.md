# 和风天气-官方API版
基于原作者https://github.com/dscao/qweather 代码修改  

## 官方接口说明
[官方开发文档](https://dev.qweather.com/docs/)   
[和风天气数据更新时间](https://dev.qweather.com/docs/resource/glossary/#update-time)  

<img width="551" height="600" alt="image" src="https://github.com/user-attachments/assets/2f4a1236-53f0-43b3-b123-b857cf2c4341" />
<img width="2087" height="1342" alt="eec2780fa49e4732c0cacd5a5de91b8" src="https://github.com/user-attachments/assets/b2a3f10d-e10c-4dfc-aa9c-4c392ac9d140" />
<img width="2071" height="1338" alt="50385a12d46ceeecfbf1236c8c94560" src="https://github.com/user-attachments/assets/5a44f00f-2f25-4756-9057-a0b8e482d0c2" />





## 如何下载
1、先添加自定义集成，后在HACS中搜索"和风天气"，安装此集成，重启Home Assistant  
2、将 `qweather` 文件夹复制到你的 Home Assistant 配置目录下的 `custom_components` 文件夹中，重启 Home Assistant

## 搜索天气说明
搜索天气的实体在城市为空时，是不再提供的状态，是正常的，别手动给删除了
录入城市后会重新加载的
