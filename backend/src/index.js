import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import WhaleMonitor from "./whaleMonitor.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const botToken = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;
const subscribedChatIds = new Set();

if (botToken) {
  bot = new TelegramBot(botToken, { polling: true });
  console.log("🐬 Telegram Bot initialized");

  // Handle /start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id.toString();
    if (!subscribedChatIds.has(chatId)) {
      subscribedChatIds.add(chatId);
      bot.sendMessage(chatId, "You’re subscribed to whale alerts! 🐳");
      console.log(`✅ Subscribed chat ID: ${chatId}`);
    } else {
      bot.sendMessage(chatId, "You’re already subscribed! 🐳");
    }
  });
} else {
  console.warn("⚠️ No TELEGRAM_BOT_TOKEN in .env. Telegram alerts disabled.");
}

app.use(cors());
app.use(express.json());

let whaleMonitor = new WhaleMonitor({
  whaleThreshold: "10000000000000000000000",
  chains: ["ethereum", "polygon", "arbitrum", "base", "optimism"],
  networks: ["mainnet", "mainnet", "mainnet", "mainnet", "mainnet"],
  updateInterval: 30000,
  useMockData: process.env.USE_MOCK_DATA === "true",
  telegramBot: bot,
  subscribedChatIds,
});

app.get("/api/whales", async (req, res) => {
  try {
    const whales = await whaleMonitor.getRecentWhaleMovements();
    res.json(whales);
  } catch (error) {
    console.error("Error fetching whales:", error);
    res.status(500).json({ error: "Failed to fetch whale movements" });
  }
});

app.get("/api/alerts", async (req, res) => {
  try {
    const alerts = await whaleMonitor.getRecentAlerts();
    res.json(alerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

app.get("/api/wallet", async (req, res) => {
  const { address, chains } = req.query;
  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Valid wallet address required" });
  }
  try {
    const walletData = await whaleMonitor.getWalletData(
      address,
      chains ? chains.split(",") : []
    );
    res.json(walletData);
  } catch (error) {
    console.error("Error fetching wallet data:", error);
    res.status(500).json({ error: "Failed to fetch wallet data" });
  }
});

app.post("/api/subscribe", async (req, res) => {
  res.status(410).json({ error: "Use /start in Telegram bot instead" });
});

app.post("/api/config", async (req, res) => {
  const { whaleThreshold, chains, networks, updateInterval } = req.body;
  if (
    !whaleThreshold ||
    !chains?.length ||
    !networks?.length ||
    !updateInterval
  ) {
    return res.status(400).json({ error: "Invalid configuration" });
  }
  if (!Array.isArray(chains) || !Array.isArray(networks)) {
    return res
      .status(400)
      .json({ error: "Chains and networks must be arrays" });
  }
  const validChains = ["ethereum", "polygon", "arbitrum", "base", "optimism"];
  if (chains.some((c) => !validChains.includes(c))) {
    return res.status(400).json({
      error: `Invalid chain(s). Supported: ${validChains.join(", ")}`,
    });
  }
  try {
    whaleMonitor.updateConfig({
      whaleThreshold: String(whaleThreshold),
      chains,
      networks,
      updateInterval: Number(updateInterval),
    });
    res.json({ message: "Configuration updated" });
  } catch (error) {
    console.error("Error updating config:", error);
    res.status(500).json({ error: "Failed to update configuration" });
  }
});

const serverPort = port || process.env.PORT;
app.listen(serverPort, () => {
  console.log(`Whale Tracker on port ${serverPort}`);
});
