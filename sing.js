const axios = require("axios");
const ytSearch = require("yt-search");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

const sessions = new Map();

bot.command("sing", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1);
  if (!args.length) return ctx.reply("🎵 Please type a song name.");

  const isList = args[0] === "-l";
  const keyword = isList ? args.slice(1).join(" ") : args.join(" ");

  if (!keyword) return ctx.reply("🎵 Please type a song name.");

  try {

    let results = [];

    try {
      results = (await ytSearch(keyword)).videos.slice(0, 6);
    } catch {}

    if (!results.length) {
      const searchRes = await axios.get(
        `https://yt-search-ochre.vercel.app/api/search?q=${encodeURIComponent(keyword)}&limit=6`
      );

      if (searchRes.data.success && searchRes.data.results.length) {
        results = searchRes.data.results.slice(0, 6).map(v => ({
          title: v.title,
          url: v.url,
          timestamp: v.duration,
          author: { name: v.author }
        }));
      }
    }

    if (!results.length) return ctx.reply("❌ No songs found.");

    if (isList) {

      let text = "╭───────────────❍\n";
      text += "│   🎵 𝑺𝒐𝒏𝒈 𝑳𝒊𝒔𝒕\n";
      text += "╰───────────────❍\n\n";

      for (let i = 0; i < results.length; i++) {
        const v = results[i];
        text += `╭─❍\n`;
        text += `┊  ${i + 1}. ${v.title}\n`;
        text += `┊  ⏳ ${v.timestamp || "Unknown"}\n`;
        text += `┊  📺 ${v.author.name}\n`;
        text += `╰───────────────❍\n\n`;
      }

      text += "╭───────────────❍\n";
      text += "│   🔢 Reply with number (1–6)\n";
      text += "╰───────────────❍";

      sessions.set(ctx.from.id, results);

      return ctx.reply(text);
    }

    const video = results[0];

    let videoId;
    if (video.url.includes("v="))
      videoId = video.url.split("v=")[1]?.split("&")[0];
    else
      videoId = video.url.split("/").pop();

    const shortUrl = `https://youtu.be/${videoId}`;

    const apiJson = await axios.get(
      "https://raw.githubusercontent.com/Arafat-Core/cmds/refs/heads/main/api.json"
    );

    const downloadBase = apiJson.data.download;

    const finalURL =
      `${downloadBase}/arafatadl?url=${encodeURIComponent(shortUrl)}`;

    const res = await axios({
      url: finalURL,
      method: "GET",
      responseType: "stream",
      timeout: 0
    });

    if (res.status !== 200) return ctx.reply("❌ Download failed.");

    await ctx.replyWithAudio({ source: res.data }, {
      caption:
`╭───────────────❍
│ 🎧 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑺𝒖𝒄𝒄𝒆𝒔𝒔
├───────────────❍
│ 🎵 ${video.title}
╰───────────────❍`
    });

  } catch (err) {
    console.log("SING ERROR:", err.message);
    ctx.reply("❌ Failed to fetch audio.");
  }
});

bot.on("text", async (ctx) => {

  if (!sessions.has(ctx.from.id)) return;

  const results = sessions.get(ctx.from.id);
  const choice = parseInt(ctx.message.text);

  if (isNaN(choice) || choice < 1 || choice > results.length)
    return ctx.reply("❌ Enter valid number (1–6).");

  try {

    const video = results[choice - 1];

    let videoId;
    if (video.url.includes("v="))
      videoId = video.url.split("v=")[1]?.split("&")[0];
    else
      videoId = video.url.split("/").pop();

    const shortUrl = `https://youtu.be/${videoId}`;

    const apiJson = await axios.get(
      "https://raw.githubusercontent.com/Arafat-Core/cmds/refs/heads/main/api.json"
    );

    const downloadBase = apiJson.data.download;

    const finalURL =
      `${downloadBase}/arafatadl?url=${encodeURIComponent(shortUrl)}`;

    const res = await axios({
      url: finalURL,
      method: "GET",
      responseType: "stream",
      timeout: 0
    });

    if (res.status !== 200) return ctx.reply("❌ Download failed.");

    sessions.delete(ctx.from.id);

    await ctx.replyWithAudio({ source: res.data }, {
      caption:
`╭───────────────❍
│ 🎧 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑺𝒖𝒄𝒄𝒆𝒔𝒔
├───────────────❍
│ 🎵 ${video.title}
╰───────────────❍`
    });

  } catch (err) {
    console.log("REPLY ERROR:", err.message);
    ctx.reply("❌ Download failed.");
  }
});

bot.launch();
