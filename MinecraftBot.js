var EventEmitter = require('events');
var chalk        = require('chalk');
var mineflayer   = require('mineflayer');
var Entity       = require('./MinecraftEntity');

var mc_color_to_chalk = {
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
};

var json_color_to_chalk = {
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
    reset:        chalk.white
};

class MinecraftBot extends EventEmitter{
    /**
     * @param {string} host - The IP of the server you are connecting to.
     * @param {string, number} port - The port to connect to
     * @param {string} username - The username you want to log in with
     * @param {string} password - The password you want to use to log in
     */
    constructor(username, password, host, port, silent, prefix){
        super();
        this.log      = require('frozor-logger');
        this.self     = this;
        this._mf      = mineflayer;
        this._bot     = null;
        this._server  = null;
        this.host     = host;
        this.port     = port;
        this.username = username;
        this.password = password;

        this.message_queue          = [];
        this.message_queue_last     = 0;
        setInterval(()=>{
            var timeNow = Date.now()/1000;
            if(this.message_queue.length > 0){
                var messageToSend = this.message_queue.splice(0, 1).toString();
                this.chat(messageToSend);
                this.message_queue_last = timeNow;
            }
        }, 1000);

        this.this.log.setPrefix(prefix);
        if(silent) this.this.log.setLocalLogLevel(`NONE`);
    }

    initialize(){
        this.log.info(`Logging into ${this.log.chalk.cyan(this.host)}...`, 'SELF');
        
        this._bot = this._mf.createBot({
            host    : this.host,
            port    : this.port,
            username: this.username,
            password: this.password
        });

        //this.setChatPatterns();
        this.registerEvents();
        return this;
    }

    getBot(){
        return this._bot;
    }

    getUsername(){
        return this.getBot().username;
    }

    getEntity(){
        return new Entity(this.getBot().entity);
    }

    setServer(server){
        this._server = server;
        return this;
    }

    getServer(){
        return this._server;
    }

    registerEvents(){
        this.getBot().on('login', ()=>{
            this.log.info(`Logged into ${this.log.chalk.cyan(this.host)} as ${this.log.chalk.cyan(this._bot.username)}`, "SELF");
            this.emit('login');
        });

        this.getBot().on('message', (packet)=>{
            var message = packet.toString().replace('  ', ' ');
            this.self.emit('chat', message.replace(/\u00A7[0-9A-FK-OR]/ig,''), packet);

            var coloredMessage = this.consoleColorChat(message, packet);

            if(this.log.chalk.stripColor(coloredMessage).indexOf('GWEN >') > -1) return;

            if(!coloredMessage) coloredMessage = ' ';
            this.log.info(coloredMessage, "CHAT");
        });

        this.getBot().on('kicked', (reason)=>{
            this.log.error(`I just got kicked for the reason ${this.log.chalk.red(JSON.stringify(reason))}!`);
        })

    }

    overrideEvents(override_function){
        this.registerEvents = override_function;
    }

    slackFormatChat(chat){

    }

    consoleColorChat(chat, packet){
        var split = chat.split(`§`);

        var coloredMessage = '';

        if(split.length == 1){
            var extra = packet.json.extra;
            if(!extra) return chat;

            for(var item of extra){
                if(typeof item == 'string'){
                    coloredMessage += item;
                    continue;
                }

                var colorCode = item.color;
                var colorCodeFunction = json_color_to_chalk[colorCode];

                if(!colorCodeFunction){
                    coloredMessage += item.text;
                    continue;
                }

                coloredMessage += colorCodeFunction(item.text);
            }
            return coloredMessage;
        }

        for(var index in split){
            var message = split[index];
            if(message.length == 1) continue;
            var colorCode = message.substring(0, 1);
            var colorCodeFunction = mc_color_to_chalk[colorCode];

            if(colorCode == "l" || colorCode == "m" || colorCode == "n" || colorCode == "o"){
                coloredMessage += mc_color_to_chalk[split[index-1]](colorCodeFunction(message.substring(1)));
                continue;
            }

            if(!colorCodeFunction){
                coloredMessage += message;
                continue;
            }
            coloredMessage += colorCodeFunction(message.substring(1));
            //this.log.debug(`Chat ${chat} - Code ${colorCode}. ${colorCodeFunction(message)}`)
        }
        return coloredMessage;
    }

    /**
     * @method - Generally, don't use this method directly.
     * Only for high-priority messages that need to be sent immediately.
     *
     * @param message - The message to send in chat.
     */
    chat(message){
        this.getBot().chat(message);
    }

    /**
     * @method - This method queues messages so that the Minecraft Bot isn't hit by Mineplex's
     * command center, which limits at just below 1 message/second. To do this, the _bot stores
     * the last sent message, and when another message is requested to be sent the two compare
     * to see if one has been sent in the last second. If so, it is added to this.message_queue
     * which is processed at a regular interval. Additionally, if there are messages pending
     * in the queue, even if it has been more than a second since the last message, the message
     * will be added to the message queue.
     *
     * @param message - The chat message to queue.
     */
    queueMessage(message){
        var timeNow = Date.now()/1000;
        var messageType = typeof message;
        if(messageType.toLowerCase() != "string") message = message.toString();
        var last_message_difference = timeNow - this.message_queue_last;
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
        if(!this.getBot()) return;
        this.getBot().quit();
        this.getBot().end();
    }
}

module.exports = MinecraftBot;