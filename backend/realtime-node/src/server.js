import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const port = Number(process.env.PORT ?? 3001);
const phpApiUrl = (process.env.PHP_API_INTERNAL_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "");
const allowedOrigins = (process.env.CLIENT_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.APP_ENV === "production") return false;
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function apiRequest(socket, path, options = {}) {
  const response = await fetch(`${phpApiUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Cookie: socket.handshake.headers.cookie ?? "",
      Origin: socket.handshake.headers.origin ?? allowedOrigins[0] ?? "",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(8000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : `Messaging request failed (${response.status}).`;
    throw new Error(message);
  }
  return result;
}

const app = express();
app.use(cors({
  origin(origin, callback) {
    callback(isAllowedOrigin(origin) ? null : new Error("Origin not allowed"), origin);
  },
}));

app.get("/health", (_request, response) => {
  response.json({ service: "pawly-realtime", status: "ok" });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      callback(isAllowedOrigin(origin) ? null : new Error("Origin not allowed"), origin);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use(async (socket, next) => {
  const cookie = socket.handshake.headers.cookie;
  if (!cookie) {
    next(new Error("Sign in to use real-time messaging."));
    return;
  }
  try {
    const response = await fetch(`${phpApiUrl}/api/auth/me`, {
      headers: { Accept: "application/json", Cookie: cookie },
      signal: AbortSignal.timeout(5000),
    });
    const result = await response.json();
    if (!response.ok || typeof result?.user?.id !== "string") {
      next(new Error("Sign in to use real-time messaging."));
      return;
    }
    socket.data.userId = result.user.id;
    next();
  } catch {
    next(new Error("Unable to authenticate real-time connection."));
  }
});

const onlineUsers = new Map();
io.on("connection", (socket) => {
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);
  const connectionCount = onlineUsers.get(userId) ?? 0;
  onlineUsers.set(userId, connectionCount + 1);
  if (connectionCount === 0) {
    socket.broadcast.emit("presence:update", { userId, online: true });
  }
  socket.emit("presence:snapshot", {
    userIds: [...onlineUsers.keys()].filter((onlineUserId) => onlineUserId !== userId),
  });
  socket.emit("realtime:ready", { connected: true });

  socket.on("conversation:join", async (conversationId, acknowledge = () => {}) => {
    if (typeof conversationId !== "string" || !/^[a-f\d]{24}$/i.test(conversationId)) {
      acknowledge({ error: "Invalid conversation." });
      return;
    }
    try {
      const result = await apiRequest(socket, `/api/conversations/${conversationId}/messages`);
      if (!Array.isArray(result?.messages)) {
        acknowledge({ error: "Invalid conversation response." });
        return;
      }
      socket.join(`conversation:${conversationId}`);
      acknowledge({ joined: true });
    } catch (error) {
      acknowledge({ error: error instanceof Error ? error.message : "Unable to join conversation." });
    }
  });

  socket.on("message:send", async (payload, acknowledge = () => {}) => {
    const conversationId = payload?.conversationId;
    const text = payload?.text;
    if (
      typeof conversationId !== "string" ||
      !/^[a-f\d]{24}$/i.test(conversationId) ||
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 4000
    ) {
      acknowledge({ error: "Enter a valid message." });
      return;
    }
    try {
      const result = await apiRequest(
        socket,
        `/api/conversations/${conversationId}/messages`,
        { method: "POST", body: JSON.stringify({ text }) },
      );
      if (!result?.message || typeof result.recipientId !== "string") {
        acknowledge({ error: "Invalid message response." });
        return;
      }
      const message = { ...result.message, own: true };
      acknowledge({ message });
      socket.to(`conversation:${conversationId}`).emit("message:new", {
        conversationId,
        message: { ...result.message, own: false },
      });
      io.to(`user:${result.recipientId}`).emit("message:notification", {
        conversationId,
      });
    } catch (error) {
      acknowledge({ error: error instanceof Error ? error.message : "Unable to send message." });
    }
  });

  socket.on("conversation:read", async (conversationId) => {
    if (typeof conversationId !== "string" || !/^[a-f\d]{24}$/i.test(conversationId)) return;
    try {
      await apiRequest(socket, `/api/conversations/${conversationId}/messages`);
      socket.to(`conversation:${conversationId}`).emit("message:read", {
        conversationId,
        readerId: userId,
      });
    } catch {
      socket.emit("realtime:error", { message: "Unable to update message read status." });
    }
  });

  socket.on("disconnect", () => {
    const remaining = (onlineUsers.get(userId) ?? 1) - 1;
    if (remaining <= 0) {
      onlineUsers.delete(userId);
      socket.broadcast.emit("presence:update", { userId, online: false });
    } else {
      onlineUsers.set(userId, remaining);
    }
  });
});

httpServer.listen(port, "0.0.0.0", () => {
  console.info(`Pawly realtime service listening on port ${port}`);
});