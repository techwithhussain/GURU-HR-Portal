import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import path from "path";
import pino from "pino";

const authFolder = path.resolve("./whatsapp-auth");

async function startWhatsApp() {
  console.log("Initializing WhatsApp Gateway Engine...");
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log("\n================ SCAN THIS QR CODE WITH YOUR WHATSAPP ================\n");
      qrcode.generate(qr, { small: true });
      console.log("\n======================================================================\n");
      console.log("👉 Mobile WhatsApp kholein -> 3 Dots (⋮) -> Linked Devices -> Link a Device -> Scan karein!");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) {
        startWhatsApp();
      }
    } else if (connection === "open") {
      console.log("\n🎉 ================================================");
      console.log("🎉 WHATSAPP CONNECTED SUCCESSFULLY!");
      console.log("🎉 ================================================\n");
      
      const rawId = sock.user?.id || "";
      const userPhone = rawId.split(":")[0].replace(/[^0-9]/g, "");
      const userJid = userPhone ? `${userPhone}@s.whatsapp.net` : null;

      if (userJid) {
        console.log(`📨 Sending live test message to your connected number (+${userPhone})...`);
        try {
          await sock.sendMessage(userJid, {
            text: `👋 *Namaste from GDA MIS HR Portal!*\n\n` +
                  `✅ *WhatsApp Integration is Working 100%!* 🎉\n\n` +
                  `🚀 *Available Automations:*\n` +
                  `• ☕ *Over-Break Instant Warning Alerts* (Active)\n` +
                  `• 📄 *1-Click Monthly Salary Slips PDF*\n` +
                  `• 🏖️ *Leave Application & Approval Alerts*\n` +
                  `• ⏰ *Shift Schedule Reminders*\n\n` +
                  `_Guru Digital Advertising HR Management System_`
          });
          console.log("✅ TEST MESSAGE SENT! Apne WhatsApp par check karein!");
        } catch (err) {
          console.error("Error sending message:", err);
        }
      }
    }
  });
}

startWhatsApp();
