const fs = require('fs');
let jsonFile = fs.readFileSync('config.json');
let data = JSON.parse(jsonFile);
const mineflayer = require("mineflayer");
const classofRaw = require('./node_modules/core-js-pure/internals/classof-raw');
var creazy = false;
var look = false;
var actions = ['forward', 'left', 'right'];
var spawCounter = 0;


var settings =
{
    username: data["name"],
    host: data["ip"],
    port: data["port"],
}

if (data["forced-version"])
{
    settings.version = data["mc-version"]
}

const bot = mineflayer.createBot(settings);
console.log("Bot created");

//logging in
bot.once('login', async () =>
{
    let dt = 2000;
    console.log("Logging in...");
    setTimeout(function ()
    {
        bot.chat(data["register-cmd"]);
        console.log("Registered");
    }, dt)
    setTimeout(function ()
    {
        bot.chat(data["login-cmd"]);
        console.log("Loged in");
    }, 2*dt)
    setTimeout(function ()
    {
        goAndSelectSubServer();
        console.log("Bot went to choose subserver");
    }, 3*dt)
})

bot.on('spawn', async () =>
{
    spawCounter+=1;
    console.log("Spawned");

    if (spawCounter >= 2)
    {
        bot.chat(data["first-message"]);
        bot.chat(data["tp-to-owner"]);
    }
})

//on whisper
bot.on('whisper', async (name, msg) =>
{
    let message = "" + msg;
    let userName = "" + name;

    if (message.startsWith('Gracz '))
    {
        message = message.replace('Gracz ', '');
        let txts = message.split(' ' + String.fromCharCode(187) + ' ');
        userName = txts[0];
        message = txts[1];
    }

     console.log(userName + " whispered: " + message);

    afterWhisper(userName, message);
})

//on public chat
bot.on('chat', async (name, msg) =>
{
    let message = "" + msg;
    let userName = "" + name;

    console.log(userName + " wrote: " + message);
    
    if (message.startsWith('Gracz ')) {
        message = message.replace('Gracz ', '');
        let txts = message.split(' ' + String.fromCharCode(187) + ' ');
        userName = txts[0];
        message = txts[1];
    }
    
    console.log(userName + " wrote: " + message);
})

//on every server log message (filter for whisper)
bot.on('message', async (msg, name) =>
{
    let message = "" + msg;
    let userName = "";

    if (message.startsWith("[Gracz ")) {
        message = message.replace("[Gracz ", "");
        message = message.replace(" -> ja] ", "@");
        let txts = message.split("@");
        userName = txts[0];
        message = txts[1];
        console.log(userName + " whispered: " + message);
        afterWhisper(userName, message);
    }
    else
    {
        message = "" + msg;
        userName = "" + name;
    }
})

bot.on('death',function ()
{
    bot.emit('respawn');
});

bot.on("physicsTick", async function ()
{
    if (look == true)
    {
        lookAtNearestEntity();
    }

    if (creazy == true)
    {
        walkAround();
    }    
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)

function rand(min, max)
{
    return Math.random() * (max - min) + min;
}

async function doActivity(cmd)
{
    console.log("Do " + cmd);

    bot.clearControlStates();
    creazy = false;
    look = false;

    switch (cmd)
    {
        case "W":
            bot.setControlState("forward", true);
            break;
        case "S":
            bot.setControlState("back", true);
            break;
        case "A":
            bot.setControlState("left", true);
            break;
        case "D":
            bot.setControlState("right", true);
            break;
        case "RMB":
            bot.activateEntity(bot.nearestEntity());
            break;
        case "Walk":
            creazy = true;
            break;
        case "Look":
            look = true;
            break;
    }
}

async function goAndSelectSubServer()
{
    bot.setControlState("forward", true);
    setTimeout(function ()
    {
        bot.clearControlStates();
        bot.activateEntity(bot.nearestEntity());
    }, 12000)
}

function walkAround()
{
    let r = Math.round(rand(1, actions.length - 1));

    if ((bot.time.timeOfDay % 100) == 89)
    {
        bot.setControlState(actions[r], true);
    }

    if ((bot.time.timeOfDay % 100) == 9)
    {
        bot.clearControlStates();
    }
}

async function lookAtNearestEntity()
{

    bot.activateEntity(bot.nearestEntity());    
}

function afterWhisper(userName, message)
{

    let rnr = rand(1, 4);

    if (userName == data["bot-owner"]) {
        if (rnr <= 3) {
            if (message.endsWith("!")) {
                doActivity(message.substring(0, message.length - 1));
            }
            else {
                bot.chat(message);
            }
        }
        else {
            bot.chat("/msg " + userName + " " + data["first-message"]);
        }
    }
    else {
        if (rnr <= 3) {
            bot.chat("/msg " + userName + " " + message);
        }
        else {
            bot.chat("/msg " + userName + " " + data["first-message"]);
        }
    }
   
}
