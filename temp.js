const axios = require('axios');

module.exports = {
    config: {
        name: "number2info",
        aliases: ["n2i"],
        version: "1.0.0",
        author: "Arafat Sarder",
        countDown: 5,
        role: 4,
        shortDescription: { en: "Get info from phone number" },
        longDescription: { en: "Fetch name and image associated with a phone number" },
        category: "info",
        guide: {
            en: "{pn} <phone_number> [- <country_code>]\nReply to a message with {pn}\nExamples:\n{pn} 01878266244\n{pn} 01906205500 - bd"
        }
    },

    onStart: async function ({ sock, chatId, event, args, senderId, reply, prefix }) {
        const specialNumbers = ['01878266244', '01906205500', '01906205495'];
        let country = "bd";
        const quotedMsg = event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let quotedText = "";
        if (quotedMsg) {
            if (quotedMsg.conversation) quotedText = quotedMsg.conversation;
            else if (quotedMsg.extendedTextMessage?.text) quotedText = quotedMsg.extendedTextMessage.text;
            else if (quotedMsg.imageMessage?.caption) quotedText = quotedMsg.imageMessage.caption;
            else if (quotedMsg.videoMessage?.caption) quotedText = quotedMsg.videoMessage.caption;
        }

        let input = args.join(" ").trim();
        if (!input && quotedText) {
            input = quotedText.trim();
        }

        if (!input) {
            return reply(`❌ Please provide a phone number or reply to a message.\nExample: ${prefix}n2i 01878266244`);
        }

        let numberPart = input;
        if (input.includes("-")) {
            const parts = input.split("-");
            numberPart = parts[0].trim();
            country = parts[1].trim().toLowerCase() || "bd";
        } else {
            numberPart = input.trim();
        }

        let cleanNumber = numberPart.replace(/[^0-9]/g, '');
        if (!cleanNumber || cleanNumber.length < 6) {
            return reply("❌ Invalid phone number. Please provide a valid number.");
        }

        if (specialNumbers.includes(cleanNumber)) {
            await sock.sendMessage(chatId, {
                react: { text: "😒", key: event.key }
            });
            return reply("Baka You ar so chalak bro 😒");
        }

        const toSmallCaps = (text) => {
            if (!text) return "";
            const chars = {
                'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 'ꜱ', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
                'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ꜰ', 'G': 'ɢ', 'H': 'ʜ', 'I': 'ɪ', 'J': 'ᴊ', 'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ', 'O': 'ᴏ', 'P': 'ᴘ', 'Q': 'ǫ', 'R': 'ʀ', 'S': 'ꜱ', 'T': 'ᴛ', 'U': 'ᴜ', 'V': 'ᴠ', 'W': 'ᴡ', 'X': 'x', 'Y': 'ʏ', 'Z': 'ᴢ'
            };
            return text.split('').map(c => chars[c] || c).join('');
        };

        let coreNumber = cleanNumber;
        if (country === "bd") {
            if (cleanNumber.startsWith('0')) {
                coreNumber = cleanNumber.slice(1);
            } else if (cleanNumber.startsWith('880')) {
                coreNumber = cleanNumber.slice(3);
            }
        } else {
            if (cleanNumber.startsWith('0')) {
                coreNumber = cleanNumber.slice(1);
            }
        }

        const apiURL = `https://number-information-v2.vercel.app/Arafat?number=${coreNumber}&country=${country}`;

        try {
            await sock.sendMessage(chatId, {
                react: { text: "⏳", key: event.key }
            });

            const res = await axios.get(apiURL, { timeout: 15000 });
            const data = res.data;

            if (data.name === "No name found" || data.error) {
                await sock.sendMessage(chatId, {
                    react: { text: "❌", key: event.key }
                });
                return reply("❌ No information found for this number.");
            }

            let responseText = `📞 ${toSmallCaps('Information Found')}\n\n`;
            let nameCount = 1;
            for (const key in data) {
                if (key.startsWith("name") && data[key] && data[key] !== "No name found") {
                    responseText += `👤 ${toSmallCaps('Name')} ${nameCount}: ${toSmallCaps(data[key])}\n`;
                    nameCount++;
                }
            }

            if (data.img && data.img !== "No image available" && data.img.startsWith("http")) {
                try {
                    const imgStream = await axios({
                        url: data.img,
                        method: 'GET',
                        responseType: 'stream',
                        timeout: 10000
                    });
                    await sock.sendMessage(chatId, {
                        image: imgStream.data,
                        caption: responseText.trim()
                    }, { quoted: event });
                } catch (imgErr) {
                    await sock.sendMessage(chatId, {
                        text: responseText.trim()
                    }, { quoted: event });
                }
            } else {
                await sock.sendMessage(chatId, {
                    text: responseText.trim()
                }, { quoted: event });
            }

            await sock.sendMessage(chatId, {
                react: { text: "✅", key: event.key }
            });

        } catch (error) {
            console.error("Number2Info Error:", error.message);
            await sock.sendMessage(chatId, {
                react: { text: "❌", key: event.key }
            });

            try {
                const fallbackURL = `https://number-information-v2.vercel.app/Arafat?number=${cleanNumber}&country=${country}`;
                const res2 = await axios.get(fallbackURL, { timeout: 15000 });
                const data2 = res2.data;
                if (data2.name !== "No name found" && !data2.error) {
                    let responseText = `📞 ${toSmallCaps('Information Found')}\n\n`;
                    let nameCount = 1;
                    for (const key in data2) {
                        if (key.startsWith("name") && data2[key] && data2[key] !== "No name found") {
                            responseText += `👤 ${toSmallCaps('Name')} ${nameCount}: ${toSmallCaps(data2[key])}\n`;
                            nameCount++;
                        }
                    }
                    if (data2.img && data2.img !== "No image available" && data2.img.startsWith("http")) {
                        try {
                            const imgStream = await axios({ url: data2.img, method: 'GET', responseType: 'stream', timeout: 10000 });
                            await sock.sendMessage(chatId, {
                                image: imgStream.data,
                                caption: responseText.trim()
                            }, { quoted: event });
                        } catch (imgErr) {
                            await sock.sendMessage(chatId, { text: responseText.trim() }, { quoted: event });
                        }
                    } else {
                        await sock.sendMessage(chatId, { text: responseText.trim() }, { quoted: event });
                    }
                    await sock.sendMessage(chatId, { react: { text: "✅", key: event.key } });
                    return;
                }
            } catch (e2) {}

            return reply(`❌ Error: ${error.message}`);
        }
    }
};
