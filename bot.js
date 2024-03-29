const { Client, Intents } = require('discord.js');
const { token, client_id, client_secret } = require('./config.json');
const axios = require("axios");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_MEMBERS], partials: ['MESSAGE', 'CHANNEL'] });
const MIRTH_GUILD_ID = "703321804600770602";
const ANNOUNCEMENT_CHANNEL_ID = "705881658930233384";
const ALERT_ROLE = "814917425019092993";
const MIRTH_MESSAGES = [
    "mirthturtle is streaming! Won't you come watch? <:charlie:727649900602589234>",
    "mirthturtle's live! You don't want to miss this one... <:charlie:727649900602589234>",
    "A mirthturtle stream begins! Don't miss this special event... <:charlie:727649900602589234>",
    "You are cordially invited to mirthturtle's stream, starting now! <:charlie:727649900602589234>",
    "mirthturtle is live! Come say hi or you can also lurk creepily. <:charlie:727649900602589234>",
];
let twitch_api_token;
let mirth_guild;
let announcement_channel;
let streamwatcher;
let is_live;
client.once('ready', async () => {
    console.log('SHELLSCRIPT ready!');
    await setup_globals();
    client.user.setActivity("for streams...", { type: "WATCHING" });
    await refresh_token();
    startPolling();
});


// Catch infrequent unhandled WebSocket error within discord.js
client.on('shardError', async (error) => {
    console.error(`A websocket connection encountered an error at ${Date.now()}:`, error);
});

client.on('unhandledRejection', error => {
    console.error(`An unhandled rejection encountered at ${Date.now()}:`, error);
});

client.on('error', error => {
    console.error(`An error encountered at ${Date.now()}:`, error);
});

client.on('messageCreate', async (message) => {
    const member = await mirth_guild.members.fetch(message.author.id);
    if (!member) {
        await message.author.send("You need to be in mirthturtle's discord server to use SHELLSCRIPT!");
        return;
    }
    if (message.content == "!in") {
        if (message.guild) {
            await message.delete();
        }
        if (member.roles.cache.has(ALERT_ROLE)) {
            await message.author.send("You're already a @streamwatcher! But now especially so.");
            return;
        }
        try {
            await member.roles.add(streamwatcher);
            await message.author.send("Welcome, @streamwatcher! I'll ping you whenever mirthturtle starts streaming.");
            console.log(`Given streamwatcher role to ${message.author.username}.`);
        } catch (error) {
            console.log(`There was an error giving streamwatcher role to ${message.author.username}: ${error}`);
            await message.author.send("Something went wrong making you a @streamwatcher! Please complain directly to mirthturtle.");
        }
    }
    else if (message.content == "!out") {
        if (message.guild) {
            await message.delete();
        }
        if (!member.roles.cache.has(ALERT_ROLE)) {
            await message.author.send("I'm pretty sure you're not currently a @streamwatcher...");
            return;
        }
        try {
            await member.roles.remove(streamwatcher);
            await message.author.send("OK, you won't receive @streamwatcher notifications anymore. Not from me, anyway...");
            console.log(`Removed streamwatcher role from ${message.author.username}.`);
        } catch (error) {
            console.log(`There was an error removing streamwatcher role from ${message.author.username}: ${error}`);
            await message.author.send("Something went wrong removing your @streamwatcher role! Please complain directly to mirthturtle.");
        }
    }
});

async function setup_globals() {
    mirth_guild = client.guilds.cache.get(MIRTH_GUILD_ID);
    if (!mirth_guild) {
        throw "Issue finding mirthturtle's discord server. Terminated.";
    }
    announcement_channel = client.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID);
    if (!announcement_channel) {
        throw "Issue finding announcement channel. Terminated.";
    }
    streamwatcher = announcement_channel.guild.roles.cache.find(r => r.id === ALERT_ROLE);
    if (!streamwatcher) {
        throw "Issue finding streamwatcher role. Terminated.";
    }
}

async function startPolling() {
    setInterval(async function () { await checkLive(); }, 30 * 1000);
}

async function checkLive() {
    try {
        let resp = await axios.get('https://api.twitch.tv/helix/streams?user_login=mirthturtle', {
            headers: {
                'Authorization': 'Bearer ' + twitch_api_token,
                'Client-ID': client_id
            }
        });
        if (!resp.data.data.length) {
            is_live = false;
        } else if (resp.data.data[0].type == "live") {
            if (!is_live) {
                is_live = true;
                await alert_live();
            }
        } else {
            is_live = false;
        }
    }
    catch (error) {
        if (error.response) {
            if (error.response.status == 401) {
                console.log("HTTP Error 401");
                await refresh_token();
            }
        } else {
            console.log(`An error was encountered with the twitch api request at ${Date.now()}: ${error}`);
        }
    }
}

async function refresh_token() {
    let url = `https://id.twitch.tv/oauth2/token?client_id=${client_id}&client_secret=${client_secret}&grant_type=client_credentials`;
    let resp = await axios.post(url);
    console.log("Got new token successfully.");
    twitch_api_token = resp.data.access_token;
}

async function alert_live() {
    console.log(`Making live announcement.`);
    let random = Math.floor(Math.random() * MIRTH_MESSAGES.length);
    await announcement_channel.send(`<@&${ALERT_ROLE}> ${MIRTH_MESSAGES[random]} https://twitch.tv/mirthturtle`);
}

client.login(token);
