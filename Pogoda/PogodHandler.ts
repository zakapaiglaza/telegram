import TelegramBot,{InlineKeyboardButton, InlineKeyboardMarkup} from "node-telegram-bot-api";
import axios from "axios";
import {HandlerI} from "../Handlers/HandlerI";
import {HandlerError} from "../Handlers/HandlerError";
import {DecoratedPogodaData, PogodaResponse} from "./InterfacesData";
import { KeyboardSett } from "../Handlers/HandlersKeyboard";
import Redis from 'ioredis';
import RedisManager from "../redis/redis";
const redisManager = RedisManager.getInstance();
const apiKey = process.env.POGODA_API_KEY;

export class PogodHandler implements HandlerI{
    // @ts-ignore
    private bot: TelegramBot;
    private keyboardSett: KeyboardSett;
    private redisClient: Redis;
    

    constructor() {
        this.redisClient = redisManager.getClient();
        this.keyboardSett = new KeyboardSett(this);
    }

    getCommand(): string {
        return "/pogoda";
    }
    public OptionsPanel(chatId: number) {
        const cities = ['Kyiv', 'Kharkiv', 'Lviv'];
        const keyboard: InlineKeyboardButton[][] = cities.map(city => [
                { text: `${city}`, callback_data: `city_${city}` }
            ]);
        const inlineSettingKeyboard: InlineKeyboardMarkup = { inline_keyboard: keyboard }
            this.bot.sendMessage(chatId, 'Выберите город:', { reply_markup: inlineSettingKeyboard });

    }


    async process(chatId: number) {
        try {
            const apiKey = process.env.POGODA_API_KEY;
            if (!apiKey) {
                throw new HandlerError('нет ключа', 'POGODA_API_KEY не найден!');
            }           
            this.OptionsPanel(chatId);
        } catch (e) {
            this.bot.sendMessage(chatId, `${(e as HandlerError).message}`);
        }
    }

    public async AxiosPogodaAndSend(chatId: number,city:string){
        try {
            const cachedData = await this.redisClient.get(`pogoda:${city}`);
            
            if (cachedData !== null) {
                const parseData = JSON.parse(cachedData);
                const message = this.renderMessage(this.decorateData(parseData))
                this.bot.sendMessage(chatId,message);
                
            } else {
                const apiUrl = `https://api.openweathermap.org/data/2.5/weather?&lang=ua&appid=${apiKey}`;
                
                const res = await axios.get<PogodaResponse>(apiUrl, {
                    params: { q: city, units: 'metric'}
                });
                const pogodaData: PogodaResponse = res.data;
                this.TimeSaveToRedis(city,pogodaData);

                const message = this.renderMessage(this.decorateData(pogodaData));
                this.bot.sendMessage(chatId, message);
            }
        } catch(e) {
            this.bot.sendMessage(chatId, `${(e as HandlerError).message}`);
        }
    }

    public renderMessage(data: DecoratedPogodaData):string
    {
        const message = `Погода в ${data.city}:\n${data.emoji} Температура: ${data.temperature} градусов\nМинимальная температура: ${data.temp_min}' ' Максимальная: ${data.temp_max}\nСостояние: ${data.description}\nСкорость ветра: ${data.speed}`;
        return message
    }
    public TimeSaveToRedis(city:string,pogodaData:PogodaResponse){
        try {
            const decorateData = this.decorateData(pogodaData)
            const settingData = `pogoda${city}`

            const hashData: Record<string,string | number> = {
                'temperature': decorateData.temperature,
                'speed': decorateData.speed,
                'description': decorateData.description,
            };
            this.redisClient.hmset(settingData, hashData);

            const data = new Date();
            const data2 = new Date(data);
            data2.setHours(23,59,59);
            const TimeToEnd = data2.getTime() - data.getTime(); 
            console.log(`до конца дня: ${data2}`);
            // const TimeToEnd = 12 * 60 * 60;
            this.redisClient.expire(settingData, TimeToEnd);
            // this.redisClient.setex(settingData,TimeToEnd,JSON.stringify(pogodaData));
        } catch(e) {
            console.error(`не могу сохранить в redis: ${(e as HandlerError).message}`)
        }
    }
    
    private decorateData(pogodaData:PogodaResponse):DecoratedPogodaData
    {
        const temperature = (pogodaData.main.temp - 273.15).toFixed(2);
        const description = pogodaData.weather[0].description;
        const speed = pogodaData.wind.speed;
        const temp_min = (pogodaData.main.temp_min - 273.15).toFixed(2);
        const temp_max = (pogodaData.main.temp_max - 273.15).toFixed(2);
        const emoji = this.emojiPogoda(description);
        const city = pogodaData.name;

        return {
            temperature,
            description,
            speed,
            temp_min,
            temp_max,
            city,
            emoji,
        };
    }

    private emojiPogoda(description: string): string {

        const map = new Map<string, string>([
            ['ясно','☀️'],
            ['дождь','🌧️'],
            ['небольшой дождь','🌦️'],
            ['гроза','⛈️'],
            ['облачно','☁️'],
        ])

        return map.get(description) || '🌦️'
    }

    setBot(bot: TelegramBot): void {
        this.bot = bot;

        this.bot.on('callback_query', (query) => {
            this.keyboardSett.HandlerPressKey(query);
        })
    }
}
