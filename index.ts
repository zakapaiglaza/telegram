import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { ChatHandler } from './app';
import { UserMessage } from './app';
import { PogodHandler } from './Pogoda/PogodHandler';

dotenv.config();

class TelegramBotApp {
    bot: TelegramBot;

    constructor() {
        const token = process.env.BOT_TOKEN!;

        this.bot = new TelegramBot(token, { polling: true });

        const chatHandler = new ChatHandler(this.bot);
        chatHandler.addHandler(new PogodHandler())

        this.bot.on('message', (msg) => {
            if(msg.text) {
                chatHandler.messageHandler(msg as UserMessage)
            } else {
                console.error('пиши текст буквами!')
            }
        });

        console.log('Бот работает');
    }
}

const Bot = new TelegramBotApp();
