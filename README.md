# Weather-Bot

A replacement for your boring local weatherman.

## Installation

You'll need to first setup local enviornment variables for the [OpenWeather API](https://openweathermap.org/api)
and the [OpenAI API](https://platform.openai.com/docs/overview).

```bash
export OPENWEATHER_API_KEY=[API_KEY]
export OPENAI_API_KEY=[API_KEY]
```

Install the dependencies:

```bash
npm i ts-node -g
npm install
```

## Usage

```bash
ts-node ./src/index.ts [ZIPCODE]
```
