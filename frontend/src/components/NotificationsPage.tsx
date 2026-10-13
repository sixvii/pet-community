import {
  IconCalendar,
  IconHeart,
  IconPaw,
  IconStar,
} from "@tabler/icons-react";
import { useState, type Dispatch, type SetStateAction } from "react";

export type NotificationTarget =
  | "appointments"
  | "followers"
  | "home"
  | "messages"
  | "pets"
  | "provider-profile";

export type PawlyNotification = {
  id: string;
  name: string;
  action: string;
  detail: string;
  time: string;
  avatar?: string;
  kind: "care" | "community" | "provider";
  target: NotificationTarget;
  providerId?: string;
  conversationId?: string;
  petId?: string;
  unread: boolean;
};

const notificationIcons = {
  care: IconCalendar,
  community: IconHeart,
  provider: IconStar,
};

export function NotificationsPage({
  notifications,
  setNotifications,
  onOpen,
}: {
  notifications: PawlyNotification[];
  setNotifications: Dispatch<SetStateAction<PawlyNotification[]>>;
  onOpen: (notification: PawlyNotification) => void;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unreadCount = notifications.filter((item) => item.unread).length;
  const filtered = notifications.filter(
    (item) => filter === "all" || item.unread,
  );

  const openNotification = (notification: PawlyNotification) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, unread: false } : item,
      ),
    );
    onOpen(notification);
  };

  return (
    <div className="mx-auto min-h-full w-full max-w-[820px] border-x border-white/[0.07] px-8 pt-5 pb-[60px] max-[980px]:border-0 max-[980px]:px-4 max-[980px]:pb-[45px] min-[1280px]:px-10">
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-[var(--pawly-border)]">
        <div className="flex items-center gap-[9px] text-base font-semibold">
          <span>Activity</span>
          {unreadCount > 0 && <small className="text-[14.5px] font-normal text-[var(--pawly-muted)]">{unreadCount} unread</small>}
        </div>
        <button
          className="cursor-pointer border-0 bg-transparent p-0 text-[14.5px] text-[var(--pawly-text)] disabled:cursor-default disabled:opacity-45"
          disabled={!unreadCount}
          onClick={() =>
            setNotifications((current) =>
              current.map((item) => ({ ...item, unread: false })),
            )
          }
        >
          Mark all as read
        </button>
      </div>
      <div
        className="flex gap-[17px] border-b border-[var(--pawly-border)]"
        role="tablist"
        aria-label="Notification filter"
      >
        {(["all", "unread"] as const).map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={filter === item}
            className={`relative flex min-h-[43px] cursor-pointer items-center gap-[7px] border-0 bg-transparent px-0.5 text-[14.5px] ${filter === item ? "text-[var(--pawly-text)] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[var(--pawly-accent)] after:content-['']" : "text-[var(--pawly-muted)]"}`}
            onClick={() => setFilter(item)}
          >
            {item === "all" ? "All activity" : "Unread"}
            {item === "unread" && unreadCount > 0 && <span className="grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[var(--pawly-accent)] text-[11px] text-black">{unreadCount}</span>}
          </button>
        ))}
      </div>
      {filtered.length ? (
        <div className="flex flex-col">
          {filtered.map((notification) => {
            const TypeIcon = notificationIcons[notification.kind];
            return (
              <button
                key={notification.id}
                className={`relative flex w-full items-center gap-[13px] border-0 border-b border-solid border-[var(--pawly-border)] border-l-2 bg-[var(--pawly-card)] px-3 py-[15px] text-left text-[var(--pawly-text)] hover:border-b-[var(--pawly-border-strong)] ${notification.unread ? "border-l-[var(--pawly-accent)]" : "border-l-transparent"}`}
                onClick={() => openNotification(notification)}
              >
                <span className="relative grid size-[43px] shrink-0 place-items-center rounded-full border border-[var(--pawly-border)] text-[var(--pawly-accent)]">
                  {notification.avatar ? (
                    <img className="size-full rounded-full object-cover" src={notification.avatar} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <IconPaw size={20} />
                  )}
                  <span
                    className={`absolute -right-[3px] -bottom-0.5 grid size-[19px] place-items-center rounded-full border-2 border-[var(--pawly-card)] bg-[var(--pawly-card)] ${notification.kind === "community" ? "text-[#e9a8aa]" : "text-[var(--pawly-accent)]"}`}
                  >
                    <TypeIcon size={12} />
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px] text-[14.5px] leading-[1.45]">
                  <span className="overflow-hidden text-ellipsis">
                    <strong className="font-semibold">{notification.name}</strong> {notification.action}
                  </span>
                  <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[var(--pawly-secondary-text)]">{notification.detail}</small>
                  <time className="text-[14.5px] text-[var(--pawly-muted)]">{notification.time}</time>
                </span>
                {notification.unread && (
                  <span className="size-[7px] shrink-0 rounded-full bg-[var(--pawly-accent)]" />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
