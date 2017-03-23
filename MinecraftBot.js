const Logger       = require('frozor-logger');
const EventEmitter = require('events');
const chalk        = require('chalk');
const mineflayer   = require('mineflayer');

const Color = {
    JSON: {
        black:        chalk.black.bold,
        dark_blue:    chalk.blue,
        dark_green:   chalk.green,
        dark_aqua:    chalk.cyan,
        dark_red:     chalk.red,
        dark_purple:  chalk.magenta,
        gold:         chalk.yellow,
        gray:         chalk.white,
        dark_gray:    chalk.gray,
        blue:         chalk.blue,
        green:        chalk.green,
        aqua:         chalk.cyan.bold,
        red:          chalk.red.bold,
        light_purple: chalk.magenta.bold,
        yellow:       chalk.yellow,
        white:        chalk.white.bold,
        reset:        chalk.white,
        get:          (c)=> Color.JSON[c] || Color.JSON.white
    },
    MINECRAFT: {
        4: chalk.red,
        c: chalk.red.bold,
        6: chalk.yellow,
        e: chalk.yellow,
        2: chalk.green,
        a: chalk.green,
        b: chalk.blue.bold,
        3: chalk.cyan,
        1: chalk.blue,
        9: chalk.blue,
        d: chalk.magenta.bold,
        5: chalk.magenta,
        f: chalk.white.bold,
        7: chalk.white,
        l: chalk.bold,
        n: chalk.underline,
        o: chalk.italics,
        m: chalk.strikethrough,
        r: chalk.reset,
        get: (c)=> Color.MINECRAFT[c] || Color.JSON.white
    }
};

class MinecraftBot extends EventEmitter{
    /**
     * @param {string} host - The IP of the server you are connecting to.
     * @param {string, number} port - The port to connect to
     * @param {string} username - The username you want to log in with
     * @param {string} password - The password you want to use to log in
     * @param {boolean} silent - Whether the bot should be silent
     * @param {string} prefix - What prefix the bot should use for the logger
     */
    constructor(username, password, host = 'localhost', port = 25565, silent = false, prefix){
        super();
        this.log      = new Logger(((prefix)?prefix+'-':'')+'MINECRAFTBOT');

        this.self     = this;
        this.bot      = null;
        this.server   = null;
        this.host     = host;
        this.port     = port;
        this.username = username;
        this.password = password;

        this.message_queue          = [];
        this.message_queue_last     = 0;

        setInterval(()=>{
            let timeNow = Date.now()/1000;
            if(this.message_queue.length > 0){
                let messageToSend = this.message_queue.shift();
                this.chat(messageToSend);
                this.message_queue_last = timeNow;
            }
        }, 1000);

        if(silent){
            this.log.transports.console.level = 'warn';
        }
    }

    init(){
        this.log.info(`Logging into ${chalk.cyan(this.host)}...`, 'INIT');
        
        this.bot = mineflayer.createBot({
            host    : this.host,
            port    : this.port,
            username: this.username,
            password: this.password
        });

        this.registerEvents();
    }

    getBot(){
        return this.bot;
    }

    getUsername(){
        return this.bot.username;
    }

    registerEvents(){
        this.bot.on('login', ()=>{
            this.log.info(`Logged into ${chalk.cyan(this.host)} as ${chalk.cyan(this.bot.username)}`, "SELF");
        });

        this.bot.on('message', (packet)=>{
            let message = packet.toString().replace(/  /g, ' ');

            this.self.emit('chat', message.replace(/\u00A7[0-9A-FK-OR]/ig,''), packet);

            let coloredMessage = MinecraftBot.consoleColorChat(message, packet);

            if(coloredMessage){
                if(chalk.stripColor(coloredMessage).indexOf('GWEN >') > -1) return;

                this.log.info(coloredMessage, 'CHAT');
            }
        });

        this.bot.on('kicked', (reason)=>{
            this.log.error(`I just got kicked for the reason ${chalk.red(JSON.stringify(reason))}!`);
        });
    }

    static consoleColorChat(chat, packet){
        let message = '';

        if(!chat.includes('§')){
            let extra = packet.json.extra;

            if(!extra) return chat;

            extra.map((i)=> (typeof i == 'string') ? {color: 'white', text: i} : i)
                .forEach((i)=> message += (Color.JSON.get(i.color))(i.text));
        }else{
            chat.split('§')
                .filter((i)=> i.length > 1)
                .map((i)=> ({ code: i.substr(0, 1), text: i.substr(1)}) )
                .forEach((i)=> message += (Color.MINECRAFT.get(i.code))(i.text));
        }

        return message;
    }

    /**
     * @method - Generally, don't use this method directly.
     * Only for high-priority messages that need to be sent immediately.
     *
     * @param message - The message to send in chat.
     */
    chat(message){
        this.bot.chat(message);
    }

    /**
     * @method - This method queues messages so that the Minecraft Bot isn't hit by Mineplex's
     * command center, which limits at just below 1 message/second. To do this, the bot stores
     * the last sent message, and when another message is requested to be sent the two compare
     * to see if one has been sent in the last second. If so, it is added to this.message_queue
     * which is processed at a regular interval. Additionally, if there are messages pending
     * in the queue, even if it has been more than a second since the last message, the message
     * will be added to the message queue.
     *
     * @param message - The chat message to queue.
     */
    queueMessage(message){
        let timeNow = Date.now()/1000;
        if((typeof message).toLowerCase() != 'string') message = message.toString();
        
        let last_message_difference = timeNow - this.message_queue_last;
        if(this.message_queue.length > 0){
            this.message_queue.push(message);
        }else if(last_message_difference >= 1){
            this.chat(message);
            this.message_queue_last = timeNow;
        }else{
            this.message_queue.push(message);
        }
    }

    getMessageQueue(){
        return this.message_queue;
    }

    end(){
        if(!this.bot) return;
        this.bot.quit();
        this.bot.end();
    }
}

module.exports = MinecraftBot;