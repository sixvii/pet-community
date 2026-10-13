export type ChatMessage = {
  id: string;
  text: string;
  time?: string;
  own?: boolean;
  senderId?: string;
  createdAt?: string;
  read?: boolean;
};

export type ChatConversation = {
  id: string;
  peerId?: string;
  handle?: string;
  name: string;
  detail: string;
  avatar: string;
  time?: string;
  unread?: number;
  messages: ChatMessage[];
  online?: boolean;
};

export function isChatConversation(value: unknown): value is ChatConversation {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value && typeof value.id === "string" &&
    "name" in value && typeof value.name === "string" &&
    "detail" in value && typeof value.detail === "string" &&
    "avatar" in value && typeof value.avatar === "string" &&
    "messages" in value && Array.isArray(value.messages) &&
    value.messages.every(isChatMessage)
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value && typeof value.id === "string" &&
    "text" in value && typeof value.text === "string" &&
    (!("time" in value) || typeof value.time === "string") &&
    (!("senderId" in value) || typeof value.senderId === "string") &&
    (!("createdAt" in value) || typeof value.createdAt === "string") &&
    (!("read" in value) || typeof value.read === "boolean")
  );
}
