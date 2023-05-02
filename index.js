const fs = require('fs');
let jsonFile = fs.readFileSync('config.json');
let data = JSON.parse(jsonFile);
const mineflayer = require("mineflayer");
const classofRaw = require('./node_modules/core-js-pure/internals/classof-raw');
const Vec3 = require('vec3');

class McBot
{
	constructor(name, ip, port) 
	{
		this.settings =
		{
			username: name,
			host: ip,
			port: port,
		}

		if (data["forced-version"])
		{
			this.settings.version = data["mc-version"];
		}

		if(data["sword-quick-bar-slot"]>8 || data["sword-quick-bar-slot"]<0)
		{
			data["sword-quick-bar-slot"]=0;
		}

		if(data["food-quick-bar-slot"]>8 || data["food-quick-bar-slot"]<0)
		{
			data["food-quick-bar-slot"]=1;
		}

		this.bot = mineflayer.createBot(this.settings);
		console.log("Bot created");
		
		this.mcData = require('minecraft-data')(this.bot.version);
		
		this.creazy = false;
		this.look = false;
		this.kill = false;
		this.killAll = false;
		this.fishing = false;
		this.follow = false;
		this.write = false;
		this.sheildOrFood = false;
		this.usingOnBlock = false;
		this.placingBlock = false;
		this.mainHandSlot = 0;
		this.time = 0; //20 ticks is 1 second
		this.previousTime = 0; 
		this.randTime = 600;
		this.actions = ['forward', 'left', 'right', 'sneak', 'jump', 'back'];
		this.spawCounter = 0;
			//logging in
		this.bot.once('login', async () =>
		{
			if(data["ip"]!="localhost")
			{
				let dt = 1200 + Math.round(this.rand(0, 800));
				console.log("Logging in...");
				setTimeout(()=>
				{
					this.bot.chat(data["register-cmd"]);
					console.log("Registered");
				}, dt)
				setTimeout(()=>
				{
					this.bot.chat(data["login-cmd"]);
					console.log("Loged in");
				}, 2*dt)
				setTimeout(()=>
				{
					this.goAndSelectSubServer();
					console.log("Bot went to choose subserver");
				}, 3*dt)
			}
		})

		this.bot.on('spawn', () =>
		{
			this.spawCounter+=1;
			console.log("Spawned");

			if (this.spawCounter >= 2)
			{
				this.bot.chat(data["tp-to-owner"]);
			}
			
		})

		//on whisper
		this.bot.on('whisper', async (name, msg) =>
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

			this.afterWhisper(userName, message);
		})

		//on public chat
		this.bot.on('chat', async (name, msg) =>
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
		this.bot.on('message', async (msg, name) =>
		{
			let message = "" + msg;
			let userName = "";

			if (message.startsWith("[Gracz ")) {
				message = message.replace("[Gracz ", "");
				message = message.replace(" -> ja] ", "@");
				let txts = message.split("@");
				userName = txts[0];
				message = txts[1];
				this.afterWhisper(userName, message);
			}
			else
			{
				message = "" + msg;
				userName = "" + name;
			}
		})

		this.bot.on('death',()=>
		{
			console.log("Death");
			this.stopAll();
			this.bot.emit('respawn');
		});

		this.bot.on("playerJoined", ()=>
		{
			if (this.write == true)
			{
				msg = getRandomMember(data["random-messages"]);
				this.bot.chat(msg);
				console.log("Bot wrote: " + msg);
			}
		})

		this.bot.on("physicsTick", ()=>
		{
			let dt = 140;
			this.time = Date.now();
			
			if (this.look == true)
			{
				this.lookAtNearestEntity();
			}

			if (this.creazy == true)
			{
				this.walkAround();
			}
			
			if (this.write == true)
			{
				this.writeSomething();
			}
			
			if (this.follow == true)
			{
				this.followNearestEntity();
			}
			
			if (this.kill == true)
			{
				if (this.killAll)
				{
					this.killMobsAndPlayers(true); //kill All
				}
				else
				{
					this.killMobsAndPlayers(false); //kill not All
				}
			}
			
			if( (this.usingOnBlock == true) && (this.previousTime != this.time) )
			{
				this.useHeldItemOnPointedBlock();
			}
			
			if( (this.placingBlock == true) && (this.previousTime != this.time) )
			{
				this.placeHeldItemOnPointedBlock();
			}

			if((this.time - this.previousTime) >= dt)
			{
				this.previousTime = this.time;
			}
		})

		// Log errors and kick reasons:
		this.bot.on('kicked', console.log)
		this.bot.on('error', console.log)
	}

	rand(min, max)
	{
		return Math.random() * (max - min) + min;
	}

	doActivity(cmd)
	{
		console.log(cmd + "!");

		if(cmd.startsWith("Choose quick slot "))
		{
			let slotNr = (cmd.slice(-1)).charCodeAt(0)-48;
			if(slotNr>=0 && slotNr<=8)
			{
				this.bot.setQuickBarSlot(slotNr);
				this.mainHandSlot = slotNr;
				console.log(this.bot.heldItem);
			}
		}
			
		switch (cmd)
		{
			case "W":
				this.bot.setControlState("back", false);
				this.bot.setControlState("forward", true);
				break;
			case "S":
				this.bot.setControlState("forward", false);
				this.bot.setControlState("back", true);
				break;
			case "A":
				this.bot.setControlState("right", false);
				this.bot.setControlState("left", true);
				break;
			case "D":
				this.bot.setControlState("left", false);
				this.bot.setControlState("right", true);
				break;
			case "RMB":
				this.bot.activateEntity(this.bot.nearestEntity());
				break;
			case "Space":
				this.bot.setControlState("jump", true);
				break;
			case "Ctrl":
				this.bot.setControlState("sprint", false);
				this.bot.setControlState("sneak", true);
				break;
			case "Shift":
				this.bot.setControlState("sneak", false);
				this.bot.setControlState("sprint", true);
				break;		
			case "Walk":
				this.creazy = true;
				break;
			case "Look":
				this.look = true;
				break;
			case "Write":
				this.randTime = this.bot.time.timeOfDay + 5;
				this.write = true;
				break;
			case "Kill":
				this.kill = true;
				this.killAll = false;
				this.find_sword_slot();
				break;
			case "Kill all":
				this.kill = true;
				this.killAll = true;
				this.find_sword_slot();
				break;
			case "Follow":
				this.follow = true;
				break;
			case "Use":
				this.bot.activateItem(false)
				setTimeout(()=>{this.bot.deactivateItem(false)}, 2000); //offHand = false
				break;			
			case "Activate":
				this.bot.activateItem(false)
				break;
			case "Deactivate":
				this.bot.deactivateItem(false)
				break;	
			case "Swap hands items":
				this.bot.equip(this.bot.heldItem, "off-hand");
				break;
			case "Q":
				if(this.bot.heldItem.count>0)
				{
					this.bot.tossStack(this.bot.heldItem);
				}
				break;
			case "Fish":
				this.fishing = true;
				this.fish();
				break;
			case "Use on block":
				this.useHeldItemOnPointedBlock();
				break;
			case "Use on block in loop":
				this.usingOnBlock = true;
				break;
			case "Place block":
				this.placeHeldItemOnPointedBlock();
				break;
			case "Place block in loop":
				this.placingBlock = true;
				break;
			case "Tp":
				this.bot.chat(data["tp-to-owner"]);
				break;
			case "Test":
				this.test();
				break;
			case "Stop":
				this.stopAll()
				break;
		}
	}

	goAndSelectSubServer()
	{
		this.bot.setControlState("forward", true);
		
		setTimeout(()=>
		{
			this.bot.setControlState("right", true);
		}, 11000)
		
		setTimeout(()=>
		{
			this.bot.clearControlStates();
			this.bot.activateEntity(this.bot.nearestEntity());
		}, 12000)
	}

	walkAround()
	{
		let r = Math.round(rand(1, this.actions.length - 1));

		if ((this.bot.time.timeOfDay % 50) <= 20)
		{
			this.bot.setControlState(this.actions[r], true);
		} 
		else
		{
			this.bot.clearControlStates();
		}
	}

	lookAtNearestEntity()
	{
		let entity = this.bot.nearestEntity();
		if(this.bot.nearestEntity())
		{
			let x = entity.position.x;
			let y = entity.position.y + entity.height-0.25;
			let z = entity.position.z;
			let vec = Vec3(x,y,z);
			this.bot.lookAt(vec, true);   
		}
	}

	writeSomething()
	{
		let m = 500; //modulo m
		let msg = "";
		if ( ((this.bot.time.timeOfDay % m) > this.randTime - 5) && ((this.bot.time.timeOfDay % m) < this.randTime + 5))
		{
			msg = this.getRandomMember(data["random-messages"]);
			this.bot.chat(msg);
			console.log("Bot wrote: " + msg);
			this.randTime = Math.round(this.rand(0,m-1));
			console.log("And will say something in " + this.randTime + " minecraft ticks");
		}
	}

	followNearestEntity()
	{
			if(this.look == false)
			{
				this.look = true;
			}
		
			if (this.bot.getControlState("forward") == false)
			{
				this.bot.setControlState("forward", true);
			}

			if (this.bot.getControlState("sprint") == false)
			{
				this.bot.setControlState("sprint", true);
			}
			
			if(this.time != this.previousTime)
			{
				this.bot.setControlState("jump", true);
			}
			else
			{
				this.bot.setControlState("jump", false);
			}
	}

	killMobsAndPlayers(All)
	{
		let entity = this.bot.nearestEntity();
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
				if(this.isMember(entity.username, data["bot-owners"]) == false)
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
			this.lookAtNearestEntity();
			if(this.bot.health>10 && this.bot.food>10)
			{
				this.look = false;
				if (this.bot.getControlState("forward") == false)
				{
					this.bot.setControlState("forward", true);
				}
				if (this.bot.getControlState("sprint") == false)
				{
					this.bot.setControlState("sprint", true);
				}	
				if(this.time != this.previousTime)
				{
					this.bot.setControlState("jump", true);
				}
				else
				{
					this.bot.setControlState("jump", false);
				}
				
				this.bot.deactivateItem(true);
				this.bot.setQuickBarSlot(data["sword-quick-bar-slot"]);
				if(this.time != this.previousTime) 
				{
					this.bot.attack(entity);
					setTimeout(()=>{this.bot.attack(entity)}, 800);
				}
			}
			else //if hungry or hurt
			{
				if (this.bot.getControlState("back") == false)
				{
					this.bot.setControlState("forward", false);
					this.bot.setControlState("back", true); //escape
				}
				this.bot.setQuickBarSlot(data["food-quick-bar-slot"]);	
				if(this.time != this.previousTime)
				{
					this.bot.activateItem(this.sheildOrFood); //protect your self or eat
					setTimeout(()=>{this.bot.deactivateItem(this.sheildOrFood)}, 2000); //finish actiivity
					this.sheildOrFood = !this.sheildOrFood;
				}
			}
		}
		else //if not correct
		{
			this.look = true;
			this.bot.clearControlStates();
		}
	}

	afterWhisper(userName, message)
	{
		console.log(userName + " whispered: " + message);
	 
		let rnr = this.rand(0, 100);

		if (this.isMember(userName, data["bot-owners"]))  //if 1 of owners wrote to bot
		{
			if (rnr <= 100) 
			{
				if (message.endsWith("!")) 
				{
					this.doActivity(message.substring(0, message.length - 1)); //execute the command
				}
				else 
				{
					this.bot.chat(message); //write on chat
				}
			}
			else 
			{
				setTimeout(()=>
				{
					this.bot.chat("/msg " + userName + " " + this.getRandomMember(data["random-messages"])); //don't listen
				},1000);
			}
		}
		else //if random wrote to bot
		{
			if (rnr <= 70)
			{
				this.bot.chat("/msg " + userName + " " + message); //write the same back to sender
				this.bot.chat("/msg " + data["bot-owners"][0] + " " + userName + " whispered to me: " + message);
			}
			else 
			{
				this.bot.chat("/msg " + userName + " " + this.getRandomMember(data["random-messages"])); //write random message to message seder
				this.bot.chat("/msg " + data["bot-owners"][0] + " " + userName + " whispered to me: " + message);
			}
		}   
	}

	isMember(element, table=[])
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

	getRandomMember(table=[])
	{
		let ind = Math.round( this.rand(0, (table.length-1)) );
		
		if(table.length > 0)
		{
			return table[ind];
		}
		else
		{
			return null; 
		}
	}

	find_sword_slot()
	{
		let i;
			for(i = 0; i<9; i++)
			{
				this.bot.setQuickBarSlot(i);
				if(this.bot.heldItem && this.bot.heldItem.name.includes("sword"))
				{
					data["sword-quick-bar-slot"] = i;
					return 0;
				}
			}
			if(!this.bot.heldItem || !this.bot.heldItem.name.includes("sword"))
			{
				this.kill = false;
				this.killAll = false;
			}
	}

	findFishingRod()
	{
				for(let i = 0; i<9; i++)
			{
				this.bot.setQuickBarSlot(i);
				if(this.bot.heldItem.name.includes("fishing_rod"))
				{
					return 0;
				}
			}
	}

	fish()
	{
		this.findFishingRod();
		if (this.fishing)
		{
			this.bot.deactivateItem(false);
			this.bot.activateItem(false);
			setTimeout(()=>{this.fish()},15000)
		}
		else
		{
			this.bot.deactivateItem(false);
		}
	}

	useHeldItemOnPointedBlock() 
	{
	  let block = this.bot.blockAtCursor();
	  
	  if((block.name != "air")&&(block.name != "water"))
	  {
		this.bot.activateBlock(block);
	  }
	}

	placeHeldItemOnPointedBlock() 
	{			
		let sourceBlock = this.bot.blockAtCursor();
		let sourcePosition = sourceBlock.position;
		let faceVector = this.bot.entity.position.offset(0, 1, 0).minus(sourcePosition).scaled(0.25); //bot position from source block
		faceVector.x = Math.round(faceVector.x);
		faceVector.y = Math.round(faceVector.y);
		faceVector.z = Math.round(faceVector.z);
		
		let blockToBeReplaced = this.bot.blockAt(sourcePosition.plus(faceVector));
		
		if(((blockToBeReplaced.name == "air")||(blockToBeReplaced.name == "water")) && (this.bot.heldItem && this.bot.heldItem.name))
		{
			this.bot.placeBlock(sourceBlock, faceVector);
		}
	}

	stopAll()
	{
				this.bot.clearControlStates();
				this.creazy = false;
				this.look = false;
				this.write = false;
				this.kill = false;
				this.killAll = false;
				this.follow = false;
				this.fishing = false;
				this.usingOnBlock = false;
				this.placingBlock = false;
	}

	test()
	{
		
	}
}

let mcBots = [];
for (let i = 0; i < data["names"].length; i++)
{
	setTimeout(()=>
	{
		mcBots[i] = new McBot(data["names"][i], data["ip"], data["port"])
	}, i*3500)
}
