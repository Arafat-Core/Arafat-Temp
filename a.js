const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const supportedDomains = [
  "facebook.com", "fb.watch",
  "youtube.com", "youtu.be",
  "tiktok.com",
  "instagram.com", "instagr.am",
  "likee.com", "likee.video",
  "capcut.com",
  "spotify.com",
  "terabox.com",
  "twitter.com", "x.com",
  "drive.google.com",
  "soundcloud.com",
  "ndown.app",
  "pinterest.com", "pin.it"
];

const startUI = `
╭───────────────❍
│   🌐 𝑨𝑳𝑳 𝑴𝑬𝑫𝑰𝑨 𝑫𝑶𝑾𝑵𝑳𝑶𝑨𝑫𝑬𝑹
╰───────────────❍

╭─❍
┊  🔗 Send any supported link
┊  ⚡ Auto download enabled
┊  🎬 Video / 🎵 Audio supported
╰───────────────❍
`;

const successUI = (platform, ext) => `
╭─❍
┊  🌐 Platform: ${platform}
┊  📦 Format  : ${ext}
╰───────────────❍
`;

module.exports = {
  config: {
    name: "alldl",
    aliases: ["alldownload", "dl", "download"],
    version: "5.1",
    author: "Arafat",
    role: 0,
    shortDescription: { en: "All-in-one media downloader" },
    longDescription: { en: "Automatically downloads videos or media from multiple supported platforms." },
    category: "utility",
    guide: { en: "Send any supported https:// link to auto-download." }
  },

  onStart: async function ({ sock, chatId, event }) {
    await sock.sendMessage(chatId, { text: startUI }, { quoted: event });
  },

  onChat: async function ({ sock, chatId, event, message }) {
    if (!message) return;

    // 🔥 FIX: message.message থেকে আসল কনটেন্ট বের করুন
    const msgContent = message.message || message;

    let content = "";
    if (msgContent.conversation) content = msgContent.conversation.trim();
    else if (msgContent.extendedTextMessage?.text) content = msgContent.extendedTextMessage.text.trim();
    else if (msgContent.imageMessage?.caption) content = msgContent.imageMessage.caption.trim();
    else if (msgContent.videoMessage?.caption) content = msgContent.videoMessage.caption.trim();

    if (!content || !content.startsWith("https://")) return;
    if (!supportedDomains.some(domain => content.includes(domain))) return;

    try {
      await sock.sendMessage(chatId, {
        react: { text: "⏳", key: event.key }
      });

      const extension =
        content.includes("spotify") || content.includes("soundcloud") || content.includes(".mp3")
          ? "mp3"
          : "mp4";

      const filePath = path.join(
        __dirname,
        "cache",
        `alldl_${Date.now()}.${extension}`
      );

      await fs.ensureDir(path.dirname(filePath));

      const streamURL = `https://arafat.cyou/download?url=${encodeURIComponent(content)}`;

      const stream = await axios({
        url: streamURL,
        method: "GET",
        responseType: "stream",
        timeout: 0,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      const writer = fs.createWriteStream(filePath);
      stream.data.pipe(writer);

      writer.on("finish", async () => {
        const domain =
          supportedDomains.find(d => content.includes(d)) || "Unknown";

        const platformName =
          domain.replace(/(\.com|\.app|\.video|\.net|\.watch)/, "").toUpperCase();

        await sock.sendMessage(chatId, {
          react: { text: "✅", key: event.key }
        });

        try {
          const fileBuffer = fs.readFileSync(filePath);

          if (extension === "mp3") {
            await sock.sendMessage(chatId, {
              audio: fileBuffer,
              mimetype: "audio/mpeg",
              fileName: `alldl_${Date.now()}.mp3`,
              caption: successUI(platformName, "MP3")
            }, { quoted: event });
          } else {
            await sock.sendMessage(chatId, {
              video: fileBuffer,
              mimetype: "video/mp4",
              fileName: `alldl_${Date.now()}.mp4`,
              caption: successUI(platformName, "MP4")
            }, { quoted: event });
          }

          fs.unlinkSync(filePath);

        } catch (sendErr) {
          console.log("ALLDL SEND ERROR:", sendErr.message);
          fs.unlinkSync(filePath);
        }
      });

      writer.on("error", async () => {
        await sock.sendMessage(chatId, {
          react: { text: "❌", key: event.key }
        });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });

    } catch (err) {
      console.log("ALLDL ERROR:", err.message);
      await sock.sendMessage(chatId, {
        react: { text: "❌", key: event.key }
      });
    }
  }
};
