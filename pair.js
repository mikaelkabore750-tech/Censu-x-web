const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { XmID } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const {
    default: Xm,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("maher-zubair-baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = XmID();
    let num = req.query.number;
    let attempt = 0; // Counter for retry attempts

    async function Xm_Pair() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let Mikael = Xm({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: ["Chrome (Linux)", "", ""]
            });

            if (!Mikael.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Mikael.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            Mikael.ev.on('creds.update', saveCreds);
            Mikael.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection == "open") {
                    // Send initial message after linking
                    let initialMessage = `*_Sending session id, Wait..._*`;
                    await Mikael.sendMessage(Mikael.user.id, { text: initialMessage });

                    await delay(20000); // Delay for 5 seconds before sending the session

                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    await delay(800); // Small delay before processing the credentials

                    // Encode credentials to base64 and send session message
                    let b64data = Buffer.from(data).toString('base64');
                    let session = await Mikael.sendMessage(Mikael.user.id, { text: 'Censu;;;' + b64data });
await delay(8000)
                    // Send final Xm_msg_TEXT message
                    let Xm_MD_TEXT = `_SESSION ID_`;
                    await Mikael.sendMessage(Mikael.user.id, { text: Xm_msg_TEXT }, { quoted: session });

                    await delay(100); // Delay before closing connection
                    await Mikael.ws.close(); // Close the WebSocket connection
                    return await removeFile('./temp/' + id); // Remove the temporary files
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    if (attempt < 1) { // Retry only once
                        attempt++;
                        await delay(10000); // Wait before retrying
                        Xm_Pair(); // Retry connection
                    } else {
                        console.log("Max retry attempts reached");
                        await removeFile('./temp/' + id);
                        if (!res.headersSent) {
                            await res.send({ code: "Service Unavailable" });
                        }
                    }
                }
            });
        } catch (err) {
            console.log("Service error:", err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
        }
    }

    return await Xm_Pair();
});

module.exports = router;
