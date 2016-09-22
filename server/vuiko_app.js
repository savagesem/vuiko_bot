import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { HTTP } from 'meteor/http'

//package for parsing html in jquery style
import  Cheerio from 'cheerio';

//Telegram bot API from npi
import TelegramBot from 'telegram-bot-api';

const Words = new Mongo.Collection('words');
const LINK = 'http://proridne.org/%D0%A1%D0%BB%D0%BE%D0%B2%D0%BD%D0%B8%D0%BA%20%D0%B4%D1%96%D0%B0%D0%BB%D0%B5%D0%BA%D1%82%D0%BD%D0%B8%D1%85%20%D1%82%D0%B0%20%D0%BC%D0%B0%D0%BB%D0%BE%D0%B2%D0%B6%D0%B8%D0%B2%D0%B0%D0%BD%D0%B8%D1%85%20%D1%81%D0%BB%D1%96%D0%B2/';

export default class VuikoApp{
    //default constructor for our application
    constructor(){

        //Creates telegram bot object
        this.bot = new TelegramBot({
            token: Meteor.settings.telegramToken,
            updates: {
                enabled: true
            }
        });

        const app = this;

        //Binding telegram to our meteor environment and start listening incoming messages
        this.bot.on('message', Meteor.bindEnvironment(function(message)
        {
            app.receiveMessage(message.from.id, message.text, message.from.first_name)
        }));
    }

    //fills database from the link
    static fillDb(){
        //Checks if database is empty
        if (Words.find().count() > 0){
            return;
        }

        //Loads page context to cheerio
        $ = Cheerio.load(HTTP.get(LINK).content);

        //Selects all our words
        const list = $('section li');

        //Adds formatted words data into database
        for (let i=0; i<list.length; i++){
            let word = $(list[i]).text().split('—');

            if (word[0] && word[1]) {
                Words.insert({word: word[0].trim(), interpr: word[1].trim()});
            }
        }
    }

    //sends message to user using telegram bot API
    sendMessage(userId, text){
        this.bot.sendMessage({
            chat_id: userId,
            text: text,
            parse_mode: 'HTML'
        }).catch((err)=>{
            console.log(err);

            if (err.statusCode == 403){
                return err;
            }
        });
    }

    //Finds random word from the database
    sendRandomWord(userId){
        const count = Words.find().count() - 1;
        const rand = Math.floor(Math.random() * count);
        const randomWord = Words.findOne({}, {skip: rand});

        if (randomWord){
            const text = '<b>'+randomWord.word+'</b> - '+randomWord.interpr;
            this.sendMessage(userId, text);
        }
    }

    //Trying to find word in database based on the received text
    findWord(userId, text){
        if (text.length < 3){
            this.sendMessage(userId, '<b>Слово повинно містити не менше 3 символів!</b>');
            return;
        }
        const words = Words.find({word: {$regex:'(?i)'+text}}).fetch();

        let textToSend = 'Слово в словнику не знайдено, спробуйте інше, або /random';
        if(words.length == 0){
            this.sendMessage(userId, textToSend);
            return;
        }

        for (let word of words){
            textToSend = '<b>'+word.word+'</b> - '+word.interpr;
            this.sendMessage(userId, textToSend);
        }
    }

    //Receives text message from the telegram bot API
    receiveMessage(from, text, username){
        text = text.toLowerCase();

        switch (text){
            case '/random':
                this.sendRandomWord(from);
                break;
            default:
                this.findWord(from, text);

        }
    }
}
