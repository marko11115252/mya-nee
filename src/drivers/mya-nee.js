const Discord = require("discord.js");
const { prefix, token } = require("../../config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();

const queue = new Map();

// ---------------------------------------------------------------------
// STATUS LOG
// ---------------------------------------------------------------------

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

// ---------------------------------------------------------------------
// EVENTS
// ---------------------------------------------------------------------

client.on("message", async message => {
  
    // Do nothing if the message was sent by the bot
    if ( message.author.bot )
        return;

    // Do nothing if the message wasn't intended for mya-nee
    msg = message.content

    if ( !msg.startsWith(prefix) )
        return;
    else
        msg = msg.slice( prefix.length )

    while ( msg.startsWith(' ') )
        msg = msg.slice(1)

    // Split message by spaces:
    //  - first: command
    //  - the rest: arguments
    msg = msg.split( " " )
    command = msg[0]
    args = msg.slice( 1 )

  const serverQueue = queue.get(message.guild.id);

  if ( command === "play" ) {
    execute( message, args, serverQueue );
    message.delete();
    return;

  } else if ( command === "skip" ) {
    skip( message, args, serverQueue );
    return;

  } else if ( command === "stop" ) {
    stop( message, args, serverQueue );
    return;

  } else {
    message.channel.send( "Wakarimasen! >.<" );
  }
});

// ---------------------------------------------------------------------
// CALLBACKS
// ---------------------------------------------------------------------

async function execute( message, args, serverQueue ) 
{
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
}

  const songInfo = await ytdl.getInfo(args[0]);
  const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
   };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function skip( message, args, serverQueue ) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function stop( message, args, serverQueue ) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
    
  if (!serverQueue)
    return message.channel.send("There is no song that I could stop!");
    
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Now playing: **${song.title}**`);
}

client.login(token);