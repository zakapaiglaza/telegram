import TelegramBot,{ ReplyKeyboardMarkup } from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import {HandlerI} from "./Handlers/HandlerI";
import { PogodHandler } from './Pogoda/PogodHandler';
import { helloMessage, helpMessage, unknownMessage } from './textForResponse/text';
import Redis from 'ioredis';
import RedisManager from './redis/redis';
const redisManager = RedisManager.getInstance();
dotenv.config();

export interface UserMessage {
    text: string;
    chat: {
        id: number;
    };
}

export class ChatHandler {
    
    protected handlers = new Map<string, HandlerI>()
    private currentChatId: number | null = null;
    private redisClient: Redis;

    constructor(private bot: TelegramBot) {
        this.redisClient = redisManager.getClient();
    }
    
    private getPogodHandler(): PogodHandler {
        const pogodHandler = new PogodHandler();
        pogodHandler.setBot(this.bot);
        return pogodHandler;
    }
    public setChatId(chatId: number): void {
        this.currentChatId = chatId;
    }

    public basicKeyboard() {
        if (this.currentChatId !== null) {
            const keyboard: TelegramBot.KeyboardButton[][] = [
                [{ text: 'Погода' }, { text: '2' }, { text: '3' }],
            ];
            const replyMarkup: ReplyKeyboardMarkup = { keyboard, one_time_keyboard: true };
            this.bot.sendMessage(this.currentChatId, 'Выберите опцию:', { reply_markup: replyMarkup });
        }
    }


    public addHandler(handler: HandlerI){
        handler.setBot(this.bot)
        this.handlers.set(handler.getCommand(), handler)
    }
//=================================================
    public messageHandler(msg: UserMessage) {
        const text = msg.text;
        const chatId = msg.chat.id;

        if (text) {
            if (text.startsWith('/start')) {
                this.sendMessage(chatId,helloMessage);
            } else if (text.startsWith('/hello')) {
                this.sendMessage(chatId,helpMessage);
            } else if(this.handlers.has(text)){
                try {
                    this.handlers.get(text)?.process(chatId)
                }catch (e){
                    this.bot.sendMessage(chatId, `${(e as Error).message}`);
                }
            } else if(text.toLowerCase() === 'погода') {
                const pogodHandler = this.getPogodHandler();
                pogodHandler.OptionsPanel(chatId);
                
            } else {
                this.sendMessage(chatId,unknownMessage);
            }
        }
    }

    public sendMessage(chatId: number, message:string) {
        this.bot.sendMessage(chatId, message);
        this.setChatId(chatId);
        this.basicKeyboard();
    }

}

