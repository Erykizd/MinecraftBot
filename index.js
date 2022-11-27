const fs = require('fs');
let jsonFile = fs.readFileSync('config.json');
let data = JSON.parse(jsonFile);
const mineflayer = require("mineflayer");
const classofRaw = require('./node_modules/core-js-pure/internals/classof-raw');
var vector = require('vec3');
var creazy = false;
var look = false;
var kill = false;
var killAll = false;
var fishing = false;
var follow = false;
var write = false;
var sheildOrFood = false;
var mainHandSlot = 0;
var time = 0; //20 ticks is 1 second
var previousTime = 0; 
var randTime = 600;
var actions = ['forward', 'left', 'right', 'sneak', 'jump', 'back'];
var spawCounter = 0;

var settings =
{
    username: data["name"],
    host: data["ip"],
    port: data["port"],
}

if (data["forced-version"])
{
    settings.version = data["mc-version"];
}

if(data["sword-quick-bar-slot"]>8 || data["sword-quick-bar-slot"]<0)
{
	data["sword-quick-bar-slot"]=0;
}

if(data["food-quick-bar-slot"]>8 || data["food-quick-bar-slot"]<0)
{
	data["food-quick-bar-slot"]=1;
}

const bot = mineflayer.createBot(settings);
console.log("Bot created");

//logging in
bot.once('login', async () =>
{
	if(data["ip"]!="localhost")
	{
		let dt = 1000;
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
	}
})

bot.on('spawn', () =>
{
    spawCounter+=1;
    console.log("Spawned");

    if (spawCounter >= 2)
    {
        bot.chat(data["first-message"]);
        bot.chat(data["tp-to-owner"]);
		look = true;
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

    afterWhisper(userName, message);
})

//on public chat
bot.on('chat', async (name, msg) =>
{
    let message = "" + msg;
    let userName = "" + name;
    
    if (message.startsWith('Gracz ')) {
        message = message.replace('Gracz ', '');
        let txts = message.split(' ' + String.fromCharCode(187) + ' ');
        userName = txts[0];
        message = txts[1];
    }
    
    console.log(userName + " wrote: " + message);
})

//on every server log message (filter by whisperring)
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
	console.log("Death");
	bot.clearControlStates();
	creazy = false;
	look = false;
	write = false;
	kill = false;
	killAll = false;
	follow = false;
    bot.emit('respawn');
});

bot.on("playerJoined", function()
{
	if (write == true)
    {
		msg = getRandomMember(data["random-messages"]);
        bot.chat(msg);
		console.log("Bot wrote: " + msg);
    }
})

bot.on("physicsTick", async function ()
{
	time = bot.time.timeOfDay;
    if (look == true)
    {
        lookAtNearestEntity();
    }

    if (creazy == true)
    {
        walkAround();
    }
	
	if (write == true)
    {
        writeSomething();
    }
	
	if (follow == true)
    {
        followNearestEntity();
    }
	
	if (kill == true)
    {
		if (killAll)
		{
			killMobsAndPlayers(true); //kill All
		}
		else
		{
			killMobsAndPlayers(false); //kill not All
		}
    }
	previousTime = time;
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
    console.log(cmd + "!");

	if(cmd.startsWith("Choose quick slot "))
	{
		let slotNr = (cmd.slice(-1)).charCodeAt(0)-48;
		if(slotNr>=0 && slotNr<=8)
		{
			bot.setQuickBarSlot(slotNr);
			mainHandSlot = slotNr;
			console.log(bot.heldItem);
		}
	}
		
    switch (cmd)
    {
        case "W":
            bot.setControlState("back", false);
            bot.setControlState("forward", true);
            break;
        case "S":
            bot.setControlState("forward", false);
            bot.setControlState("back", true);
            break;
        case "A":
            bot.setControlState("right", false);
            bot.setControlState("left", true);
            break;
        case "D":
            bot.setControlState("left", false);
            bot.setControlState("right", true);
            break;
        case "RMB":
            bot.activateEntity(bot.nearestEntity());
            break;
        case "Space":
            bot.setControlState("jump", true);
            break;
        case "Ctrl":
			bot.setControlState("sprint", false);
            bot.setControlState("sneak", true);
            break;
        case "Shift":
			bot.setControlState("sneak", false);
            bot.setControlState("sprint", true);
            break;		
        case "Walk":
            creazy = true;
            break;
        case "Look":
            look = true;
            break;
		case "Write":
			randTime = bot.time.timeOfDay + 5;
            write = true;
            break;
		case "Kill":
            kill = true;
			killAll = false;
			find_sword_slot();
            break;
		case "Kill all":
			kill = true;
            killAll = true;
            find_sword_slot();
			break;
		case "Follow":
			follow = true;
            break;
		case "Use":
			bot.activateItem(false)
			setTimeout(function(){bot.deactivateItem(false)}, 2000); //offHand = false
            break;			
		case "Activate":
			bot.activateItem(false)
			break;
		case "Deactivate":
			bot.deactivateItem(false)
			break;	
		case "Swap hands items":
			bot.equip(bot.heldItem, "off-hand");
			break;
		case "Q":
			if(bot.heldItem.count>0)
			{
				bot.tossStack(bot.heldItem);
			}
			break;
		case "Fish":
			fishing = true;
			fish();
			break;
		case "Stop":
			bot.clearControlStates();
			creazy = false;
			look = false;
			write = false;
			kill = false;
			killAll = false;
			follow = false;
			fishing = false;
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

    if ((bot.time.timeOfDay % 50) <= 20)
    {
        bot.setControlState(actions[r], true);
    } 
	else
    {
        bot.clearControlStates();
    }
}

async function lookAtNearestEntity()
{
	let entity = bot.nearestEntity();
	let x = entity.position.x;
	let y = entity.position.y + entity.height-0.25;
	let z = entity.position.z;
	let vec = vector(x,y,z);
	bot.lookAt(vec, true);   
}

async function writeSomething()
{
	let m = 500; //modulo m
	let msg = "";
	if ( ((bot.time.timeOfDay % m) > randTime - 5) && ((bot.time.timeOfDay % m) < randTime + 5))
    {
		msg = getRandomMember(data["random-messages"]);
        bot.chat(msg);
		console.log("Bot wrote: " + msg);
		randTime = Math.round(rand(0,m-1));
		console.log("And will say something in " + randTime + " minecraft ticks");
    }
}

function followNearestEntity()
{
		if(look == false)
		{
			look = true;
		}
	
		if (bot.getControlState("forward") == false)
		{
			bot.setControlState("forward", true);
		}

		if (bot.getControlState("sprint") == false)
		{
			bot.setControlState("sprint", true);
		}
		
		if(time != previousTime)
		{
			bot.setControlState("jump", true);
		}
		else
		{
			bot.setControlState("jump", false);
		}
}

function killMobsAndPlayers(All)
{
	let entity = bot.nearestEntity();
	let correct = false;
	

	let mobs = [];
			
	if (All==true)
	{
		mobs = ["player", "animal", "hostile"];
		
		if(isMember(entity.type, mobs))
		{
				correct = true;
		}
	}
	else
	{
		if(entity.type == "player")
		{
			if(isMember(entity.username, data["bot-owners"]) == false)
			{
				correct = true;
			}
		}
		else if (entity.type == "hostile")
		{
				correct = true;
		}
	}
	
	if(correct)
	{		
		lookAtNearestEntity();
		if(bot.health>10 && bot.food>10)
		{
			look = false;
			if (bot.getControlState("forward") == false)
			{
				bot.setControlState("forward", true);
			}
			if (bot.getControlState("sprint") == false)
			{
				bot.setControlState("sprint", true);
			}	
			if(time != previousTime)
			{
				bot.setControlState("jump", true);
			}
			else
			{
				bot.setControlState("jump", false);
			}
			
			bot.deactivateItem(true);
			bot.setQuickBarSlot(data["sword-quick-bar-slot"]);
			if(time != previousTime) 
			{
				bot.attack(entity);
				setTimeout(function(){bot.attack(entity)}, 800);
			}
		}
		else //if hungry or hurt
		{
			if (bot.getControlState("back") == false)
			{
				bot.setControlState("forward", false);
				bot.setControlState("back", true); //escape
			}
			bot.setQuickBarSlot(data["food-quick-bar-slot"]);	
			if(time != previousTime)
			{
				bot.activateItem(sheildOrFood); //protect your self or eat
				setTimeout(function(){bot.deactivateItem(sheildOrFood)}, 2000); //finish actiivity
				sheildOrFood = !sheildOrFood;
			}
		}
	}
	else //if not correct
	{
		look = true;
		bot.clearControlStates();
	}
}

function afterWhisper(userName, message)
{
    console.log(userName + " whispered: " + message);
 
	let rnr = rand(0, 100);

    if (isMember(userName, data["bot-owners"]))  //if 1 of owners wrote to bot
    {
        if (rnr <= 70) 
		{
            if (message.endsWith("!")) 
			{
                doActivity(message.substring(0, message.length - 1)); //execute the command
            }
            else 
			{
                bot.chat(message); //write on chat
            }
        }
        else 
		{
            bot.chat("/msg " + userName + " " + getRandomMember(data["random-messages"])); //don't listen
        }
    }
    else //if random wrote to bot
	{
        if (rnr <= 70)
        {
            bot.chat("/msg " + userName + " " + message); //write the same back to sender
            bot.chat("/msg " + data["bot-owners"][0] + " " + userName + " whispered to me: " + message);
        }
        else 
        {
            bot.chat("/msg " + userName + " " + getRandomMember(data["random-messages"])); //write random message to message seder
            bot.chat("/msg " + data["bot-owners"][0] + " " + userName + " whispered to me: " + message);
        }
    }   
}

function isMember(element, table=[])
{
    for (let i = 0; i < table.length; i++)
    {
        if (element == table[i])
        {
            return true;
        }
    }
    return false;
}

function getRandomMember(table=[])
{
	let ind = Math.round( rand(0, (table.length-1)) );
	
	if(table.length > 0)
	{
		return table[ind];
	}
	else
	{
		return null; 
	}
}

function find_sword_slot()
{
		for(let i = 0; i<9; i++)
		{
			bot.setQuickBarSlot(i);
			if(bot.heldItem.name.includes("sword"))
			{
				data["sword-quick-bar-slot"] = i;
				return 0;
			}
		}
}

function findFishingRod()
{
			for(let i = 0; i<9; i++)
		{
			bot.setQuickBarSlot(i);
			if(bot.heldItem.name.includes("fishing_rod"))
			{
				return 0;
			}
		}
}

function fish()
{
	findFishingRod();
	if (fishing)
    {
		bot.deactivateItem(false);
        bot.activateItem(false);
		setTimeout(function(){fish()},15000)
    }
	else
	{
		bot.deactivateItem(false);
	}
}
