import TelegramBot from "node-telegram-bot-api";

export interface HandlerI {
    process(chatId: number): void
    setBot( bot: TelegramBot): void
    getCommand():string
}
