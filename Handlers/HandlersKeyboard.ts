import { PogodHandler } from '../Pogoda/PogodHandler';

export class KeyboardSett {
    private pogodHandler: PogodHandler;

    constructor(pogodaHandler: PogodHandler) {
        this.pogodHandler = pogodaHandler;
    }

    public HandlerPressKey(query: any){
        const data = query.data;
        const chatId = query.message.chat.id;

        const city = data.replace('city_','');
        

        this.pogodHandler.AxiosPogodaAndSend(chatId,city);
    }
}