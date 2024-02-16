import OpenAI from 'openai';
const { OPENWEATHERMAP_API_KEY, OPEN_AI_API_KEY } = process.env;
import { promises as fsPromises } from 'fs';
import { resolve as resolvePath } from 'path';

const openai = new OpenAI({
  apiKey: OPEN_AI_API_KEY as string,
});

const DAYS = 3;

interface WeatherData {
  date: Date;
  high: number;
  low: number;
  humidity: number;
  morning_temp: number;
  evening_temp: number;
  wind_speed: number;
  cloudiness: number;
  conditions: string[];
}

/**
 * Makes call to openweathermap to get data
 */
export const getWeather = async (
  zipCode: number | string
): Promise<WeatherData> => {
  const geoData = await fetch(
    `http://api.openweathermap.org/geo/1.0/zip?zip=${zipCode},US&appid=${OPENWEATHERMAP_API_KEY}`
  );
  const geoDataRes = await geoData.json();
  const { lat, lon } = geoDataRes;
  const weatherData = await fetch(
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}`
  );
  const weatherDataRes = await weatherData.json();
  const parsedData = weatherDataRes.daily.map((data: any, idx: number) => {
    return DAYS < idx + 1
      ? null
      : {
          date: new Date(data.dt * 1000),
          high: data.temp.max,
          low: data.temp.min,
          humidity: data.humidity,
          morning_temp: data.temp.morn,
          evening_temp: data.temp.eve,
          wind_speed: data.wind_speed,
          cloudiness: data.clouds,
          conditions: data.weather.map(d => d.main),
        };
  });
  return parsedData;
};

/**
 * Calls OpenAI API and streams response
 */
export const generateReport = async (data: any): Promise<string> => {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `
        You are a bot designed to help people understand the weather.

        You will be given data from the OpenWeatherMap API and asked to generate a report
        based on the data.

        Temperatures will be in Kelvin. You should convert them to Fahrenheit and not include
        the Kelvin values in your output. Output temperatures to the nearest degree and use the
        format of {number} degrees instead of {number}°F. For example, "72 degrees".

        Round wind speeds to the nearest 5 mph. If under 5 mph, report "Calm".

        Use the tone of a local weather reporter. You should be informative and professional,
        but also friendly and engaging.

        Use relative days (e.g. "tomorrow" or the name of the day) instead of specific dates.
        `,
      },
      {
        role: 'user',
        content: `
        Use the following data to generate a report:

        """${JSON.stringify(data)}"""

        Provide a summary of the weather data and any trends or patterns that 
        you notice.
        `,
      },
    ],
    stream: true,
    temperature: 0,
  });
  let compiledOutput = '';
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
    compiledOutput += chunk.choices[0]?.delta?.content || '';
  }
  return compiledOutput;
};

const generateAudioReport = async (text: string): Promise<void> => {
  const speechFile = resolvePath('./report.mp3');
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'onyx',
    input: text,
  });
  console.log(`\n\n---\n\nGenerating audio report, Please wait...`);
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fsPromises.writeFile(speechFile, buffer);
};

/**
 * Triggers weather data acquisition functions and then runs report generator
 */
const runBot = async (): Promise<void> => {
  console.clear();
  const weatherData = await getWeather(process.argv[process.argv.length - 1]);
  const textReport = await generateReport(weatherData);
  await generateAudioReport(textReport);
};

runBot();
