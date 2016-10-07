var EventEmitter = require('events');
var log          = require('frozor-logger');
var mineflayer   = require('mineflayer');
var Entity       = require('./MinecraftEntity');

var mc_color_to_chalk = {
    4: log.chalk.red,
    c: log.chalk.red.bold,
    6: log.chalk.yellow,
    e: log.chalk.yellow,
    2: log.chalk.green,
    a: log.chalk.green,
    b: log.chalk.blue.bold,
    3: log.chalk.cyan,
    1: log.chalk.blue,
    9: log.chalk.blue,
    d: log.chalk.magenta.bold,
    5: log.chalk.magenta,
    f: log.chalk.white.bold,
    7: log.chalk.white,
    l: log.chalk.bold,
    n: log.chalk.underline,
    o: log.chalk.italics,
    m: log.chalk.strikethrough,
    r: log.chalk.reset,
}

var json_color_to_chalk = {
    black:        log.chalk.black.bold,
    dark_blue:    log.chalk.blue,
    dark_green:   log.chalk.green,
    dark_aqua:    log.chalk.cyan,
    dark_red:     log.chalk.red,
    dark_purple:  log.chalk.magenta,
    gold:         log.chalk.yellow,
    gray:         log.chalk.white,
    dark_gray:    log.chalk.gray,
    blue:         log.chalk.blue,
    green:        log.chalk.green,
    aqua:         log.chalk.cyan.bold,
    red:          log.chalk.red.bold,
    light_purple: log.chalk.magenta.bold,
    yellow:       log.chalk.yellow,
    white:        log.chalk.white.bold,
    reset:        log.chalk.white
}

class MinecraftBot extends EventEmitter{
    /**
     * @param {string} host - The IP of the server you are connecting to.
     * @param {string, number} port - The port to connect to
     * @param {string} username - The username you want to log in with
     * @param {string} password - The password you want to use to log in
     */
    constructor(username, password, host, port){
        super();
        this.self     = this;
        this._mf      = mineflayer;
        this._bot     = null;
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

    }

    initialize(){
        log.info(`Logging into ${log.chalk.cyan(this.host)}...`, 'SELF');
        
        this._bot = this._mf.createBot({
            host    : this.host,
            port    : this.port,
            username: this.username,
            password: this.password
        });

        //this.setChatPatterns();
        this.registerEvents();
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

    registerEvents(){
        this.getBot().on('login', ()=>{
            log.info(`Logged into ${log.chalk.cyan(this.host)} as ${log.chalk.cyan(this._bot.username)}`, "SELF");
            this.emit('login');
        });

        this.getBot().on('message', (packet)=>{
            var message = packet.toString().replace('  ', ' ');

            var coloredMessage = this.consoleColorChat(message, packet);

            if(log.chalk.stripColor(coloredMessage).indexOf('GWEN >') > -1) return;

            if(!coloredMessage) coloredMessage = ' ';
            log.info(coloredMessage, "SELF|CHAT");

            this.self.emit('chat', message.replace(/\u00A7[0-9A-FK-OR]/ig,''));
        });

        this.getBot().on('kicked', (reason)=>{
            log.error(`I just got kicked for the reason ${log.chalk.red(reason.text)}!`);
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
            //log.debug(`Chat ${chat} - Code ${colorCode}. ${colorCodeFunction(message)}`)
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