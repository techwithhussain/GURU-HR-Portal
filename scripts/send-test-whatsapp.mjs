import makeWASocket, { useMultiFileAuthState, Browsers, delay, DisconnectReason } from "@whiskeysockets/baileys";
import path from "path";
import pino from "pino";

const authFolder = path.resolve("./whatsapp-auth");
const targetPhone = "7780885229";

async function startAndSend() {
  console.log("Connecting to WhatsApp session with browser profile...");
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome"),
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`Connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        startAndSend();
      }
    } else if (connection === "open") {
      console.log("✅ WhatsApp Connected & Authenticated!");
      console.log("Waiting 3s for session handshake stabilization...");
      await delay(3000);

      const formatted = targetPhone.replace(/[^0-9]/g, "");
      const jid = formatted.startsWith("91") ? `${formatted}@s.whatsapp.net` : `91${formatted}@s.whatsapp.net`;

      console.log(`📤 Sending Over-Break live alert to ${jid}...`);

      const messageContent = {
        text: `⚠️ *BREAK TIME OVER LIMIT!* (GDA MIS Live Alert)\n\n` +
              `Namaste *Team Member*,\n` +
              `Aapka *Lunch Break (30 Minutes Limit)* over ho chuka hai! ⏱️\n` +
              `Aap pichhle *35 Minutes* se break par hain.\n\n` +
              `👉 *Kripya turant apne desk par wapas aakar portal par "End Break" karein taake attendance record maintain rahe.*\n\n` +
              `🏢 _Guru Digital Advertising MIS Portal_`
      };

      try {
        const sent = await sock.sendMessage(jid, messageContent);
        console.log(`\n🎉 MESSAGE DELIVERED 100% TO: +${formatted}!`);
        console.log(`Message ID: ${sent?.key?.id}`);
        console.log(`Check your WhatsApp on ${targetPhone} now!`);
      } catch (err) {
        console.error("Failed to send message:", err);
      }

      await delay(4000);
      process.exit(0);
    }
  });
}

startAndSend().catch(console.error);
