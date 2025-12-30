I have implemented the requested feature to add minutely precipitation data (2-hour forecast) to the QWeather integration.

Here is the summary of changes:

1.  **Configuration (`const.py`, `config_flow.py`)**:
    *   Added `CONF_ENABLE_MINUTELY` ("enable_minutely") constant.
    *   Added `ATTR_MINUTELY_FORECAST` ("minutely_forecast") constant.
    *   Updated the configuration flow (both initial setup and options flow) to include a checkbox for enabling "Minutes Precipitation" (`CONF_ENABLE_MINUTELY`).

2.  **Logic (`weather.py`)**:
    *   Updated `WeatherData` class:
        *   Added `minutely_url` pointing to `https://{host}/v7/minutely/5m`.
        *   Added logic to fetch data from this URL if enabled.
        *   Added logic to parse the `minutely` list and `summary` from the response.
    *   Defined `MinutelyForecast` dataclass to store precipitation amount and type.
    *   Updated `HeFengWeather` entity to expose the parsed data via the `minutely_forecast` attribute.
    *   The `summary` field is included as a special entry in the `minutely_forecast` list with `datetime="summary"`.

You can now configure the integration to enable "Minutes Precipitation" and the data will be available in the `minutely_forecast` attribute of the weather entity.