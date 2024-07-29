// copy code? pls put my GitHub name as credit
// 🖕 to those who copy without credit

const makeWASocket = require("@whiskeysockets/baileys").default;
const qrcode = require("qrcode-terminal");
const fs = require('fs');
const pino = require('pino');
const { delay, useMultiFileAuthState, fetchLatestBaileysVersion, PHONENUMBER_MCC, jidNormalizedUser, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const chalk = require("chalk");
const readline = require("readline");

let phoneNumber = "2349066528353"; // Declare the default phone number if needed

const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
const useMobile = process.argv.includes("--mobile");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function qr() {
    //------------------------------------------------------
    let { version, isLatest } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    const msgRetryCounterCache = new NodeCache(); // For retry message, "waiting message"
    const XeonBotInc = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !pairingCode, // Pop up QR in terminal log
        mobile: useMobile, // Mobile API (prone to bans)
        browser: ['Chrome (Linux)', '', ''], // For this issue: https://github.com/WhiskeySockets/Baileys/issues/328
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true, // Set false for offline
        generateHighQualityLinkPreview: true, // Make high preview link
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid);
            let msg = await store.loadMessage(jid, key.id);
            return msg?.message || "";
        },
        msgRetryCounterCache, // Resolve waiting messages
        defaultQueryTimeoutMs: undefined, // For this issue: https://github.com/WhiskeySockets/Baileys/issues/276
    });

    // Login use pairing code
    // Source code: https://github.com/WhiskeySockets/Baileys/blob/master/Example/example.ts#L61
    if (pairingCode && !XeonBotInc.authState.creds.registered) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile API');

        if (!!phoneNumber) {
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

            if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
                console.log(chalk.bgBlack(chalk.redBright("Start with country code of your WhatsApp Number, Example: ++2349066528353")));
                process.exit(0);
            }
        } else {
            phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Please type your WhatsApp number 😍\nFor example: ++2349066528353 : `)));
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

            // Ask again when entering the wrong number
            if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
                console.log(chalk.bgBlack(chalk.redBright("Start with country code of your WhatsApp Number, Example: ++2349066528353")));
                phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Please type your WhatsApp number 😍\nFor example: ++2349066528353 : `)));
                phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
                rl.close();
            }
        }

        setTimeout(async () => {
            let code = await XeonBotInc.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)));
        }, 3000);
    }
    //------------------------------------------------------

    XeonBotInc.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection === "open") {
            await delay(1000 * 10);
            await XeonBotInc.sendMessage(XeonBotInc.user.id, { text: `🪀Support_Developer\n\n\n⎆Follow Official Channel: https://whatsapp.com/channel/0029VaeRru3ADTOEKPCPom0L\n\n\n` });
            let sessionXeon = fs.readFileSync('./sessions/creds.json');
            await delay(1000 * 2);
            await XeonBotInc.sendMessage(XeonBotInc.user.id, { document: sessionXeon, mimetype: 'application/json', fileName: 'creds.json' });
            await XeonBotInc.sendMessage(XeonBotInc.user.id, { text: `⚠️Do not share this file with anybody⚠️\n✦•······················•✦•······················•✦\n┌─❖\n│ Yowaimo 🥳\n└┬❖\n┌┤✑ Thanks for Venom-2 🕷️\n│└────────────┈ ⳹\n│©2024-2099 David Cyril\n└─────────────────┈ ⳹` });
            await delay(1000 * 2);
            process.exit(0);
        }
        if (
            connection === "close" &&
            lastDisconnect &&
            lastDisconnect.error &&
            lastDisconnect.error.output.statusCode !== 401
        ) {
            qr();
        }
    });
    XeonBotInc.ev.on('creds.update', saveCreds);
    XeonBotInc.ev.on("messages.upsert", () => { });
}

qr();

process.on('uncaughtException', function (err) {
    let e = String(err);
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    console.log('Caught exception: ', err);
});
