const { Client, Intents } = require('discord.js');
const { token, client_id, client_secret } = require('./config.json');
const axios = require("axios");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });
const ANNOUNCEMENT_CHANNEL_ID = "705881658930233384";
const ALERT_ROLE = "814917425019092993";
const MIRTH_MESSAGES = ["Live in a few!", "Putting the tea on", "<:charlie:727649900602589234> <:charlie:727649900602589234> <:charlie:727649900602589234>", "OK I hit that scary button",
    "omg what if I was live", "Ok I pressed the button", "First stream in 6 weeeeeks", "Aw yeah starting in a few", "Getting it started", "Starting in a few!",
    "Let's goooo", "Alright it's stream watching time", "<:charlie:727649900602589234>", "It's tiiiiime", "Heyy starting on time for the first time ever",
    "It's \"Go\" time", "Alright it is time", "On in a few!", "OK everything is perfect now, perfect stream", "Alright let's do thisss",
    "Here we go!", "starting shortly!", "It is time", "Going live", "Going live!"];
let twitch_api_token;
let announcement_channel;
let streamwatcher;
let is_live;
client.once('ready', async () => {
    console.log('SHELLSCRIPT ready!');
    announcement_channel = client.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID);
    if (!announcement_channel) {
        throw "Issue finding announcement channel. Terminated.";
        return;
    }
    streamwatcher = announcement_channel.guild.roles.cache.find(r => r.id === ALERT_ROLE);
    if (!streamwatcher) {
        throw "Issue finding streamwatcher role. Terminated.";
    }
    client.user.setActivity("for streams...", { type: "WATCHING" });
    await refresh_token();
    startPolling();
});

client.on('messageCreate', async (message) => {
    if (message.content == "!in") {
        if (message.guild) {
            await message.delete();
        }
        if (message.member.roles.cache.find(r => r === streamwatcher)) {
            await message.author.send("You already have the streamwatcher role!");
            return;
        }
        try {
            await message.member.roles.add(streamwatcher);
            await message.author.send("The streamwatcher role has been given to you. You will be pinged whenever mirthturtle starts streaming!");
            console.log(`Removed streamwatcher role from ${message.author.username}.`);
        } catch (error) {
            console.log(`error`);
            await message.author.send("There was an error giving you the streamwatcher role!");
        }
    }
    else if (message.content == "!out") {
        if (message.guild) {
            await message.delete();
        }
        if (!message.member.roles.cache.find(r => r === streamwatcher)) {
            await message.author.send("I'm pretty sure you don't currently have the streamwatcher role...");
            return;
        }
        try {
            await message.member.roles.remove(streamwatcher);
            await message.author.send("The streamwatcher role has been removed. Sorry to see you go!");
            console.log(`Added streamwatcher role to ${message.author.username}.`);
        } catch (error) {
            console.log(error);
            await message.author.send("There was an error removing the streamwatcher role!");
        }
    }
});

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
        if (resp.data.data[0].type == "live") {
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
    await announcement_channel.send(`<@&${ALERT_ROLE}> ${MIRTH_MESSAGES[random]} https://www.twitch.tv/mirthturtle`);
}

client.login(token);
