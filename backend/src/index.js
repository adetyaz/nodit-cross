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

// Only start the bot if ENABLE_TELEGRAM_BOT is set to 'true'
if (process.env.ENABLE_TELEGRAM_BOT === "true" && botToken) {
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
} else if (botToken) {
  console.warn(
    "⚠️ Telegram bot not started. Set ENABLE_TELEGRAM_BOT=true to enable polling."
  );
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
  telegramBot: bot,
  subscribedChatIds,
});

/**
 * Standard response formatter for API endpoints
 * @param {Array|Object} data - The data to return
 * @returns {Object} Standardized response object with status and data
 */
function formatSuccessResponse(data) {
  return { status: "ok", data: data };
}

/**
 * Standard error response formatter for API endpoints
 * @param {String} message - Error message
 * @returns {Object} Standardized error response with status, message and empty data
 */
function formatErrorResponse(message) {
  return {
    status: "error",
    message: message,
    data: [],
  };
}

/**
 * Standard empty data response formatter
 * @param {String} message - Message explaining why data is empty
 * @returns {Object} Standardized empty data response
 */
function formatEmptyResponse(
  message = "No data available. This may be due to rate limits, no recent activity, or data fetch errors."
) {
  return {
    status: "nodata",
    message: message,
    data: [],
  };
}

app.get("/api/whales", async (req, res) => {
  try {
    const whales = await whaleMonitor.getRecentWhaleMovements();
    if (!Array.isArray(whales) || whales.length === 0) {
      return res.json(formatEmptyResponse());
    }
    res.json(formatSuccessResponse(whales));
  } catch (error) {
    console.error("Error fetching whales:", error);
    res
      .status(500)
      .json(formatErrorResponse("Failed to fetch whale movements"));
  }
});

app.get("/api/alerts", async (req, res) => {
  try {
    const alerts = await whaleMonitor.getRecentAlerts();
    if (!Array.isArray(alerts) || alerts.length === 0) {
      return res.json(formatEmptyResponse("No alerts found."));
    }
    res.json(formatSuccessResponse(alerts));
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json(formatErrorResponse("Failed to fetch alerts"));
  }
});

app.get("/api/wallet", async (req, res) => {
  const { address, chains } = req.query;
  if (!address || typeof address !== "string") {
    return res
      .status(400)
      .json(formatErrorResponse("Valid wallet address required"));
  }
  try {
    const walletData = await whaleMonitor.getWalletData(
      address,
      chains ? chains.split(",") : []
    );
    if (!walletData) {
      return res.json(
        formatEmptyResponse("No wallet data found for the provided address.")
      );
    }
    res.json(formatSuccessResponse(walletData));
  } catch (error) {
    console.error("Error fetching wallet data:", error);
    res.status(500).json(formatErrorResponse("Failed to fetch wallet data"));
  }
});

app.post("/api/subscribe", async (req, res) => {
  res.status(410).json({ error: "Use /start in Telegram bot instead" });
});

// Guardian Whale API endpoints
app.get("/api/guardian-whales", async (req, res) => {
  try {
    const guardianWhales = await whaleMonitor.getGuardianWhales();
    if (!Array.isArray(guardianWhales) || guardianWhales.length === 0) {
      return res.json(formatEmptyResponse());
    }
    res.json(formatSuccessResponse(guardianWhales));
  } catch (error) {
    console.error("Error fetching guardian whales:", error);
    res
      .status(500)
      .json(formatErrorResponse("Failed to fetch guardian whales"));
  }
});

app.get("/api/whale-behavior/:address", async (req, res) => {
  const { address } = req.params;
  const { timeframe = "24h" } = req.query;
  try {
    const behaviorAnalysis = await whaleMonitor.getWhaleBehaviorAnalysis(
      address,
      timeframe
    );
    if (!behaviorAnalysis) {
      return res.json(
        formatEmptyResponse("No behavior analysis available for this address.")
      );
    }
    res.json(formatSuccessResponse(behaviorAnalysis));
  } catch (error) {
    console.error("Error fetching whale behavior:", error);
    res
      .status(500)
      .json(formatErrorResponse("Failed to fetch whale behavior analysis"));
  }
});

app.get("/api/ai-insights/:address", async (req, res) => {
  const { address } = req.params;
  try {
    const aiInsights = await whaleMonitor.getAIInsights(address);
    if (!aiInsights) {
      return res.json(
        formatEmptyResponse("No AI insights available for this address.")
      );
    }
    res.json(formatSuccessResponse(aiInsights));
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    res.status(500).json(formatErrorResponse("Failed to fetch AI insights"));
  }
});

app.get("/api/whale-strategies", async (req, res) => {
  try {
    const strategies = await whaleMonitor.getGuardianWhaleStrategies();
    if (!Array.isArray(strategies) || strategies.length === 0) {
      return res.json(formatEmptyResponse("No whale strategies found."));
    }
    res.json(formatSuccessResponse(strategies));
  } catch (error) {
    console.error("Error fetching whale strategies:", error);
    res
      .status(500)
      .json(formatErrorResponse("Failed to fetch whale strategies"));
  }
});

app.get("/api/whale-portfolio/:address", async (req, res) => {
  const { address } = req.params;
  try {
    const portfolio = await whaleMonitor.getWhalePortfolioAnalysis(address);
    if (!portfolio) {
      return res.json(
        formatEmptyResponse("No portfolio data available for this address.")
      );
    }
    res.json(formatSuccessResponse(portfolio));
  } catch (error) {
    console.error("Error fetching whale portfolio:", error);
    res
      .status(500)
      .json(formatErrorResponse("Failed to fetch whale portfolio analysis"));
  }
});

app.get("/api/whale-influence-network", async (req, res) => {
  try {
    const network = await whaleMonitor.getWhaleInfluenceNetwork();
    if (!network || (Array.isArray(network) && network.length === 0)) {
      return res.json(
        formatEmptyResponse("No influence network data available.")
      );
    }
    res.json(formatSuccessResponse(network));
  } catch (error) {
    console.error("Error fetching whale influence network:", error);
    res
      .status(500)
      .json(formatErrorResponse("Failed to fetch whale influence network"));
  }
});

app.get("/api/market-impact", async (req, res) => {
  const { timeframe = "24h" } = req.query;
  try {
    const marketImpact = await whaleMonitor.getMarketImpactAnalysis(timeframe);
    if (!marketImpact) {
      return res.json(
        formatEmptyResponse(
          "No market impact data available for the specified timeframe."
        )
      );
    }
    res.json(formatSuccessResponse(marketImpact));
  } catch (error) {
    console.error("Error fetching market impact:", error);
    res
      .status(500)
      .json(formatErrorResponse("Failed to fetch market impact analysis"));
  }
});

app.get("/api/guardian-leaderboard", async (req, res) => {
  const { metric = "guardian_score", limit = 20 } = req.query;
  try {
    const leaderboard = await whaleMonitor.getGuardianWhaleLeaderboard(
      metric,
      parseInt(limit)
    );
    if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
      return res.json(
        formatEmptyResponse("No guardian whale leaderboard data available.")
      );
    }
    res.json(formatSuccessResponse(leaderboard));
  } catch (error) {
    console.error("Error fetching guardian leaderboard:", error);
    res
      .status(500)
      .json(formatErrorResponse("Failed to fetch guardian whale leaderboard"));
  }
});

// Real-time event streaming endpoint
app.get("/api/real-time-events", async (req, res) => {
  try {
    const events = await whaleMonitor.getRecentEvents();
    if (!Array.isArray(events) || events.length === 0) {
      return res.json(formatEmptyResponse());
    }
    res.json(formatSuccessResponse(events));
  } catch (error) {
    console.error("Error fetching real-time events:", error);
    res
      .status(500)
      .json(formatErrorResponse("Failed to fetch real-time events"));
  }
});

// Webhook endpoint for Nodit streams
app.post("/webhooks/nodit/:eventType", async (req, res) => {
  const { eventType } = req.params;
  const eventData = req.body;

  try {
    await whaleMonitor.handleWebhookEvent(eventType, eventData);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ error: "Failed to process webhook event" });
  }
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
