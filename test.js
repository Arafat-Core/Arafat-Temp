const Canvas = require("canvas");
const { randomString } = global.utils;

const percentage = total => total / 100;

const defaultFontName = "BeVietnamPro-SemiBold";
const defaultPathFontName = `${__dirname}/assets/font/BeVietnamPro-SemiBold.ttf`;

Canvas.registerFont(`${__dirname}/assets/font/BeVietnamPro-Bold.ttf`, {
	family: "BeVietnamPro-Bold"
});
Canvas.registerFont(defaultPathFontName, {
	family: defaultFontName
});

let deltaNext;
const expToLevel = (exp, deltaNextLevel = deltaNext) => Math.floor((1 + Math.sqrt(1 + 8 * exp / deltaNextLevel)) / 2);
const levelToExp = (level, deltaNextLevel = deltaNext) => Math.floor(((Math.pow(level, 2) - level) * deltaNextLevel) / 2);

global.client.makeRankCard = makeRankCard;

module.exports = {
	config: {
		name: "rank",
		version: "2.3",
		author: "NTKhang (final: clear pfp with public token)",
		countDown: 5,
		role: 0,
		description: {
			vi: "Xem level của bạn hoặc người được tag. Có thể tag nhiều người",
			en: "View your level or the level of the tagged person. You can tag many people"
		},
		category: "rank",
		guide: {
			vi: "   {pn} [để trống | @tags]",
			en: "   {pn} [empty | @tags]"
		},
		envConfig: {
			deltaNext: 5
		}
	},

	onStart: async function ({ message, event, usersData, threadsData, commandName, envCommands }) {
		deltaNext = envCommands[commandName].deltaNext;
		let targetUsers;
		const arrayMentions = Object.keys(event.mentions);

		if (arrayMentions.length === 0) {
			targetUsers = [event.senderID];
		} else {
			targetUsers = arrayMentions;
		}

		const rankCards = await Promise.all(
			targetUsers.map(async userID => {
				const rankCard = await makeRankCard(userID, usersData, threadsData, event.threadID, deltaNext);
				rankCard.path = `${randomString(10)}.png`;
				return rankCard;
			})
		);

		return message.reply({
			attachment: rankCards
		});
	},

	onChat: async function ({ usersData, event }) {
		let { exp } = await usersData.get(event.senderID);
		if (isNaN(exp) || typeof exp !== "number") exp = 0;
		try {
			await usersData.set(event.senderID, { exp: exp + 1 });
		} catch (e) { }
	}
};

const defaultDesignCard = {
	widthCard: 2000,
	heightCard: 500,
	main_color: "#474747",
	sub_color: "rgba(255, 255, 255, 0.5)",
	alpha_subcard: 0.9,
	exp_color: "#e1e1e1",
	expNextLevel_color: "#3f3f3f",
	text_color: "#000000"
};

async function makeRankCard(userID, usersData, threadsData, threadID, deltaNext) {
	const { exp } = await usersData.get(userID);
	const levelUser = expToLevel(exp, deltaNext);

	const expNextLevel = levelToExp(levelUser + 1, deltaNext) - levelToExp(levelUser, deltaNext);
	const currentExp = exp - levelToExp(levelUser, deltaNext);

	const allUser = await usersData.getAll();
	allUser.sort((a, b) => b.exp - a.exp);
	const rank = allUser.findIndex(u => u.userID === userID) + 1;

	const customRankCard = (await threadsData.get(threadID, "data.customRankCard")) || {};

	// তোমার দেওয়া access token সহ clear high-quality profile picture
	const avatar = `https://graph.facebook.com/${userID}/picture?width=720&height=720&access_token=6628568379|c1e620fa708a1dd0511730c4a5a88775`;

	const dataLevel = {
		exp: currentExp,
		expNextLevel,
		name: allUser[rank - 1].name,
		rank: `#\( {rank}/ \){allUser.length}`,
		level: levelUser,
		avatar
	};

	const configRankCard = {
		...defaultDesignCard,
		...customRankCard
	};

	const image = new RankCard({
		...configRankCard,
		...dataLevel
	});

	return await image.buildCard();
}

class RankCard {
	constructor(options) {
		this.widthCard = 2000;
		this.heightCard = 500;
		this.main_color = "#474747";
		this.sub_color = "rgba(255, 255, 255, 0.5)";
		this.alpha_subcard = 0.9;
		this.exp_color = "#e1e1e1";
		this.expNextLevel_color = "#3f3f3f";
		this.text_color = "#000000";
		this.fontName = "BeVietnamPro-Bold";
		this.textSize = 0;

		for (const key in options) this[key] = options[key];
	}

	registerFont(path, name) {
		Canvas.registerFont(path, { family: name });
		return this;
	}

	setFontName(fontName) { this.fontName = fontName; return this; }

	increaseTextSize(size) {
		if (isNaN(size) || size < 0) throw new Error("Size must be positive");
		this.textSize = size;
		return this;
	}

	decreaseTextSize(size) {
		if (isNaN(size) || size < 0) throw new Error("Size must be positive");
		this.textSize = -size;
		return this;
	}

	setWidthCard(w) {
		if (isNaN(w) || w < 0) throw new Error("Invalid width");
		this.widthCard = Number(w);
		return this;
	}

	setHeightCard(h) {
		if (isNaN(h) || h < 0) throw new Error("Invalid height");
		this.heightCard = Number(h);
		return this;
	}

	setAlphaSubCard(a) {
		if (isNaN(a) || a < 0 || a > 1) throw new Error("Alpha must be 0-1");
		this.alpha_subcard = Number(a);
		return this;
	}

	setMainColor(c) { checkFormatColor(c); this.main_color = c; return this; }
	setSubColor(c) { checkFormatColor(c); this.sub_color = c; return this; }
	setExpColor(c) { checkFormatColor(c); this.exp_color = c; return this; }
	setExpBarColor(c) { checkFormatColor(c); this.expNextLevel_color = c; return this; }
	setTextColor(c) { checkFormatColor(c, false); this.text_color = c; return this; }
	setNameColor(c) { checkFormatColor(c, false); this.name_color = c; return this; }
	setLevelColor(c) { checkFormatColor(c, false); this.level_color = c; return this; }
	setExpTextColor(c) { checkFormatColor(c, false); this.exp_text_color = c; return this; }
	setRankColor(c) { checkFormatColor(c, false); this.rank_color = c; return this; }
	setLineColor(c) { this.line_color = c; return this; }

	setExp(e) { this.exp = e; return this; }
	setExpNextLevel(e) { this.expNextLevel = e; return this; }
	setLevel(l) { this.level = l; return this; }
	setRank(r) { this.rank = r; return this; }
	setName(n) { this.name = n; return this; }
	setAvatar(a) { this.avatar = a; return this; }

	async buildCard() {
		let { widthCard, heightCard } = this;
		const {
			main_color, sub_color, alpha_subcard, exp_color, expNextLevel_color,
			text_color, name_color, level_color, rank_color, line_color, exp_text_color,
			exp, expNextLevel, name, level, rank, avatar
		} = this;

		widthCard = Number(widthCard);
		heightCard = Number(heightCard);

		const canvas = Canvas.createCanvas(widthCard, heightCard);
		const ctx = canvas.getContext("2d");

		const alignRim = 3 * percentage(widthCard);
		const Alpha = parseFloat(alpha_subcard || 0);

		ctx.globalAlpha = Alpha;
		await checkColorOrImageAndDraw(alignRim, alignRim, widthCard - alignRim * 2, heightCard - alignRim * 2, ctx, sub_color, 20);
		ctx.globalAlpha = 1;

		ctx.globalCompositeOperation = "destination-out";

		const xyAvatar = heightCard / 2;
		const resizeAvatar = 60 * percentage(heightCard);

		const widthLineBetween = 58 * percentage(widthCard);
		const heightLineBetween = 2 * percentage(heightCard);
		const angleLineCenter = 40;
		const edge = heightCard / 2 * Math.tan(angleLineCenter * Math.PI / 180);

		if (line_color) {
			if (!isUrl(line_color)) {
				ctx.fillStyle = ctx.strokeStyle = checkGradientColor(ctx, Array.isArray(line_color) ? line_color : [line_color], xyAvatar - resizeAvatar / 2 - heightLineBetween, 0, xyAvatar + resizeAvatar / 2 + widthLineBetween + edge, 0);
				ctx.globalCompositeOperation = "source-over";
			} else {
				ctx.save();
				const img = await Canvas.loadImage(line_color);
				ctx.globalCompositeOperation = "source-over";

				ctx.beginPath();
				ctx.arc(xyAvatar, xyAvatar, resizeAvatar / 2 + heightLineBetween, 0, 2 * Math.PI);
				ctx.fill();

				ctx.rect(xyAvatar + resizeAvatar / 2, heightCard / 2 - heightLineBetween / 2, widthLineBetween, heightLineBetween);
				ctx.fill();

				ctx.translate(xyAvatar + resizeAvatar / 2 + widthLineBetween + edge, 0);
				ctx.rotate(angleLineCenter * Math.PI / 180);
				ctx.rect(0, 0, heightLineBetween, 1000);
				ctx.fill();
				ctx.rotate(-angleLineCenter * Math.PI / 180);
				ctx.translate(-(xyAvatar + resizeAvatar / 2 + widthLineBetween + edge), 0);

				ctx.clip();
				ctx.drawImage(img, 0, 0, widthCard, heightCard);
				ctx.restore();
			}
		}

		ctx.beginPath();
		if (!isUrl(line_color)) ctx.rect(xyAvatar + resizeAvatar / 2, heightCard / 2 - heightLineBetween / 2, widthLineBetween, heightLineBetween);
		ctx.fill();

		ctx.beginPath();
		if (!isUrl(line_color)) {
			ctx.moveTo(xyAvatar + resizeAvatar / 2 + widthLineBetween + edge, 0);
			ctx.lineTo(xyAvatar + resizeAvatar / 2 + widthLineBetween - edge, heightCard);
			ctx.lineWidth = heightLineBetween;
			ctx.stroke();
		}

		ctx.beginPath();
		if (!isUrl(line_color)) ctx.arc(xyAvatar, xyAvatar, resizeAvatar / 2 + heightLineBetween, 0, 2 * Math.PI);
		ctx.fill();

		ctx.globalCompositeOperation = "destination-out";
		ctx.fillRect(0, 0, widthCard, alignRim);
		ctx.fillRect(0, heightCard - alignRim, widthCard, alignRim);

		const radius = 6 * percentage(heightCard);
		const xStartExp = (25 + 1.5) * percentage(widthCard);
		const yStartExp = 67 * percentage(heightCard);
		const widthExp = 40.5 * percentage(widthCard);
		const heightExp = radius * 2;

		ctx.globalCompositeOperation = "source-over";
		centerImage(ctx, await Canvas.loadImage(avatar), xyAvatar, xyAvatar, resizeAvatar, resizeAvatar);

		// EXP bar background
		if (!isUrl(expNextLevel_color)) {
			ctx.fillStyle = checkGradientColor(ctx, expNextLevel_color, xStartExp, yStartExp, xStartExp + widthExp, yStartExp);
			ctx.beginPath();
			ctx.arc(xStartExp, yStartExp + radius, radius, Math.PI * 1.5, Math.PI * 0.5, true);
			ctx.fill();
			ctx.fillRect(xStartExp, yStartExp, widthExp, heightExp);
			ctx.arc(xStartExp + widthExp, yStartExp + radius, radius, Math.PI * 1.5, Math.PI * 0.5, false);
			ctx.fill();
		} else {
			ctx.save();
			const img = await Canvas.loadImage(expNextLevel_color);
			ctx.beginPath();
			roundedRect(ctx, xStartExp - radius, yStartExp, widthExp + radius * 2, heightExp, radius);
			ctx.clip();
			ctx.drawImage(img, xStartExp - radius, yStartExp, widthExp + radius * 2, heightExp);
			ctx.restore();
		}

		// Current EXP
		const widthExpCurrent = (exp / expNextLevel) * widthExp;
		if (!isUrl(exp_color)) {
			ctx.fillStyle = checkGradientColor(ctx, exp_color, xStartExp, yStartExp, xStartExp + widthExp, yStartExp);
			ctx.beginPath();
			ctx.arc(xStartExp, yStartExp + radius, radius, Math.PI * 1.5, Math.PI * 0.5, true);
			ctx.fill();
			ctx.fillRect(xStartExp, yStartExp, widthExpCurrent, heightExp);
			if (widthExpCurrent > radius) {
				ctx.beginPath();
				ctx.arc(xStartExp + widthExpCurrent, yStartExp + radius, radius, Math.PI * 1.5, Math.PI * 0.5);
				ctx.fill();
			}
		} else {
			ctx.save();
			const img = await Canvas.loadImage(exp_color);
			ctx.beginPath();
			roundedRect(ctx, xStartExp - radius, yStartExp, widthExpCurrent + radius * 2, heightExp, radius);
			ctx.clip();
			ctx.drawImage(img, xStartExp - radius, yStartExp, widthExpCurrent + radius * 2, heightExp);
			ctx.restore();
		}

		// Texts
		const maxSizeFont_Name = 4 * percentage(widthCard) + this.textSize;
		const maxSizeFont_Exp = 2 * percentage(widthCard) + this.textSize;
		const maxSizeFont_Level = 3.25 * percentage(widthCard) + this.textSize;
		const maxSizeFont_Rank = 4 * percentage(widthCard) + this.textSize;

		ctx.textAlign = "end";

		// Rank
		ctx.font = autoSizeFont(18.4 * percentage(widthCard), maxSizeFont_Rank, rank, ctx, this.fontName);
		const mRank = ctx.measureText(rank);
		ctx.fillStyle = checkGradientColor(ctx, rank_color || text_color, 94 * percentage(widthCard) - mRank.width, 76 * percentage(heightCard) + mRank.emHeightDescent, 94 * percentage(widthCard), 76 * percentage(heightCard) - mRank.actualBoundingBoxAscent);
		ctx.fillText(rank, 94 * percentage(widthCard), 76 * percentage(heightCard));

		// Level
		const textLevel = `Lv ${level}`;
		ctx.font = autoSizeFont(9.8 * percentage(widthCard), maxSizeFont_Level, textLevel, ctx, this.fontName);
		const mLevel = ctx.measureText(textLevel);
		ctx.fillStyle = checkGradientColor(ctx, level_color || text_color, 94 * percentage(widthCard) - mLevel.width, 32 * percentage(heightCard) + mLevel.emHeightDescent, 94 * percentage(widthCard), 32 * percentage(heightCard) - mLevel.actualBoundingBoxAscent);
		ctx.fillText(textLevel, 94 * percentage(widthCard), 32 * percentage(heightCard));

		// Name
		ctx.textAlign = "center";
		ctx.font = autoSizeFont(52.1 * percentage(widthCard), maxSizeFont_Name, name, ctx, this.fontName);
		const mName = ctx.measureText(name);
		ctx.fillStyle = checkGradientColor(ctx, name_color || text_color, 47.5 * percentage(widthCard) - mName.width / 2, 40 * percentage(heightCard) + mName.emHeightDescent, 47.5 * percentage(widthCard) + mName.width / 2, 40 * percentage(heightCard) - mName.actualBoundingBoxAscent);
		ctx.fillText(name, 47.5 * percentage(widthCard), 40 * percentage(heightCard));

		// EXP text
		const textExp = `Exp \( {exp}/ \){expNextLevel}`;
		ctx.font = autoSizeFont(49 * percentage(widthCard), maxSizeFont_Exp, textExp, ctx, this.fontName);
		const mExp = ctx.measureText(textExp);
		ctx.fillStyle = checkGradientColor(ctx, exp_text_color || text_color, 47.5 * percentage(widthCard) - mExp.width / 2, 61.4 * percentage(heightCard) + mExp.emHeightDescent, 47.5 * percentage(widthCard) + mExp.width / 2, 61.4 * percentage(heightCard) - mExp.actualBoundingBoxAscent);
		ctx.fillText(textExp, 47.5 * percentage(widthCard), 61.4 * percentage(heightCard));

		// Main background
		ctx.globalCompositeOperation = "destination-over";
		await checkColorOrImageAndDraw(0, 0, widthCard, heightCard, ctx, main_color, radius * 2);

		return canvas.createPNGStream();
	}
}

// All Helper Functions (কোনো function remove করা হয়নি)
async function checkColorOrImageAndDraw(x, y, w, h, ctx, color, r) {
	if (!isUrl(color)) {
		ctx.fillStyle = Array.isArray(color) ? checkGradientColor(ctx, color, x, y, x + w, y + h) : color;
		drawRoundedRect(ctx, x, y, w, h, r);
	} else {
		const img = await Canvas.loadImage(color);
		ctx.save();
		roundedRect(ctx, x, y, w, h, r);
		ctx.clip();
		ctx.drawImage(img, x, y, w, h);
		ctx.restore();
	}
}

function drawRoundedRect(ctx, x, y, w, h, r) {
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
	ctx.fill();
}

function roundedRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}

function centerImage(ctx, img, cx, cy, sizeW, sizeH) {
	const x = cx - sizeW / 2;
	const y = cy - sizeH / 2;
	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, sizeW / 2, 0, Math.PI * 2);
	ctx.clip();
	ctx.drawImage(img, x, y, sizeW, sizeH);
	ctx.restore();
}

function autoSizeFont(maxW, maxSize, text, ctx, font) {
	let size = 1;
	while (true) {
		ctx.font = `${size}px ${font}`;
		if (ctx.measureText(text).width > maxW || size > maxSize) break;
		size++;
	}
	return `${size - 1}px ${font}`;
}

function checkGradientColor(ctx, color, x1, y1, x2, y2) {
	if (Array.isArray(color)) {
		const grad = ctx.createLinearGradient(x1, y1, x2, y2);
		color.forEach((c, i) => grad.addColorStop(i / (color.length - 1), c));
		return grad;
	}
	return color;
}

function isUrl(str) {
	try { new URL(str); return true; } catch { return false; }
}

function checkFormatColor(color, enableUrl = true) {
	const hex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
	const rgb = /^rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\)$/;
	const rgba = /^rgba\(\d{1,3},\s?\d{1,3},\s?\d{1,3},\s?(0|1|\d\.\d+)\)$/;
	if (!hex.test(color) && !rgb.test(color) && !rgba.test(color) && (enableUrl ? !isUrl(color) : true) && !Array.isArray(color)) {
		throw new Error("Invalid color format");
	}
}
