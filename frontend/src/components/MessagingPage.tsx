import {
  IconArrowLeft,
  IconDotsVertical,
  IconSearch,
  IconSend,
} from "@tabler/icons-react";
import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { io, type Socket } from "socket.io-client";

import { getApiUrl } from "../data/api";
import { isChatConversation, type ChatConversation, type ChatMessage } from "./chatTypes";

export function MessagingPage({
  initialConversation,
  conversations,
  setConversations,
  userId,
  onNotify,
  onRefreshNotifications,
}: {
  initialConversation: string;
  conversations: ChatConversation[];
  setConversations: Dispatch<SetStateAction<ChatConversation[]>>;
  userId: string;
  onNotify: (message: string) => void;
  onRefreshNotifications: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(initialConversation);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [onlinePeerIds, setOnlinePeerIds] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const onNotifyRef = useRef(onNotify);
  const onRefreshNotificationsRef = useRef(onRefreshNotifications);
  useEffect(() => {
    onNotifyRef.current = onNotify;
    onRefreshNotificationsRef.current = onRefreshNotifications;
  }, [onNotify, onRefreshNotifications]);
  const selected =
    conversations.find((conversation) => conversation.id === selectedId) ??
    conversations[0];
  const filtered = conversations.filter((conversation) =>
    `${conversation.name} ${conversation.detail}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetch(getApiUrl("conversations"), {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
              ? result.error
              : `Unable to load conversations (${response.status}).`;
          throw new Error(message);
        }
        if (
          typeof result !== "object" ||
          result === null ||
          !("conversations" in result) ||
          !Array.isArray(result.conversations) ||
          !result.conversations.every(isChatConversation)
        ) {
          throw new Error("The server returned an invalid conversation list.");
        }
        if (controller.signal.aborted) return;
        setConversations(result.conversations.map((conversation) => ({
          ...conversation,
          messages: conversation.messages.map((message) => ({
            ...message,
            own: message.senderId === userId,
          })),
        })));
        if (initialConversation) setSelectedId(initialConversation);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setMessageError(error instanceof Error ? error.message : "Unable to load conversations.");
        }
      });
    return () => controller.abort();
  }, [initialConversation, setConversations, userId]);

  useEffect(() => {
    const realtimeUrl = import.meta.env.VITE_REALTIME_URL?.trim() || undefined;
    const socket = io(realtimeUrl, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
      tryAllTransports: true,
    });
    socketRef.current = socket;
    socket.on("connect_error", (error: Error) => setMessageError(error.message));
    socket.on("realtime:error", (error: { message?: string }) => {
      setMessageError(error.message || "Real-time messaging is unavailable.");
    });
    socket.on("presence:update", (presence: { userId: string; online: boolean }) => {
      setOnlinePeerIds((current) =>
        presence.online
          ? current.includes(presence.userId) ? current : [...current, presence.userId]
          : current.filter((id) => id !== presence.userId),
      );
    });
    socket.on("presence:snapshot", (snapshot: { userIds: string[] }) => {
      if (Array.isArray(snapshot.userIds)) setOnlinePeerIds(snapshot.userIds);
    });
    socket.on("message:new", (event: { conversationId: string; message: ChatMessage }) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id !== event.conversationId
            ? conversation
            : {
                ...conversation,
                time: event.message.createdAt
                  ? new Date(event.message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                  : "Now",
                messages: conversation.messages.some((message) => message.id === event.message.id)
                  ? conversation.messages
                  : [...conversation.messages, { ...event.message, own: false }],
              },
        ),
      );
    });
    socket.on("message:notification", async () => {
      onNotifyRef.current("You received a new message.");
      try {
        await onRefreshNotificationsRef.current();
        const response = await fetch(getApiUrl("conversations"), {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const result: unknown = await response.json();
        if (
          response.ok &&
          typeof result === "object" &&
          result !== null &&
          "conversations" in result &&
          Array.isArray(result.conversations) &&
          result.conversations.every(isChatConversation)
        ) {
          setConversations(result.conversations.map((conversation) => ({
            ...conversation,
            messages: conversation.messages.map((message) => ({
              ...message,
              own: message.senderId === userId,
            })),
          })));
        }
      } catch (error) {
        setMessageError(error instanceof Error ? error.message : "Unable to refresh your conversations.");
      }
    });
    socket.on("message:read", (event: { conversationId: string }) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === event.conversationId
            ? { ...conversation, messages: conversation.messages.map((message) => message.own ? { ...message, read: true } : message) }
            : conversation,
        ),
      );
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [setConversations, userId]);

  useEffect(() => {
    const selectedConversationId = selected?.id;
    if (!selectedConversationId) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("conversation:join", selectedConversationId, (result: { joined?: boolean; error?: string }) => {
      if (result.error) setMessageError(result.error);
    });
    socket.emit("conversation:read", selectedConversationId);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversationId
          ? { ...conversation, messages: conversation.messages.map((message) => message.own ? message : { ...message, read: true }) }
          : conversation,
      ),
    );
  }, [selected?.id, setConversations]);

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selected) return;
    setMessageError("");
    socketRef.current?.emit(
      "message:send",
      { conversationId: selected.id, text },
      (result: { message?: ChatMessage; error?: string }) => {
        const sentMessage = result.message;
        if (result.error || !sentMessage) {
          setMessageError(result.error || "Unable to send message.");
          return;
        }
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selected.id
              ? {
                  ...conversation,
                  time: sentMessage.createdAt
                    ? new Date(sentMessage.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                    : "Now",
                  messages: [...conversation.messages, { ...sentMessage, own: true }],
                }
              : conversation,
          ),
        );
        setDraft("");
      },
    );
  };

  if (!selected) {
    return (
      <div className="mx-auto min-h-full w-full max-w-[1050px] border-x border-white/[0.07] px-8 pt-5 pb-[60px] text-center text-[var(--pawly-muted)] max-[980px]:border-0 max-[980px]:px-4 max-[980px]:pb-[45px] min-[1280px]:px-10">
        {messageError || "No conversations yet."}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-[1050px] border-x border-white/[0.07] px-8 pt-5 pb-[60px] max-[980px]:border-0 max-[980px]:px-4 max-[980px]:pb-[45px] min-[1280px]:px-10">
      <section
        className="relative grid h-[min(680px,calc(100dvh-160px))] min-h-[420px] grid-cols-[minmax(250px,0.8fr)_minmax(0,1.4fr)] overflow-hidden rounded-[13px] border border-[var(--pawly-border)] max-[700px]:h-[calc(100dvh-166px)] max-[700px]:min-h-[380px] max-[700px]:grid-cols-1"
        aria-label="Messages"
      >
        <aside className={`flex min-w-0 flex-col border-r border-[var(--pawly-border)] ${mobileThreadOpen ? "max-[700px]:hidden" : ""}`}>
          <label className="flex h-[54px] shrink-0 items-center gap-[9px] border-b border-[var(--pawly-border)] px-[15px] text-[var(--pawly-muted)]">
            <IconSearch size={17} />
            <input
              className="w-full min-w-0 border-0 bg-transparent text-[14.5px] text-[var(--pawly-text)] outline-none placeholder:text-[var(--pawly-muted)]"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
            />
          </label>
          <div className="overflow-y-auto">
            {filtered.map((conversation) => {
              const latest =
                conversation.messages[conversation.messages.length - 1];
              return (
                <button
                  key={conversation.id}
                  className={`flex w-full min-w-0 items-center gap-[10px] border-0 border-b border-white/[0.06] px-3 py-[13px] text-left hover:bg-white/[0.055] ${conversation.id === selectedId ? "bg-white/[0.055]" : "bg-transparent"}`}
                  onClick={() => {
                    setSelectedId(conversation.id);
                    setConversations((current) =>
                      current.map((item) =>
                        item.id === conversation.id
                          ? { ...item, unread: 0 }
                          : item,
                      ),
                    );
                    setMobileThreadOpen(true);
                  }}
                >
                  <img className="size-[39px] shrink-0 rounded-full object-cover" src={conversation.avatar} alt="" loading="lazy" decoding="async" />
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="flex min-w-0 justify-between gap-1.5">
                      <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-semibold">{conversation.name}</strong>
                      <small className="shrink-0 text-[14.5px] text-[var(--pawly-muted)]">{conversation.time}</small>
                    </span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] text-[var(--pawly-muted)]">
                      {latest?.text}
                    </span>
                  </span>
                  {!!conversation.unread && (
                    <span className="grid size-[17px] shrink-0 place-items-center rounded-full bg-[var(--pawly-accent)] text-[14.5px] font-bold text-black">
                      {conversation.unread}
                    </span>
                  )}
                </button>
              );
            })}
            {!filtered.length && (
              <p className="p-3 text-[14.5px] text-[var(--pawly-muted)]">
                No conversations found.
              </p>
            )}
          </div>
        </aside>
        <div className={`min-w-0 flex-col ${mobileThreadOpen ? "flex" : "flex max-[700px]:hidden"}`}>
          <header className="flex min-h-[63px] items-center gap-[10px] border-b border-[var(--pawly-border)] px-[14px] py-[10px]">
            <button
              className="hidden size-9 place-items-center rounded-lg border-0 bg-transparent text-[var(--pawly-text)] max-[700px]:grid"
              aria-label="Back to conversations"
              onClick={() => setMobileThreadOpen(false)}
            >
              <IconArrowLeft size={19} />
            </button>
            <img className="size-[39px] shrink-0 rounded-full object-cover" src={selected.avatar} alt="" loading="lazy" decoding="async" />
            <span className="flex min-w-0 flex-1 flex-col">
              <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px]">{selected.name}</strong>
              <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] text-[var(--pawly-muted)]">{selected.peerId && onlinePeerIds.includes(selected.peerId) ? "Online" : selected.detail}</small>
            </span>
            <button
              className="grid size-9 place-items-center rounded-lg border-0 bg-transparent text-[var(--pawly-text)]"
              aria-label="More conversation options"
            >
              <IconDotsVertical size={19} />
            </button>
          </header>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-[18px]" aria-live="polite">
            <span className="my-0.5 mb-2 self-center text-[14.5px] text-[var(--pawly-muted)]">Today</span>
            {selected.messages.map((message) => (
              <div
                key={message.id}
                className={`flex max-w-[min(86%,390px)] flex-col gap-1 self-start ${message.own ? "self-end" : ""}`}
              >
                <p className={`m-0 rounded-[12px_12px_12px_3px] border border-[var(--pawly-border)] px-3 py-2.5 text-[14.5px] text-[var(--pawly-text)] ${message.own ? "rounded-[12px_12px_3px_12px] border-[#dce7b8]/30 text-[var(--pawly-accent)]" : ""}`}>{message.text}</p>
                <time className={`px-[3px] text-[14.5px] text-[var(--pawly-muted)] ${message.own ? "self-end" : ""}`}>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : message.time}{message.own && message.read ? " · Read" : ""}</time>
              </div>
            ))}
          </div>
          {messageError && <p className="m-0 px-[14px] text-[13px] text-[#ff8c8c]" role="alert">{messageError}</p>}
          <form className="mx-[13px] mb-[13px] flex min-h-[58px] items-center gap-[10px] rounded-[10px] border border-[var(--pawly-border-strong)] py-[7px] pr-2 pl-[13px]" onSubmit={sendMessage}>
            <input
              className="w-full min-w-0 border-0 bg-transparent text-[14.5px] text-[var(--pawly-text)] outline-none placeholder:text-[var(--pawly-muted)]"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message…"
              aria-label="Write a message"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send message"
              className="grid size-[34px] shrink-0 place-items-center rounded-lg border-0 bg-[var(--pawly-accent)] text-black disabled:cursor-default disabled:opacity-45"
            >
              <IconSend size={18} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
