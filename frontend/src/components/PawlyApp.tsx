import {
  IconArrowRight,
  IconBell,
  IconBookmark,
  IconBuildingStore,
  IconCalendar,
  IconCircleCheck,
  IconHeart,
  IconHome,
  IconMapPin,
  IconMessages,
  IconPaw,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconStarFilled,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";

import { FeedColumn } from "./FeedColumn";
import { getApiCollection, getApiUrl } from "../data/api";
import type { Appointment, AppointmentStatus, FeedComment, FeedPost, Pet, Provider } from "../data/models";
import type { ProviderService } from "../pages/provider/ProviderBusinessPage";
import type { PawlyNotification } from "./NotificationsPage";
import type { ChatConversation } from "./chatTypes";
import { isChatConversation } from "./chatTypes";

const AdminWorkspacePage = lazy(() =>
  import("../pages/admin/AdminWorkspacePage").then((module) => ({
    default: module.AdminWorkspacePage,
  })),
);
const OwnerWorkspacePage = lazy(() =>
  import("../pages/owner/OwnerWorkspacePage").then((module) => ({
    default: module.OwnerWorkspacePage,
  })),
);
const ProviderAreaPage = lazy(() =>
  import("../pages/provider/ProviderBusinessPage").then((module) => ({
    default: module.ProviderAreaPage,
  })),
);
const ProviderBusinessPage = lazy(() =>
  import("../pages/provider/ProviderBusinessPage").then((module) => ({
    default: module.ProviderBusinessPage,
  })),
);
const BookingModal = lazy(() =>
  import("./AppointmentFlows").then((module) => ({
    default: module.BookingModal,
  })),
);
const OwnerAppointmentsPage = lazy(() =>
  import("./AppointmentFlows").then((module) => ({
    default: module.OwnerAppointmentsPage,
  })),
);
const ProviderAppointmentsPage = lazy(() =>
  import("./AppointmentFlows").then((module) => ({
    default: module.ProviderAppointmentsPage,
  })),
);
const FavoritesPage = lazy(() =>
  import("./FavoritesPage").then((module) => ({ default: module.FavoritesPage })),
);
const MessagingPage = lazy(() =>
  import("./MessagingPage").then((module) => ({ default: module.MessagingPage })),
);
const NotificationsPage = lazy(() =>
  import("./NotificationsPage").then((module) => ({
    default: module.NotificationsPage,
  })),
);
const CommunityFeaturesPage = lazy(() =>
  import("./CommunityFeaturesPage").then((module) => ({
    default: module.CommunityFeaturesPage,
  })),
);

const countries = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "NG", name: "Nigeria" },
] as const;

type CountryCode = (typeof countries)[number]["code"];
type ThemeMode = "dark" | "light";
type SelectedPostMedia = {
  file: File;
  url: string;
  type: string;
  name: string;
};

function CountryFlag({ code }: { code: CountryCode }) {
  return (
    <svg className="pawly-flag-art" viewBox="0 0 60 40" aria-hidden="true">
      {code === "US" && (
        <>
          <rect width="60" height="40" fill="#fff" />
          {Array.from({ length: 13 }, (_, index) => (
            <rect key={index} y={index * 40 / 13} width="60" height={40 / 13} fill="#b22234" />
          )).filter((_, index) => index % 2 === 0)}
          <rect width="25" height="21" fill="#3c3b6e" />
          {Array.from({ length: 20 }, (_, index) => (
            <circle key={index} cx={3 + (index % 5) * 4.5} cy={3 + Math.floor(index / 5) * 4.5} r="0.8" fill="#fff" />
          ))}
        </>
      )}
      {code === "GB" && (
        <>
          <rect width="60" height="40" fill="#012169" />
          <path d="M0 0 7 0 60 33 60 40 53 40 0 7ZM60 0 53 0 0 33 0 40 7 40 60 7Z" fill="#fff" />
          <path d="M0 0 3 0 60 36 60 40 57 40 0 4ZM60 0 57 0 0 36 0 40 3 40 60 4Z" fill="#c8102e" />
          <path d="M24 0h12v40H24zM0 14h60v12H0z" fill="#fff" />
          <path d="M27 0h6v40h-6zM0 17h60v6H0z" fill="#c8102e" />
        </>
      )}
      {code === "AU" && (
        <>
          <rect width="60" height="40" fill="#012169" />
          <path d="M0 0h26v18H0z" fill="#00247d" />
          <path d="M0 0 3 0 26 14 26 18 23 18 0 4ZM26 0 23 0 0 14 0 18 3 18 26 4Z" fill="#fff" />
          <path d="M10 0h6v18h-6zM0 6h26v6H0z" fill="#fff" />
          <path d="M11.5 0h3v18h-3zM0 7.5h26v3H0z" fill="#c8102e" />
          <path d="m42 6 1.2 3.2 3.4.1-2.7 2.1 1 3.3-2.9-1.9-2.8 1.9 1-3.3-2.7-2.1 3.4-.1ZM32 25l1 2.6 2.8.1-2.2 1.7.8 2.7-2.4-1.5-2.3 1.5.8-2.7-2.2-1.7 2.8-.1ZM48 23l.9 2.4 2.6.1-2 1.6.7 2.4-2.2-1.4-2.1 1.4.8-2.4-2-1.6 2.6-.1ZM43 32l.8 2.1 2.3.1-1.8 1.4.7 2.1-2-1.2-1.8 1.2.7-2.1-1.8-1.4 2.3-.1Z" fill="#fff" />
        </>
      )}
      {code === "CA" && (
        <>
          <rect width="60" height="40" fill="#fff" />
          <path d="M0 0h15v40H0zM45 0h15v40H45z" fill="#d80621" />
          <path d="m30 8 3 6 4-2-2 5 4 2-6 2 1 4-3-2-3 2 1-4-6-2 4-2-2-5 4 2zM28 26h4l1 8h-6z" fill="#d80621" />
        </>
      )}
      {code === "DE" && (
        <>
          <rect width="60" height="13.34" fill="#000" />
          <rect y="13.33" width="60" height="13.34" fill="#d00" />
          <rect y="26.66" width="60" height="13.34" fill="#ffce00" />
        </>
      )}
      {code === "NG" && (
        <>
          <rect width="20" height="40" fill="#008751" />
          <rect x="20" width="20" height="40" fill="#fff" />
          <rect x="40" width="20" height="40" fill="#008751" />
        </>
      )}
    </svg>
  );
}

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  role: "owner" | "provider" | "admin";
  careType?: string;
};

type FollowerAccount = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: string;
  following: boolean;
};

function isFollowerAccount(value: unknown): value is FollowerAccount {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value && typeof value.id === "string" &&
    "name" in value && typeof value.name === "string" &&
    "handle" in value && typeof value.handle === "string" &&
    "avatar" in value && typeof value.avatar === "string" &&
    "role" in value && typeof value.role === "string" &&
    "following" in value && typeof value.following === "boolean"
  );
}

type AccountData = {
  appointments: Appointment[];
  favoriteProviderIds: string[];
  followingHandles: string[];
  notifications: PawlyNotification[];
  conversations: ChatConversation[];
  providerServices?: ProviderService[];
};

function isAppointment(value: unknown): value is Appointment {
  return (
    typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" &&
    "petId" in value && typeof value.petId === "string" &&
    "petName" in value && typeof value.petName === "string" &&
    "petBreed" in value && typeof value.petBreed === "string" &&
    "ownerName" in value && typeof value.ownerName === "string" &&
    "ownerAvatar" in value && typeof value.ownerAvatar === "string" &&
    "providerId" in value && typeof value.providerId === "string" &&
    "providerName" in value && typeof value.providerName === "string" &&
    "service" in value && typeof value.service === "string" &&
    "professional" in value && typeof value.professional === "string" &&
    "date" in value && typeof value.date === "string" &&
    "time" in value && typeof value.time === "string" &&
    "duration" in value && typeof value.duration === "string" &&
    "price" in value && typeof value.price === "number" &&
    "status" in value &&
    ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"].includes(String(value.status)) &&
    (!("ownerId" in value) || typeof value.ownerId === "string") &&
    (!("scheduledAt" in value) || typeof value.scheduledAt === "string")
  );
}

function isAccountData(value: unknown): value is AccountData {
  const isString = (item: unknown) => typeof item === "string";
  const appointmentStatuses: AppointmentStatus[] = [
    "PENDING",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
    "NO_SHOW",
  ];

  return (
    typeof value === "object" &&
    value !== null &&
    "appointments" in value &&
    Array.isArray(value.appointments) &&
    value.appointments.every((item) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      isString(item.id) &&
      "petId" in item &&
      isString(item.petId) &&
      "petName" in item &&
      isString(item.petName) &&
      "petBreed" in item &&
      isString(item.petBreed) &&
      "ownerName" in item &&
      isString(item.ownerName) &&
      (!("ownerId" in item) || isString(item.ownerId)) &&
      "ownerAvatar" in item &&
      isString(item.ownerAvatar) &&
      "providerId" in item &&
      isString(item.providerId) &&
      "providerName" in item &&
      isString(item.providerName) &&
      "service" in item &&
      isString(item.service) &&
      "professional" in item &&
      isString(item.professional) &&
      "date" in item &&
      isString(item.date) &&
      "time" in item &&
      isString(item.time) &&
      (!("scheduledAt" in item) || isString(item.scheduledAt)) &&
      "duration" in item &&
      isString(item.duration) &&
      "price" in item &&
      typeof item.price === "number" &&
      "status" in item &&
      appointmentStatuses.some((status) => status === item.status),
    ) &&
    "favoriteProviderIds" in value &&
    Array.isArray(value.favoriteProviderIds) &&
    value.favoriteProviderIds.every(isString) &&
    "followingHandles" in value &&
    Array.isArray(value.followingHandles) &&
    value.followingHandles.every(isString) &&
    "notifications" in value &&
    Array.isArray(value.notifications) &&
    value.notifications.every((item) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      isString(item.id) &&
      "name" in item &&
      isString(item.name) &&
      "action" in item &&
      isString(item.action) &&
      "detail" in item &&
      isString(item.detail) &&
      "time" in item &&
      isString(item.time) &&
      "kind" in item &&
      ["care", "community", "provider"].includes(String(item.kind)) &&
      "target" in item &&
      ["appointments", "followers", "home", "messages", "pets", "provider-profile"].includes(String(item.target)) &&
      (!("petId" in item) || isString(item.petId)) &&
      "unread" in item &&
      typeof item.unread === "boolean",
    ) &&
    "conversations" in value &&
    Array.isArray(value.conversations) &&
    value.conversations.every((item) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      isString(item.id) &&
      "name" in item &&
      isString(item.name) &&
      "detail" in item &&
      isString(item.detail) &&
      "avatar" in item &&
      isString(item.avatar) &&
      "time" in item &&
      isString(item.time) &&
      "messages" in item &&
      Array.isArray(item.messages) &&
      item.messages.every((message: unknown) =>
        typeof message === "object" &&
        message !== null &&
        "id" in message &&
        isString(message.id) &&
        "text" in message &&
        isString(message.text) &&
        "time" in message &&
        isString(message.time) &&
        (!("own" in message) || typeof message.own === "boolean"),
      ),
    ) &&
    (!("providerServices" in value) ||
      (Array.isArray(value.providerServices) &&
        value.providerServices.every((service) =>
          typeof service === "object" &&
          service !== null &&
          "id" in service &&
          isString(service.id) &&
          "name" in service &&
          isString(service.name) &&
          "category" in service &&
          isString(service.category) &&
          "price" in service &&
          typeof service.price === "number" &&
          "duration" in service &&
          typeof service.duration === "number" &&
          "description" in service &&
          isString(service.description) &&
          "active" in service &&
          typeof service.active === "boolean",
        )))
  );
}

async function saveAccountData(data: AccountData, signal?: AbortSignal): Promise<void> {
  const response = await fetch(getApiUrl("account-data"), {
    method: "PUT",
    credentials: "include",
    signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : `Unable to save your account data (${response.status}).`;
    throw new Error(message);
  }
  if (!isAccountData(result)) {
    throw new Error("The server returned invalid account data.");
  }
}

function isPet(value: unknown): value is Pet {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "breed" in value &&
    typeof value.breed === "string" &&
    "age" in value &&
    typeof value.age === "string" &&
    "image" in value &&
    typeof value.image === "string"
  );
}

function isFeedPost(value: unknown): value is FeedPost {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "handle" in value &&
    typeof value.handle === "string" &&
    "time" in value &&
    typeof value.time === "string" &&
    "text" in value &&
    typeof value.text === "string" &&
    "likes" in value &&
    typeof value.likes === "number" &&
    "comments" in value &&
    typeof value.comments === "number" &&
    "avatar" in value &&
    typeof value.avatar === "string" &&
    (!("commentItems" in value) ||
      (Array.isArray(value.commentItems) && value.commentItems.every(isFeedComment)))
  );
}

function isFeedComment(value: unknown): value is FeedComment {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value && typeof value.id === "string" &&
    "userId" in value && typeof value.userId === "string" &&
    "name" in value && typeof value.name === "string" &&
    "handle" in value && typeof value.handle === "string" &&
    "avatar" in value && typeof value.avatar === "string" &&
    "text" in value && typeof value.text === "string" &&
    "createdAt" in value && typeof value.createdAt === "string"
  );
}

function readCachedCollection<T>(
  key: string,
  isItem: (value: unknown) => value is T,
): T[] {
  try {
    const stored = window.sessionStorage.getItem(key);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every(isItem)) return parsed;
    console.warn(`Ignoring invalid cached data for ${key}.`);
  } catch (error) {
    console.warn(`Unable to read cached data for ${key}.`, error);
  }
  return [];
}

function cacheCollection<T>(key: string, items: T[]): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.warn(`Unable to cache data for ${key}.`, error);
  }
}

function isSavedPostList(value: unknown, userId: string): value is FeedPost[] {
  return (
    Array.isArray(value) &&
    value.every(
      (post) =>
        isFeedPost(post) &&
        post.userId === userId &&
        (post.mediaItems === undefined ||
          (Array.isArray(post.mediaItems) &&
            post.mediaItems.every(
              (item) =>
                typeof item === "object" &&
                item !== null &&
                "url" in item &&
                typeof item.url === "string" &&
                "type" in item &&
                typeof item.type === "string" &&
                "name" in item &&
                typeof item.name === "string",
            ))),
    )
  );
}

function openFeedDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("pawly-feed", 1);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains("posts")) {
        request.result.createObjectStore("posts", { keyPath: "userId" });
      }
    });
    request.addEventListener("success", () => {
      request.result.addEventListener("versionchange", () => request.result.close());
      resolve(request.result);
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("Unable to open device storage."));
    });
    request.addEventListener("blocked", () => {
      reject(new Error("Device storage is busy. Close other Pawly tabs and try again."));
    });
  });
}

function readPostsFromDatabase(
  database: IDBDatabase,
  userId: string,
): Promise<FeedPost[] | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("posts", "readonly");
    const request = transaction.objectStore("posts").get(userId);
    request.addEventListener("success", () => {
      const record: unknown = request.result;
      if (
        typeof record === "object" &&
        record !== null &&
        "posts" in record &&
        isSavedPostList(record.posts, userId)
      ) {
        resolve(record.posts);
      } else if (record === undefined) {
        resolve(undefined);
      } else {
        reject(new Error("Saved feed data is invalid."));
      }
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("Unable to read saved posts."));
    });
  });
}

function writePostsToDatabase(
  database: IDBDatabase,
  userId: string,
  posts: FeedPost[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("posts", "readwrite");
    transaction.objectStore("posts").put({ userId, posts });
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => {
      reject(transaction.error ?? new Error("Unable to save your post on this device."));
    });
    transaction.addEventListener("abort", () => {
      reject(transaction.error ?? new Error("Unable to save your post on this device."));
    });
  });
}

function removeLegacyFeedPosts(storageKey: string): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn("Unable to remove migrated feed data from local storage.", error);
  }
}

async function readSavedFeedPosts(
  userId: string,
): Promise<{ posts: FeedPost[]; error: string }> {
  const storageKey = `pawly-posts-${userId}`;
  try {
    const database = await openFeedDatabase();
    const storedPosts = await readPostsFromDatabase(database, userId);
    if (storedPosts) {
      removeLegacyFeedPosts(storageKey);
      return { posts: storedPosts, error: "" };
    }

    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return { posts: [], error: "" };
    const parsed: unknown = JSON.parse(stored);
    if (!isSavedPostList(parsed, userId)) {
      throw new Error("Saved feed data is invalid.");
    }

    await writePostsToDatabase(database, userId, parsed);
    removeLegacyFeedPosts(storageKey);
    return { posts: parsed, error: "" };
  } catch (error) {
    return {
      posts: [],
      error: error instanceof Error
        ? `Unable to load saved posts: ${error.message}`
        : "Unable to load saved posts.",
    };
  }
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "picture" in value &&
    (typeof value.picture === "string" || value.picture === null) &&
    "role" in value &&
    (value.role === "owner" || value.role === "provider" || value.role === "admin")
  );
}

function PawlyLogo({ className = "" }: { className?: string }) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <svg
      aria-label="X"
      role="img"
      className={className}
      fill="none"
      viewBox="0 0 480 490"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient
          cx="228.33932730349682"
          cy="393.85871434170434"
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          r="200"
        >
          <stop stopColor="var(--pawly-logo-gradient-start)" />
          <stop offset="1" stopColor="var(--pawly-logo-gradient-end)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M285.38 207.711L462.954 1.5H420.874L266.687 180.55L143.538 1.5H1.50003L187.726 272.256L1.50003 488.5H43.5818L206.408 299.417L336.462 488.5H478.5L285.37 207.711H285.38ZM227.743 274.641L208.875 247.68L58.7444 33.147H123.379L244.536 206.282L263.405 233.243L420.894 458.292H356.259L227.743 274.652V274.641Z"
        fill="var(--pawly-logo-fill)"
      />
      <path
        d="M285.38 207.711L462.954 1.5H420.874L266.687 180.55L143.538 1.5H1.50003L187.726 272.256L1.50003 488.5H43.5818L206.408 299.417L336.462 488.5H478.5L285.37 207.711H285.38ZM227.743 274.641L208.875 247.68L58.7444 33.147H123.379L244.536 206.282L263.405 233.243L420.894 458.292H356.259L227.743 274.652V274.641Z"
        stroke="var(--pawly-logo-stroke)"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M285.38 207.711L462.954 1.5H420.874L266.687 180.55L143.538 1.5H1.50003L187.726 272.256L1.50003 488.5H43.5818L206.408 299.417L336.462 488.5H478.5L285.37 207.711H285.38ZM227.743 274.641L208.875 247.68L58.7444 33.147H123.379L244.536 206.282L263.405 233.243L420.894 458.292H356.259L227.743 274.652V274.641Z"
        className="pawly-logo-glow"
        stroke={`url(#${gradientId})`}
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function detectCountryCode(): CountryCode {
  const localeRegions = [...navigator.languages, navigator.language]
    .map((locale) => locale.split("-").pop()?.toUpperCase())
    .filter(Boolean);
  const localeCountry = countries.find((country) => localeRegions.includes(country.code));
  if (localeCountry) return localeCountry.code;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timeZone.startsWith("Australia/")) return "AU";
  if (timeZone === "Europe/London") return "GB";
  if (timeZone === "Europe/Berlin") return "DE";
  if (["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax"].includes(timeZone)) return "CA";
  if (timeZone.startsWith("America/")) return "US";
  return "NG";
}

function getInitialCountryCode(): CountryCode {
  try {
    const savedCountry = window.localStorage.getItem("pawly-country");
    if (countries.some((country) => country.code === savedCountry)) {
      return savedCountry as CountryCode;
    }
  } catch (error) {
    console.warn("Unable to read saved country preference.", error);
  }
  return detectCountryCode();
}

function getInitialTheme(): ThemeMode {
  try {
    return window.localStorage.getItem("pawly-theme") === "light" ? "light" : "dark";
  } catch (error) {
    console.warn("Unable to read saved theme preference.", error);
    return "dark";
  }
}

function CountryThemeControls({
  countryCode,
  theme,
  onCountryChange,
  onThemeChange,
  mobile = false,
}: {
  countryCode: CountryCode;
  theme: ThemeMode;
  onCountryChange: (code: CountryCode) => void;
  onThemeChange: () => void;
  mobile?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const selected = countries.find((country) => country.code === countryCode) ?? countries[0];

  return (
    <div className={`pawly-global-controls ${mobile ? "is-mobile" : ""}`}>
      <div className="pawly-country-picker">
        <button
          className="pawly-country-trigger"
          aria-label={`Select country. Current country: ${selected.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <CountryFlag code={selected.code} />
        </button>
        {menuOpen && (
          <div className="pawly-country-menu" role="menu" aria-label="Choose your country">
            {countries.map((country) => (
              <button
                key={country.code}
                role="menuitemradio"
                aria-checked={country.code === selected.code}
                onClick={() => {
                  onCountryChange(country.code);
                  setMenuOpen(false);
                }}
              >
                <span className="pawly-country-option-flag"><CountryFlag code={country.code} /></span>
                <span>{country.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        className="pawly-theme-toggle"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        onClick={onThemeChange}
      >
        <img
          className="pawly-theme-toggle-icon"
          src={theme === "light" ? "/toggle/toggleon.png" : "/toggle/toggleoff.png"}
          alt=""
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

const navigation = [
  {
    id: "home",
    label: "Home",
    icon: IconHome,
    iconSrc: "/menuicons/home.png",
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: IconCalendar,
    iconSrc: "/menuicons/appointment.png",
  },
  {
    id: "discover",
    label: "Discover",
    icon: IconSearch,
    iconSrc: "/menuicons/discover.png",
  },
  {
    id: "community",
    label: "Community",
    icon: IconPaw,
    iconSrc: "/menuicons/community.png",
  },
  {
    id: "pets",
    label: "My pets",
    icon: IconPaw,
    iconSrc: "/menuicons/pet.png",
  },
  {
    id: "business",
    label: "Business",
    icon: IconBuildingStore,
    providerOnly: true,
  },
  {
    id: "messages",
    label: "Messages",
    icon: IconMessages,
    iconSrc: "/menuicons/message.png",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: IconBell,
    iconSrc: "/menuicons/notification.png",
    unread: true,
  },
  {
    id: "followers",
    label: "Followers",
    icon: IconUsers,
    iconSrc: "/icons/follow.png",
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: IconHeart,
    iconSrc: "/menuicons/favorite.png",
  },
  { id: "admin", label: "Admin", icon: IconShieldCheck, adminOnly: true },
  {
    id: "settings",
    label: "Settings",
    icon: IconSettings,
    iconSrc: "/menuicons/setting.png",
  },
];

function Avatar({
  src,
  name,
  className = "",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  return src ? (
    <img
      className={`pawly-avatar ${className}`}
      src={src}
      alt={`${name} avatar`}
    />
  ) : (
    <span
      className={`pawly-avatar pawly-avatar-fallback ${className}`}
      aria-label={name}
    >
      {name.slice(0, 1)}
    </span>
  );
}

function VerificationBadge({ size = 15 }: { size?: number }) {
  return (
    <img
      src="/icons/verify.png"
      alt="Verified"
      title="Verified"
      className="pawly-verified-badge"
      style={{ width: size, height: size }}
    />
  );
}

function readProviderVerificationMap(): Record<string, boolean> {
  try {
    const stored = window.localStorage.getItem("pawly-provider-verifications");
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === "boolean",
      ),
    ) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function postDate(post: FeedPost): Date | null {
  const value = post.createdAt ?? post.time;
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date : null;
}

function formatAbsolutePostTime(post: FeedPost): string | null {
  const date = postDate(post);
  if (!date) return null;

  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  const day = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  return `${time} · ${day}`;
}

export default function PawlyApp() {
  const initialFeedPosts = readCachedCollection("pawly-feed-cache", isFeedPost);
  const [loggedIn, setLoggedIn] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot">(
    "signin",
  );
  const [role, setRole] = useState<"owner" | "provider" | "admin">("owner");
  const [countryCode, setCountryCode] = useState<CountryCode>(getInitialCountryCode);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [activePage, setActivePage] = useState("home");
  const [postCommentsReturnPage, setPostCommentsReturnPage] = useState("home");
  const [selectedCommentPostId, setSelectedCommentPostId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [petList, setPetList] = useState<Pet[]>([]);
  const [postList, setPostList] = useState<FeedPost[]>(initialFeedPosts);
  const [postsLoading, setPostsLoading] = useState(initialFeedPosts.length === 0);
  const [followingHandles, setFollowingHandles] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [accountDataUserId, setAccountDataUserId] = useState<string | null>(null);
  const [accountDataErrorFor, setAccountDataErrorFor] = useState<string | null>(null);
  const [accountDataRetry, setAccountDataRetry] = useState(0);
  const [providerList, setProviderList] = useState<Provider[]>(() =>
    readCachedCollection(
      `pawly-providers-cache-${countryCode}`,
      (value): value is Provider =>
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        typeof value.id === "string" &&
        "countryCode" in value &&
        value.countryCode === countryCode &&
        "name" in value &&
        typeof value.name === "string" &&
        "image" in value &&
        typeof value.image === "string",
    ),
  );
  const [favoriteProviderIds, setFavoriteProviderIds] = useState<string[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
  const [providerVerificationMap, setProviderVerificationMap] = useState<Record<string, boolean>>(
    readProviderVerificationMap,
  );
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingService, setBookingService] = useState<string | undefined>();
  const [petFormOpen, setPetFormOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [selectedConversation, setSelectedConversation] =
    useState("");
  const googleAuthPopupRef = useRef<Window | null>(null);
  const [notifications, setNotifications] = useState<PawlyNotification[]>([]);
  const unreadNotificationCount = notifications.filter(
    (notification) => notification.unread,
  ).length;
  const accountDataReady = Boolean(
    currentUser && accountDataUserId === currentUser.id,
  );
  const selectedCountry = countries.find((country) => country.code === countryCode) ?? countries[0];
  const countryProviders = useMemo(
    () =>
      providerList
        .filter((provider) => provider.countryCode === countryCode)
        .map((provider) => ({
          ...provider,
          verified:
            provider.verified || providerVerificationMap[provider.name] || providerVerificationMap[provider.id],
        })),
    [countryCode, providerList, providerVerificationMap],
  );
  const activeProviderWithVerification = activeProvider
    ? {
        ...activeProvider,
        verified:
          activeProvider.verified || providerVerificationMap[activeProvider.name] || providerVerificationMap[activeProvider.id],
      }
    : null;

  useEffect(() => {
    const syncProviderVerificationMap = () => {
      setProviderVerificationMap(readProviderVerificationMap());
    };

    window.addEventListener("pawly-provider-verification-changed", syncProviderVerificationMap);
    return () => {
      window.removeEventListener("pawly-provider-verification-changed", syncProviderVerificationMap);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getApiCollection<FeedPost>("posts", {}, controller.signal)
      .then((posts) => {
        cacheCollection("pawly-feed-cache", posts);
        setPostList((current) => [
          ...current.filter((post) => post.id.startsWith("local-")),
          ...posts,
        ]);
      })
      .catch(() => {
        if (!controller.signal.aborted) setToast("Unable to load the live feed.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPostsLoading(false);
      });

    return () => controller.abort();
  }, [loggedIn]);

  useEffect(() => {
    const controller = new AbortController();

    void getApiCollection<Provider>("providers", { countryCode }, controller.signal)
      .then((providers) => {
        cacheCollection(`pawly-providers-cache-${countryCode}`, providers);
        setProviderList(providers);
      })
      .catch(() => {
        if (!controller.signal.aborted) setToast("Unable to load nearby providers.");
      });

    return () => controller.abort();
  }, [countryCode]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(getApiUrl("auth/me"), {
      credentials: "include",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (response.status === 401) return;
        if (response.status === 404) {
          throw new Error("Sign-in service is not updated. Restart or redeploy the PHP API, then try again.");
        }
        if (!response.ok) throw new Error(`Unable to restore sign-in session (${response.status}).`);
        const result: unknown = await response.json();
        if (
          typeof result !== "object" ||
          result === null ||
          !("user" in result)
        ) {
          throw new Error("Invalid sign-in session response.");
        }
        if (result.user === null) return;
        if (!isAuthenticatedUser(result.user)) {
          throw new Error("Invalid sign-in session response.");
        }
        const savedPosts = await readSavedFeedPosts(result.user.id);
        setPostList((current) => [
          ...savedPosts.posts,
          ...current.filter((post) => !post.id.startsWith("local-")),
        ]);
        if (savedPosts.error) setToast(savedPosts.error);
        setCurrentUser(result.user);
        setLoggedIn(true);
        setRole(result.user.role);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setToast(error instanceof Error ? error.message : "Unable to restore sign-in session.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSessionRestored(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleGoogleAuthMessage = async (event: MessageEvent<unknown>) => {
      if (
        event.origin !== getApiUrl("auth/google").origin ||
        event.source !== googleAuthPopupRef.current ||
        typeof event.data !== "object" ||
        event.data === null ||
        !("type" in event.data) ||
        event.data.type !== "pawly-google-auth"
      ) {
        return;
      }

      if ("success" in event.data && event.data.success === true && "user" in event.data) {
        if (!isAuthenticatedUser(event.data.user)) {
          setToast("Google sign-in returned an invalid account.");
          return;
        }
        const savedPosts = await readSavedFeedPosts(event.data.user.id);
        setPostList((current) => [
          ...savedPosts.posts,
          ...current.filter((post) => !post.id.startsWith("local-")),
        ]);
        if (savedPosts.error) setToast(savedPosts.error);
        setCurrentUser(event.data.user);
        setLoggedIn(true);
        setRole(event.data.user.role);
        setMobileContextOpen(false);
        googleAuthPopupRef.current = null;
      } else if ("error" in event.data && typeof event.data.error === "string") {
        setToast(event.data.error);
        googleAuthPopupRef.current = null;
      }
    };

    window.addEventListener("message", handleGoogleAuthMessage);
    return () => window.removeEventListener("message", handleGoogleAuthMessage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("pawly-country", countryCode);
  }, [countryCode]);

  useEffect(() => {
    window.localStorage.setItem("pawly-theme", theme);
  }, [theme]);

  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) {
      return;
    }

    const controller = new AbortController();
    void fetch(getApiUrl("pets"), {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load your pets (${response.status}).`);
        }
        const result: unknown = await response.json();
        if (!Array.isArray(result) || !result.every(isPet)) {
          throw new Error("Invalid pet list response.");
        }
        if (controller.signal.aborted) return;
        setPetList(result);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setToast(error instanceof Error ? error.message : "Unable to load your pets.");
        }
      });

    return () => controller.abort();
  }, [currentUser?.id]);

  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) return;

    const controller = new AbortController();
    void fetch(getApiUrl("account-data"), {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load your account data (${response.status}).`);
        }
        const result: unknown = await response.json();
        if (!isAccountData(result)) {
          throw new Error("Invalid account data response.");
        }
        if (controller.signal.aborted) return;
        setAppointments(result.appointments);
        setFavoriteProviderIds(result.favoriteProviderIds);
        setFollowingHandles(result.followingHandles);
        setNotifications(result.notifications);
        setConversations(result.conversations);
        setProviderServices(result.providerServices ?? []);
        setAccountDataUserId(userId);
        setAccountDataErrorFor(null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setAccountDataErrorFor(userId);
          setToast(error instanceof Error ? error.message : "Unable to load your account data.");
        }
      });

    return () => controller.abort();
  }, [accountDataRetry, currentUser?.id]);

  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId || accountDataUserId !== userId) return;
    const controller = new AbortController();
    void fetch(getApiUrl("appointments"), {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : `Unable to load appointments (${response.status}).`;
        throw new Error(message);
      }
      if (
        typeof result !== "object" || result === null || !("appointments" in result) ||
        !Array.isArray(result.appointments) || !result.appointments.every(isAppointment)
      ) {
        throw new Error("The server returned invalid appointments.");
      }
      if (!controller.signal.aborted) setAppointments(result.appointments);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setToast(error instanceof Error ? error.message : "Unable to load appointments.");
      }
    });
    return () => controller.abort();
  }, [accountDataUserId, currentUser?.id]);

  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId || accountDataUserId !== userId) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void saveAccountData({
        appointments,
        favoriteProviderIds,
        followingHandles,
        notifications,
        conversations,
        providerServices,
      }, controller.signal)
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setToast(error instanceof Error ? error.message : "Unable to save your account data.");
          }
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    accountDataUserId,
    appointments,
    conversations,
    currentUser?.id,
    favoriteProviderIds,
    followingHandles,
    notifications,
    providerServices,
  ]);

  const selectedPetRecord = petList.find((pet) => pet.id === selectedPet);
  const selectedCommentPost = postList.find((post) => post.id === selectedCommentPostId);
  const userPosts = currentUser
    ? postList.filter((post) => post.userId === currentUser.id)
    : [];
  const notify = useCallback((message: string) => {
    if (/\b(?:smaller|larger|lower|exceeds)\b.*\b\d+\s*MB\b|\b\d+\s*MB\b.*\b(?:smaller|larger|lower|exceeds)\b/i.test(message)) {
      return;
    }
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const updateProfilePicture = (file: File) => {
    const userId = currentUser?.id;
    if (!userId) {
      notify("Sign in to update your profile picture.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      notify("Choose an image file for your profile picture.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    const formData = new FormData();
    formData.append("picture", file);
    void fetch(getApiUrl("auth/profile-picture"), {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
      body: formData,
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
              : `Unable to update profile picture (${response.status}).`;
          throw new Error(message);
        }
        if (typeof result !== "object" || result === null || !("user" in result)) {
          throw new Error("Invalid profile picture response.");
        }
        const updatedUser = result.user;
        if (!isAuthenticatedUser(updatedUser) || updatedUser.id !== userId) {
          throw new Error("Invalid profile picture response.");
        }
        setCurrentUser(updatedUser);
        const updatedHandle = updatedUser.email.split("@")[0].toLowerCase();
        setPostList((posts) =>
          posts.map((post) =>
            post.userId === updatedUser.id ||
            (!post.userId && post.handle.toLowerCase() === updatedHandle)
              ? { ...post, avatar: updatedUser.picture ?? "" }
              : post,
          ),
        );
      })
      .catch((error: unknown) => {
        notify(error instanceof Error ? error.message : "Unable to update profile picture.");
      });
  };

  const startGoogleSignIn = () => {
    const popup = window.open(
      getApiUrl("auth/google").toString(),
      "pawly-google-sign-in",
      "width=500,height=650",
    );
    if (!popup) {
      notify("Allow pop-ups to continue with Google.");
      return;
    }
    googleAuthPopupRef.current = popup;
  };

  const signOut = async () => {
    try {
      if (currentUser && accountDataUserId === currentUser.id) {
        await saveAccountData({
          appointments,
          favoriteProviderIds,
          followingHandles,
          notifications,
          conversations,
          providerServices,
        });
      }
      const response = await fetch(getApiUrl("auth/logout"), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Unable to sign out (${response.status}).`);
      setCurrentUser(null);
      setLoggedIn(false);
      setPetList([]);
      setSelectedPet(null);
      setAppointments([]);
      setFavoriteProviderIds([]);
      setFollowingHandles([]);
      setNotifications([]);
      setConversations([]);
      setProviderServices([]);
      setAccountDataUserId(null);
      setAccountDataErrorFor(null);
      setSelectedConversation("");
      setRole("owner");
      setActivePage("home");
      googleAuthPopupRef.current = null;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to sign out.");
    }
  };

  const openProvider = (provider: Provider) => {
    if (!loggedIn) {
      notify("Sign in to view provider profiles.");
      return;
    }
    setActiveProvider({
      ...provider,
      verified:
        provider.verified || providerVerificationMap[provider.name] || providerVerificationMap[provider.id],
    });
    setActivePage("provider-profile");
  };

  const navigateToPage = (page: string) => {
    if (!loggedIn && page !== "home" && page !== "settings") {
      notify("Sign in to access this page.");
      return;
    }
    setActivePage(page);
    setActiveProvider(null);
    setMobileContextOpen(false);
  };

  const openPostComments = (postId: string) => {
    setPostCommentsReturnPage(activePage);
    setSelectedCommentPostId(postId);
    setActivePage("post-comments");
    document.getElementById("main-content")?.scrollTo({ top: 0 });
  };

  const changeCountry = (code: CountryCode) => {
    setCountryCode(code);
    setActiveProvider(null);
    setActivePage((current) => current === "provider-profile" ? "discover" : current);
  };

  const toggleTheme = () =>
    setTheme((current) => current === "dark" ? "light" : "dark");

  const updateAppointment = (id: string, values: Partial<Appointment>) => {
    void fetch(getApiUrl(`appointments/${encodeURIComponent(id)}`), {
      method: "PATCH",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).then(async (response) => {
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : `Unable to update appointment (${response.status}).`;
        throw new Error(message);
      }
      if (typeof result !== "object" || result === null || !("appointment" in result) || !isAppointment(result.appointment)) {
        throw new Error("The server returned an invalid appointment.");
      }
      const updatedAppointment = result.appointment;
      setAppointments((current) => current.map((appointment) =>
        appointment.id === id ? updatedAppointment : appointment,
      ));
    }).catch((error: unknown) => {
      notify(error instanceof Error ? error.message : "Unable to update appointment.");
    });
  };

  const openBooking = (service?: string) => {
    setBookingService(service);
    setBookingOpen(true);
  };

  const toggleFavorite = (provider: Provider) => {
    if (!currentUser || !accountDataReady) {
      notify("Sign in and wait for your account data to load before saving providers.");
      return;
    }
    setFavoriteProviderIds((current) =>
      current.includes(provider.id)
        ? current.filter((id) => id !== provider.id)
        : [...current, provider.id],
    );
  };

  const updateFollow = async (
    targetUserId: string,
    handle: string,
    following: boolean,
  ) => {
    if (!currentUser || !accountDataReady) {
        notify("Sign in and wait for your account data to load before following members.");
        return;
    }
    const response = await fetch(getApiUrl("follows"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUserId, following }),
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : `Unable to update follow (${response.status}).`;
        throw new Error(message);
    }
    if (
        typeof result !== "object" ||
        result === null ||
        !("following" in result) ||
        result.following !== following
    ) {
        throw new Error("The server returned an invalid follow response.");
    }
    setFollowingHandles((current) =>
        following
          ? current.includes(handle) ? current : [...current, handle]
          : current.filter((item) => item !== handle),
    );
  };

  const startConversation = async (targetUserId: string) => {
    if (!accountDataReady) {
      throw new Error("Wait for your account data to finish loading before messaging.");
    }
    const response = await fetch(getApiUrl("conversations"), {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetUserId }),
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : `Unable to start conversation (${response.status}).`;
      throw new Error(message);
    }
    if (
      typeof result !== "object" ||
      result === null ||
      !("conversation" in result) ||
      typeof result.conversation !== "object" ||
      result.conversation === null ||
      !isChatConversation(result.conversation)
    ) {
      throw new Error("The server returned an invalid conversation.");
    }
    const conversation = result.conversation;
    setConversations((current) => [
      conversation,
      ...current.filter((item) => item.id !== conversation.id),
    ]);
    setSelectedConversation(conversation.id);
    setMobileContextOpen(false);
    setActivePage("messages");
  };

  const openConversation = (targetUserId: string) => {
    void startConversation(targetUserId).catch((error: unknown) => {
      notify(error instanceof Error ? error.message : "Unable to start conversation.");
    });
  };

  const visibleNavigation = !loggedIn
    ? navigation.filter((item) => ["home", "settings"].includes(item.id))
    : role === "admin"
      ? navigation.filter((item) => ["home", "messages", "notifications", "admin", "settings"].includes(item.id))
      : navigation.filter(
          (item) =>
            !item.adminOnly && (!item.providerOnly || role === "provider"),
        );
  const mobileNavigation = !loggedIn
    ? navigation.filter((item) =>
        ["home", "pets", "messages", "settings"].includes(item.id),
      )
    : role === "admin"
      ? navigation.filter((item) => ["home", "messages", "notifications", "admin"].includes(item.id))
      : navigation.filter((item) =>
          ["home", "pets", "messages", "followers"].includes(item.id),
        );

  return (
    <div className={`pawly-app ${theme === "light" ? "is-light" : ""}`}>
      <a className="pawly-skip-link" href="#main-content">Skip to content</a>
      <aside className="pawly-rail" aria-label="Main navigation">
        <button
          className="pawly-brand-mark"
          aria-label="Pawly home"
          onClick={() => {
            setActivePage("home");
            setActiveProvider(null);
          }}
        >
          <PawlyLogo className="pawly-rail-logo" />
        </button>
        <nav className="pawly-rail-links">
          {visibleNavigation.map(({ id, label, icon: Icon, iconSrc, unread }) => (
            <button
              key={id}
              className={`pawly-rail-button ${activePage === id ? "is-active" : ""}`}
              aria-label={label}
              title={label}
              onClick={() => navigateToPage(id)}
            >
              {iconSrc ? (
                <img className="pawly-nav-image-icon" src={iconSrc} alt="" aria-hidden="true" />
              ) : (
                <Icon size={21} stroke={1.65} />
              )}
              {(id === "notifications"
                ? unreadNotificationCount > 0
                : unread) && <span className="pawly-unread-dot" />}
            </button>
          ))}
        </nav>
        {loggedIn && (
          <button
            className="pawly-rail-profile"
            aria-label="Open profile"
            title="Profile"
            onClick={() => {
              setActivePage("profile");
              setActiveProvider(null);
            }}
          >
            <Avatar name={currentUser?.name || "Your profile"} src={currentUser?.picture ?? undefined} />
          </button>
        )}
      </aside>

      <aside
        className={`pawly-context ${mobileContextOpen ? "mobile-open" : ""} ${
          loggedIn ? "" : "is-auth"
        }`}
        aria-label="Your profile and pets"
      >
        <div className={`pawly-context-mobile-head ${loggedIn ? "" : "is-auth"}`}>
          {loggedIn && (
            <nav className="pawly-context-quick-nav" aria-label="Quick navigation">
              <button type="button" aria-label="Appointments" onClick={() => navigateToPage("appointments")}>
                <img src="/menuicons/appointment.png" alt="" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Discover" onClick={() => navigateToPage("discover")}>
                <img src="/menuicons/discover.png" alt="" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Community" onClick={() => navigateToPage("community")}>
                <img src="/menuicons/community.png" alt="" aria-hidden="true" />
              </button>
            </nav>
          )}
          {!loggedIn && (
            <CountryThemeControls
              mobile
              countryCode={countryCode}
              theme={theme}
              onCountryChange={changeCountry}
              onThemeChange={toggleTheme}
            />
          )}
          <button
            className="pawly-icon-button"
            aria-label="Close profile panel"
            onClick={() => setMobileContextOpen(false)}
          >
            <img
              className="pawly-mobile-control-icon"
              src="/exit.png"
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
        {!sessionRestored ? (
          <div className="pawly-auth-loading" aria-busy="true" />
        ) : loggedIn ? (
          <>
            <button
              className="pawly-identity"
              onClick={() => {
                setActivePage("profile");
                setActiveProvider(null);
              }}
            >
              <Avatar
                name={currentUser?.name || "Your profile"}
                src={currentUser?.picture ?? undefined}
                className="pawly-avatar-large"
              />
              <span className="pawly-identity-copy">
                <strong>{currentUser?.name || "Account"}</strong>
                <span>
                  {currentUser?.email || (
                    role === "provider"
                      ? "Pet owner · Provider"
                      : role === "admin"
                        ? "Pawly administrator"
                        : "Pet owner"
                  )}
                </span>
              </span>
              <span className="pawly-identity-menu" aria-hidden="true">
                ···
              </span>
            </button>
            <div className="pawly-context-section">
              {petList.length ? (
                <div className="pawly-pet-list">
                  {petList.map((pet) => (
                    <button
                      key={pet.id}
                      className={`pawly-pet-row ${selectedPet === pet.id ? "is-selected" : ""}`}
                      onClick={() => {
                        setSelectedPet(pet.id);
                        setActivePage("pet-profile");
                        setActiveProvider(null);
                        setMobileContextOpen(false);
                      }}
                    >
                      <img className="pawly-pet-thumb" src={pet.image} alt="" />
                      <span className="pawly-pet-copy">
                        <strong>{pet.name}</strong>
                        <span>{pet.breed}</span>
                      </span>
                      {selectedPet === pet.id && (
                        <IconCircleCheck
                          size={17}
                          className="pawly-selected-mark"
                        />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="pawly-muted">No pets yet</p>
              )}
              <button
                className="pawly-add-pet"
                onClick={() => setPetFormOpen(true)}
              >
                <img src="/menuicons/pet.png" alt="" aria-hidden="true" />
                Add a pet
              </button>
            </div>
            {role === "provider" && (
              <div className="pawly-business-switcher">
                <span className="pawly-section-label">Your business</span>
                <button onClick={() => setActivePage("business")}>
                  <span className="pawly-business-avatar">B</span>
                  <span>
                    <strong>Business account</strong>
                    <small>Provider account</small>
                  </span>
                  <img src="/icons/business.png" alt="" aria-hidden="true" className="size-4 object-contain" />
                </button>
              </div>
            )}
          </>
        ) : (
          <AuthPanel
            mode={authMode}
            setMode={setAuthMode}
            onAuthSubmit={async (mode, values) => {
              const endpoint = mode === "signup" ? "register" : "signin";
              const response = await fetch(getApiUrl(`auth/${endpoint}`), {
                method: "POST",
                credentials: "include",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
              });
              const result: unknown = await response.json().catch(() => null);
              if (!response.ok) {
                const message =
                  typeof result === "object" &&
                  result !== null &&
                  "error" in result &&
                  typeof result.error === "string"
                    ? result.error
                    : `Unable to ${mode === "signup" ? "create account" : "sign in"} (${response.status}).`;
                throw new Error(message);
              }
              if (
                typeof result !== "object" ||
                result === null ||
                !("user" in result) ||
                !isAuthenticatedUser(result.user)
              ) {
                throw new Error("Invalid sign-in response.");
              }
              const savedPosts = await readSavedFeedPosts(result.user.id);
              setPostList((current) => [
                ...savedPosts.posts,
                ...current.filter((post) => !post.id.startsWith("local-")),
              ]);
              if (savedPosts.error) setToast(savedPosts.error);
              setCurrentUser(result.user);
              setLoggedIn(true);
              setRole(result.user.role);
              setMobileContextOpen(false);
              setActivePage("home");
            }}
            onGoogleAuth={startGoogleSignIn}
            onNotice={notify}
            countryCode={countryCode}
            theme={theme}
            onCountryChange={changeCountry}
            onThemeChange={toggleTheme}
          />
        )}
      </aside>
      {mobileContextOpen && (
        <button
          className="pawly-mobile-scrim"
          aria-label="Close profile panel"
          onClick={() => setMobileContextOpen(false)}
        />
      )}

      <main className="pawly-workspace" id="main-content">
        <header className="pawly-mobile-header">
          <button
            className="pawly-icon-button"
            aria-label="Open your pets"
            onClick={() => setMobileContextOpen(true)}
          >
            <img
              className="pawly-mobile-control-icon"
              src="/menu.png"
              alt=""
              aria-hidden="true"
            />
          </button>
          <button
            className="pawly-mobile-brand"
            onClick={() => navigateToPage("home")}
          >
            <PawlyLogo className="pawly-mobile-logo" />
          </button>
          <div className="pawly-mobile-actions">
            <button
              className="pawly-icon-button"
              aria-label="Notifications"
              onClick={() => navigateToPage("notifications")}
            >
                <img
                  className="pawly-notification-icon"
                  src="/menuicons/notification.png"
                  alt=""
                  aria-hidden="true"
                />
              </button>
          </div>
        </header>
        <Suspense fallback={<div className="pawly-page-loading" aria-busy="true" />}>
        {loggedIn && !accountDataReady ? (
          accountDataErrorFor === currentUser?.id ? (
            <div className="pawly-page-loading" role="alert">
              <span>Unable to load your account data.</span>
              <button
                className="pawly-secondary-button"
                onClick={() => setAccountDataRetry((attempt) => attempt + 1)}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="pawly-page-loading" role="status" aria-busy="true">
              Loading your account…
            </div>
          )
        ) : (
          <>
        {activePage === "admin" && role === "admin" && (
          <AdminWorkspacePage />
        )}
        {activePage === "community" && (
          <CommunityFeaturesPage role={role} notify={notify} />
        )}
        {activePage === "post-comments" && selectedCommentPost && (
          <PostCommentsPage
            post={selectedCommentPost}
            loggedIn={loggedIn}
            user={currentUser}
            onBack={() => setActivePage(postCommentsReturnPage)}
            onLike={() =>
              setPostList((current) =>
                current.map((post) =>
                  post.id === selectedCommentPost.id
                    ? {
                        ...post,
                        liked: !post.liked,
                        likes: post.likes + (post.liked ? -1 : 1),
                      }
                    : post,
                ),
              )
            }
            onCommentAdded={(comment, comments) =>
              setPostList((current) =>
                current.map((post) =>
                  post.id === selectedCommentPost.id
                    ? {
                        ...post,
                        comments,
                        commentItems: [...(post.commentItems ?? []), comment].slice(-100),
                      }
                    : post,
                ),
              )
            }
            onNotify={notify}
          />
        )}
        {activePage === "home" && (
          <HomeFeed
            posts={postList}
            postsLoading={postsLoading}
            setPosts={setPostList}
            pets={petList}
            user={currentUser}
            onProvider={openProvider}
            providers={countryProviders}
            countryName={selectedCountry.name}
            followingHandles={followingHandles}
            onToggleFollow={(post) => {
              if (!loggedIn) {
                notify("Sign in to follow pet owners and providers.");
                return;
              }
              if (!post.userId) {
                notify("This account cannot be followed yet.");
                return;
              }
              void updateFollow(
                post.userId,
                post.handle,
                !followingHandles.includes(post.handle),
              ).catch((error: unknown) => {
                notify(error instanceof Error ? error.message : "Unable to update follow.");
              });
            }}
            onSeeAllProviders={() => {
              setSearch("");
              navigateToPage("discover");
            }}
            favoriteProviderIds={favoriteProviderIds}
            onToggleFavorite={toggleFavorite}
            onComments={openPostComments}
            onNotify={notify}
            loggedIn={loggedIn}
          />
        )}
        {activePage === "provider-profile" && activeProviderWithVerification && (
          <ProviderProfile
            provider={activeProviderWithVerification}
            services={providerServices}
            appointments={appointments}
            canReview={role === "owner"}
            isFavorite={favoriteProviderIds.includes(activeProviderWithVerification.id)}
            onToggleFavorite={() => toggleFavorite(activeProviderWithVerification)}
            onBook={(service) => openBooking(service)}
            onMessage={() => {
              openConversation(activeProviderWithVerification.id);
            }}
          />
        )}
        {activePage === "appointments" && role === "provider" && (
          <ProviderAppointmentsPage
            appointments={appointments}
            onUpdate={updateAppointment}
            onMessage={(appointment) => {
              if (appointment.ownerId) openConversation(appointment.ownerId);
              else notify("This appointment is not linked to a Pawly account for messaging.");
            }}
          />
        )}
        {activePage === "appointments" && role === "owner" && (
          <OwnerAppointmentsPage
            appointments={appointments}
            pets={petList}
            onBook={() => openBooking()}
            onUpdate={updateAppointment}
            onMessage={(appointment) => {
              openConversation(appointment.providerId);
            }}
          />
        )}
        {activePage === "provider-appointments" && (
          <ProviderAppointmentsPage
            appointments={appointments}
            onUpdate={updateAppointment}
            onMessage={() => {
              setSelectedConversation("");
              setActivePage("messages");
            }}
          />
        )}
        {activePage.startsWith("provider-") &&
          activePage !== "provider-appointments" && (
            <ProviderAreaPage
              area={activePage.slice("provider-".length)}
              onAppointments={() => setActivePage("provider-appointments")}
              onMessage={() => {
                setSelectedConversation("");
                setActivePage("messages");
              }}
              appointments={appointments}
              services={providerServices}
              setServices={setProviderServices}
              providerId={currentUser?.id}
            />
          )}
        {activePage === "favorites" && (
          <FavoritesPage
            providers={providerList.filter((provider) =>
              favoriteProviderIds.includes(provider.id),
            )}
            onProvider={openProvider}
            onRemove={toggleFavorite}
            onDiscover={() => setActivePage("discover")}
          />
        )}
        {activePage === "followers" && currentUser && (
          <FollowersPage
            followingHandles={followingHandles}
            onNotify={notify}
            onMessage={(follower) => {
              void startConversation(follower.id).catch((error: unknown) => {
                notify(error instanceof Error ? error.message : "Unable to start conversation.");
              });
            }}
            onToggleFollow={(follower, following) =>
              updateFollow(follower.id, follower.handle, following)
            }
          />
        )}
        {activePage === "my-posts" && (
          <UserPostsPage
            posts={userPosts}
            onLike={(postId) =>
              setPostList((current) =>
                current.map((post) =>
                  post.id === postId
                    ? {
                        ...post,
                        liked: !post.liked,
                        likes: post.likes + (post.liked ? -1 : 1),
                      }
                    : post,
                ),
              )
            }
            onComment={openPostComments}
            onNotify={notify}
          />
        )}
        {activePage === "notifications" && (
          <NotificationsPage
            notifications={notifications}
            setNotifications={setNotifications}
            onOpen={(notification: PawlyNotification) => {
              if (notification.target === "provider-profile") {
                const provider = providerList.find(
                  (item) => item.id === notification.providerId,
                );
                if (provider) {
                  openProvider(provider);
                  return;
                }
              }
              if (notification.target === "messages" && notification.conversationId) {
                setSelectedConversation(notification.conversationId);
              }
              if (notification.target === "pets") {
                const petId = notification.petId;
                if (petId) setSelectedPet(petId);
                setActivePage(petId && petList.some((pet) => pet.id === petId) ? "pet-profile" : "pets");
              }
              setActivePage(notification.target);
            }}
          />
        )}
        {activePage === "messages" && (
          <MessagingPage
            initialConversation={selectedConversation}
            userId={currentUser?.id ?? ""}
            conversations={conversations}
            setConversations={setConversations}
            onNotify={notify}
            onRefreshNotifications={async () => {
              const response = await fetch(getApiUrl("account-data"), {
                credentials: "include",
                cache: "no-store",
                headers: { Accept: "application/json" },
              });
              const result: unknown = await response.json().catch(() => null);
              if (!response.ok || !isAccountData(result)) {
                throw new Error(`Unable to refresh notifications (${response.status}).`);
              }
              setNotifications(result.notifications);
            }}
          />
        )}
        {activePage === "discover" && (
          <Discover
            search={search}
            setSearch={setSearch}
            providers={countryProviders}
            countryName={selectedCountry.name}
            onProvider={openProvider}
            favoriteProviderIds={favoriteProviderIds}
            onToggleFavorite={toggleFavorite}
            followingHandles={followingHandles}
            onToggleFollowPerson={(person, following) =>
              updateFollow(person.id, person.handle, following)
            }
          />
        )}
        {activePage === "pet-profile" && (
          <PetProfile
            pet={selectedPetRecord}
            appointments={appointments}
            onEdit={() => setPetFormOpen(true)}
          />
        )}
        {activePage === "pets" && (
          <PetsPage
            pets={petList}
            onSelect={(pet) => {
              setSelectedPet(pet.id);
              setActivePage("pet-profile");
            }}
            onAdd={() => setPetFormOpen(true)}
          />
        )}
        {activePage === "business" && role === "provider" && (
          <ProviderBusinessPage
            onOpen={(area) => {
              setActivePage(`provider-${area}`);
            }}
            onMessage={() => {
              setSelectedConversation("");
              setActivePage("messages");
            }}
            onVerificationChange={(verified) => {
              const nextMap = readProviderVerificationMap();
              const providerKey = currentUser?.name || currentUser?.email || "provider";
              nextMap[providerKey] = verified;
              window.localStorage.setItem("pawly-provider-verifications", JSON.stringify(nextMap));
              window.dispatchEvent(new CustomEvent("pawly-provider-verification-changed"));
            }}
          />
        )}
        {activePage !== "home" &&
          activePage !== "admin" &&
          activePage !== "provider-profile" &&
          activePage !== "discover" &&
          activePage !== "community" &&
          activePage !== "messages" &&
          activePage !== "notifications" &&
          activePage !== "favorites" &&
          activePage !== "followers" &&
          activePage !== "my-posts" &&
          activePage !== "pet-profile" &&
          activePage !== "pets" &&
          activePage !== "appointments" &&
          activePage !== "post-comments" &&
          !activePage.startsWith("provider-") &&
          activePage !== "business" && (
            <OwnerWorkspacePage
              page={activePage}
              pets={petList}
              appointments={appointments}
              posts={userPosts}
              favoriteCount={favoriteProviderIds.length}
              theme={theme}
              user={currentUser}
              onThemeChange={toggleTheme}
              onSignOut={() => void signOut()}
              onProfilePictureChange={updateProfilePicture}
              onNavigate={(page) => {
                setActivePage(page);
                setActiveProvider(null);
                setMobileContextOpen(false);
              }}
              onFindCare={() => openProvider(countryProviders[0])}
            />
          )}
          </>
        )}
        </Suspense>
      </main>

      <nav className="pawly-mobile-nav" aria-label="Primary navigation">
        {mobileNavigation.map(({ id, label, icon: Icon, iconSrc }) => (
          <button
            key={id}
            className={activePage === id ? "is-active" : ""}
            aria-label={label}
            onClick={() => navigateToPage(id)}
          >
            {iconSrc ? (
              <img className="pawly-nav-image-icon" src={iconSrc} alt="" aria-hidden="true" />
            ) : (
              <Icon size={21} stroke={1.7} />
            )}
          </button>
        ))}
      </nav>
      {bookingOpen && (
        <Suspense fallback={null}>
        <BookingModal
          pets={petList}
          providers={countryProviders}
          initialProvider={activeProvider}
          initialService={bookingService}
          customServices={providerServices
            .filter((service) => service.active)
            .map((service) => ({
              name: service.name,
              duration: `${service.duration} min`,
              price: service.price,
            }))}
          onClose={() => setBookingOpen(false)}
          onConfirm={async (appointment) => {
          const response = await fetch(getApiUrl("appointments"), {
            method: "POST",
            credentials: "include",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(appointment),
          });
          const result: unknown = await response.json().catch(() => null);
          if (!response.ok) {
            const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
              ? result.error
              : `Unable to request appointment (${response.status}).`;
            throw new Error(message);
          }
          if (typeof result !== "object" || result === null || !("appointment" in result) || !isAppointment(result.appointment)) {
            throw new Error("The server returned an invalid appointment.");
          }
          const createdAppointment = result.appointment;
          setAppointments((current) => [createdAppointment, ...current]);
          setBookingOpen(false);
          setActivePage("appointments");
          }}
        />
        </Suspense>
      )}
      {petFormOpen && (
        <AddPetModal
          onClose={() => setPetFormOpen(false)}
          onSave={async (pet, photo) => {
            if (!currentUser) {
              notify("Sign in to save a pet to your account.");
              return;
            }
            const formData = new FormData();
            formData.append("name", pet.name);
            formData.append("breed", pet.breed);
            if (photo) formData.append("petPhoto", photo, photo.name);

            try {
              const response = await fetch(getApiUrl("pets"), {
                method: "POST",
                credentials: "include",
                headers: { Accept: "application/json" },
                body: formData,
              });
              const result: unknown = await response.json().catch(() => null);
              if (!response.ok) {
                const message =
                  typeof result === "object" &&
                  result !== null &&
                  "error" in result &&
                  typeof result.error === "string"
                    ? result.error
                    : `Unable to save your pet (${response.status}).`;
                throw new Error(message);
              }
              if (!isPet(result)) {
                throw new Error("The server returned an invalid pet.");
              }
              setPetList((current) => [result, ...current]);
              setSelectedPet(result.id);
              setPetFormOpen(false);
            } catch (error) {
              notify(error instanceof Error ? error.message : "Unable to save your pet.");
            }
          }}
          onError={notify}
        />
      )}
    </div>
  );
}

function AuthPanel({
  mode,
  setMode,
  onAuthSubmit,
  onGoogleAuth,
  onNotice,
  countryCode,
  theme,
  onCountryChange,
  onThemeChange,
}: {
  mode: "signin" | "signup" | "forgot";
  setMode: (mode: "signin" | "signup" | "forgot") => void;
  onAuthSubmit: (
    mode: "signin" | "signup",
    values: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      gender?: string;
      phone?: string;
      careType?: string;
      countryCode?: CountryCode;
      role?: "owner" | "provider";
    },
  ) => Promise<void>;
  onGoogleAuth: () => void;
  onNotice: (message: string) => void;
  countryCode: CountryCode;
  theme: ThemeMode;
  onCountryChange: (code: CountryCode) => void;
  onThemeChange: () => void;
}) {
  const [signupRole, setSignupRole] = useState<"owner" | "provider">("owner");
  const [showPassword, setShowPassword] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "forgot") {
      onNotice("Password reset is not available yet.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const values = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      ...(mode === "signup"
        ? {
            firstName: String(formData.get("firstName") ?? ""),
            lastName: String(formData.get("lastName") ?? ""),
            gender: String(formData.get("gender") ?? ""),
            phone: String(formData.get("phone") ?? ""),
            ...(signupRole === "provider"
              ? {
                  careType: String(formData.get("careType") ?? "").trim(),
                  countryCode,
                }
              : {}),
            role: signupRole,
          }
        : {}),
    };
    try {
      await onAuthSubmit(mode, values);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Unable to sign in.");
    }
  };
  return (
    <div className="pawly-auth-panel">
      <div className="pawly-auth-brand">
        <CountryThemeControls
          mobile
          countryCode={countryCode}
          theme={theme}
          onCountryChange={onCountryChange}
          onThemeChange={onThemeChange}
        />
      </div>
      <div className="pawly-auth-heading">
        <h1 className="max-w-[200px] font-circular leading-[1.2] text-[1.8rem] font-[600]">
          {mode === "signup"
            ? "join the community"
            : mode === "forgot"
              ? "Reset password"
              : "Login to your account"}
        </h1>
        <p>
          {mode === "signup"
            ? "Your pet’s world, all in one place."
            : mode === "forgot"
              ? "Enter your email and we’ll send a reset link."
              : "A little more joy in every day with your pet."}
        </p>
      </div>
      {mode === "signup" && (
        <div className="pawly-signup-role-picker" role="group" aria-label="Choose account type">
          <span>Registering as</span>
          <div>
            <button
              type="button"
              className={signupRole === "owner" ? "is-selected" : ""}
              aria-pressed={signupRole === "owner"}
              onClick={() => setSignupRole("owner")}
            >
              Pet owner
            </button>
            <button
              type="button"
              className={signupRole === "provider" ? "is-selected" : ""}
              aria-pressed={signupRole === "provider"}
              onClick={() => setSignupRole("provider")}
            >
              Provider
            </button>
          </div>
        </div>
      )}
      <button
        className="pawly-google-button py-4"
        type="button"
        onClick={onGoogleAuth}
      >
        <img className="pawly-google-icon" src="/google.png" alt="" aria-hidden="true" />
        Continue with Google
      </button>
      <form className="pawly-auth-form pt-4" onSubmit={submit}>
        {mode === "signup" && (
          <>
            <div className="pawly-auth-name-fields">
              <label>
                First name
                <input name="firstName" required autoComplete="given-name" placeholder="" />
              </label>
              <label>
                Last name
                <input name="lastName" required autoComplete="family-name" placeholder="" />
              </label>
            </div>
            <div className="pawly-auth-name-fields">
              <label>
                Gender
                <select name="gender" defaultValue="">
                  <option value="" disabled>
                    Select gender
                  </option>
                  <option>Woman</option>
                  <option>Man</option>
                  <option>Non-binary</option>
                  <option>Prefer not to say</option>
                </select>
              </label>
              <label>
                Cell number
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder=""
                />
              </label>
            </div>
            {signupRole === "provider" && (
              <label>
                Type of care you provide
                <input
                  name="careType"
                  required
                  maxLength={120}
                  autoComplete="organization-title"
                  placeholder="e.g. Veterinary care, grooming, or walking"
                />
              </label>
            )}
          </>
        )}
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder=""
          />
        </label>
        {mode !== "forgot" && (
          <div className="pawly-password-field">
            <label>
              Password
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                placeholder="At least 8 characters"
              />
            </label>
            <label className="pawly-password-toggle">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              <span>Show password</span>
            </label>
          </div>
        )}
        {mode === "signin" && (
          <button
            className="pawly-text-link pawly-forgot"
            type="button"
            onClick={() => setMode("forgot")}
          >
            Forgot password?
          </button>
        )}
        <button className="pawly-primary-button" type="submit">
          {mode === "signup"
            ? "Create account"
            : mode === "forgot"
              ? "Send reset link"
              : "Sign in"}
        </button>
      </form>
      <p className="pawly-auth-switch">
        {mode === "signup" ? "Already have an account?" : "New to Pawly?"}{" "}
        <button
          className="pawly-text-link"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Sign in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}

function HomeFeed({
  posts,
  postsLoading,
  setPosts,
  onProvider,
  providers: localProviders,
  countryName,
  onSeeAllProviders,
  pets,
  user,
  favoriteProviderIds,
  onToggleFavorite,
  followingHandles,
  onToggleFollow,
  onComments,
  onNotify,
  loggedIn,
}: {
  posts: FeedPost[];
  postsLoading: boolean;
  setPosts: Dispatch<SetStateAction<FeedPost[]>>;
  pets: Pet[];
  user: AuthenticatedUser | null;
  onProvider: (provider: Provider) => void;
  providers: Provider[];
  countryName: string;
  onSeeAllProviders: () => void;
  favoriteProviderIds: string[];
  onToggleFavorite: (provider: Provider) => void;
  followingHandles: string[];
  onToggleFollow: (post: FeedPost) => void;
  onComments: (postId: string) => void;
  onNotify: (message: string) => void;
  loggedIn: boolean;
}) {
  const [feedTab, setFeedTab] = useState<"for-you" | "following">("for-you");
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const visiblePosts = feedTab === "following"
    ? posts.filter((post) => followingHandles.includes(post.handle))
    : posts;

  return (
    <FeedColumn className="pawly-home-feed">
      <div className="pawly-feed-tabs">
        <button
          className={feedTab === "for-you" ? "is-selected" : ""}
          aria-pressed={feedTab === "for-you"}
          onClick={() => setFeedTab("for-you")}
        >
          For you
        </button>
        <button
          className={feedTab === "following" ? "is-selected" : ""}
          aria-pressed={feedTab === "following"}
          onClick={() => setFeedTab("following")}
        >
          Following
        </button>
        <button
          className="pawly-feed-create-button"
          type="button"
          aria-label={loggedIn ? "Create a post" : "Sign in to create a post"}
          onClick={() => {
            if (loggedIn) {
              composerInputRef.current?.focus();
            } else {
              onNotify("Sign in to create a post.");
            }
          }}
        >
          <IconPlus size={25} />
        </button>
      </div>
      {loggedIn && (
        <FeedPostComposer
          pets={pets}
          user={user}
          onNotify={onNotify}
          textareaRef={(element) => {
            composerInputRef.current = element;
          }}
          onPost={async (post, media) => {
            const formData = new FormData();
            formData.append("text", post.text);
            formData.append("pet", post.pet ?? "");
            media.forEach((item) => formData.append("media[]", item.file, item.name));

            const response = await fetch(getApiUrl("posts"), {
              method: "POST",
              credentials: "include",
              headers: { Accept: "application/json" },
              body: formData,
            });
            const result: unknown = await response.json().catch(() => null);
            if (!response.ok) {
              const message =
                typeof result === "object" &&
                result !== null &&
                "error" in result &&
                typeof result.error === "string"
                  ? result.error
                  : `Unable to publish your post (${response.status}).`;
              throw new Error(message);
            }
            if (!isFeedPost(result)) {
              throw new Error("The server returned an invalid post.");
            }
            setPosts((current) => [result, ...current]);
            cacheCollection(
              "pawly-feed-cache",
              [result, ...posts.filter((item) => item.id !== result.id)].slice(0, 100),
            );
          }}
        />
      )}
      {!loggedIn && (
        <section className="pawly-welcome-strip">
          <div>
            <strong>Pets make life better together.</strong>
            <span>Join the community and share a little moment.</span>
          </div>
          <span className="pawly-welcome-paw">
            <IconPaw size={24} />
          </span>
        </section>
      )}
      {postsLoading && visiblePosts.length === 0 && (
        <div className="pawly-feed-loading" role="status" aria-live="polite">
          <span className="pawly-loading-indicator" aria-hidden="true" />
          Loading posts…
        </div>
      )}
      {visiblePosts.length ? visiblePosts.map((post, index) => (
        <div key={post.id}>
          <PostCard
            post={post}
            onLike={() => {
              if (!loggedIn) {
                onNotify("Sign in to like posts.");
                return;
              }
              if (!/^[0-9a-f]{24}$/i.test(post.id)) {
                onNotify("This post cannot be liked yet.");
                return;
              }
              const nextLiked = !post.liked;
              setPosts((current) =>
                current.map((item) =>
                  item.id === post.id
                    ? { ...item, liked: nextLiked, likes: Math.max(0, item.likes + (nextLiked ? 1 : -1)) }
                    : item,
                ),
              );
              void fetch(getApiUrl(`posts/${encodeURIComponent(post.id)}/like`), {
                method: nextLiked ? "POST" : "DELETE",
                credentials: "include",
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
                        : `Unable to update post like (${response.status}).`;
                    throw new Error(message);
                  }
                  if (
                    typeof result !== "object" ||
                    result === null ||
                    !("liked" in result) ||
                    typeof result.liked !== "boolean" ||
                    !("likes" in result) ||
                    typeof result.likes !== "number"
                  ) {
                    throw new Error("The server returned an invalid like response.");
                  }
                  const likeResult = result as { liked: boolean; likes: number };
                  setPosts((current) =>
                    current.map((item) =>
                      item.id === post.id
                        ? { ...item, liked: likeResult.liked, likes: Math.max(0, likeResult.likes) }
                        : item,
                    ),
                  );
                })
                .catch((error: unknown) => {
                  setPosts((current) =>
                    current.map((item) =>
                      item.id === post.id
                        ? { ...item, liked: post.liked, likes: post.likes }
                        : item,
                    ),
                  );
                  onNotify(error instanceof Error ? error.message : "Unable to update post like.");
                });
            }}
            onComment={() => {
              if (!loggedIn) {
                onNotify("Sign in to join the conversation.");
                return;
              }
              onComments(post.id);
            }}
            loggedIn={loggedIn}
            following={followingHandles.includes(post.handle)}
            onToggleFollow={() => onToggleFollow(post)}
            onShare={() => {
              if (!loggedIn) {
                onNotify("Sign in to share posts.");
                return;
              }
              if (!/^[0-9a-f]{24}$/i.test(post.id)) {
                onNotify("This post cannot be reshared yet.");
                return;
              }
              void fetch(getApiUrl(`posts/${encodeURIComponent(post.id)}/reshare`), {
                method: "POST",
                credentials: "include",
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
                        : `Unable to reshare post (${response.status}).`;
                    throw new Error(message);
                  }
                  if (
                    typeof result !== "object" ||
                    result === null ||
                    !("reshared" in result) ||
                    typeof result.reshared !== "boolean" ||
                    !("reshares" in result) ||
                    typeof result.reshares !== "number"
                  ) {
                    throw new Error("The server returned an invalid reshare response.");
                  }
                  const reshareResult = result as { reshared: boolean; reshares: number };
                  setPosts((current) =>
                    current.map((item) =>
                      item.id === post.id
                        ? {
                            ...item,
                            reshared: reshareResult.reshared,
                            reshares: Math.max(0, reshareResult.reshares),
                          }
                        : item,
                    ),
                  );
                  const shareUrl = `${window.location.origin}/?post=${encodeURIComponent(post.id)}`;
                  if (navigator.share) {
                    await navigator.share({
                      title: `${post.name} on Pawly`,
                      text: post.text,
                      url: shareUrl,
                    });
                  } else if (navigator.clipboard) {
                    await navigator.clipboard.writeText(shareUrl);
                    onNotify("Post reshared. Link copied to your clipboard.");
                  } else {
                    onNotify("Post reshared.");
                  }
                })
                .catch((error: unknown) => {
                  onNotify(error instanceof Error ? error.message : "Unable to reshare post.");
                });
            }}
            onNotify={onNotify}
          />
          {feedTab === "for-you" && index === 2 && (
            <ProviderCarousel
              onProvider={onProvider}
              providers={localProviders}
              countryName={countryName}
              onSeeAll={onSeeAllProviders}
              favoriteProviderIds={favoriteProviderIds}
              onToggleFavorite={onToggleFavorite}
            />
          )}
        </div>
      )) : !postsLoading && (
        <div className="pawly-empty-state pawly-feed-empty" role="status">
          <IconPaw size={24} />
          <strong>
            {feedTab === "following" ? "No posts from followed accounts yet" : "No community posts yet"}
          </strong>
          <span>
            {feedTab === "following"
              ? "Posts from accounts you follow will appear here."
              : "Public posts will appear here for everyone once they’re published."}
          </span>
        </div>
      )}
    </FeedColumn>
  );
}

function UserPostsPage({
  posts,
  onLike,
  onComment,
  onNotify,
}: {
  posts: FeedPost[];
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onNotify: (message: string) => void;
}) {
  return (
    <FeedColumn>
      <div className="pawly-page-actions">
        <h1 className="m-0 text-base font-semibold">My posts</h1>
      </div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={() => onLike(post.id)}
          onComment={() => onComment(post.id)}
          onShare={() => {
            navigator.clipboard?.writeText("Pawly post");
          }}
          onNotify={onNotify}
          loggedIn
          following={false}
          onToggleFollow={() => {}}
          hideFollow
        />
      ))}
      {!posts.length && (
        <div className="pawly-empty-state">
          <strong>You haven’t shared a post yet.</strong>
        </div>
      )}
    </FeedColumn>
  );
}

function FollowersPage({
  followingHandles,
  onNotify,
  onMessage,
  onToggleFollow,
}: {
  followingHandles: string[];
  onNotify: (message: string) => void;
  onMessage: (follower: FollowerAccount) => void;
  onToggleFollow: (follower: FollowerAccount, following: boolean) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"followers" | "following">("followers");
  const [followers, setFollowers] = useState<FollowerAccount[]>([]);
  const [followingAccounts, setFollowingAccounts] = useState<FollowerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(getApiUrl("followers"), {
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
              : `Unable to load followers (${response.status}).`;
          throw new Error(message);
        }
        if (
          typeof result !== "object" ||
          result === null ||
          !("followers" in result) ||
          !Array.isArray(result.followers) ||
          !result.followers.every(isFollowerAccount) ||
          !("following" in result) ||
          !Array.isArray(result.following) ||
          !result.following.every(isFollowerAccount)
        ) {
          throw new Error("The server returned an invalid followers or following list.");
        }
        if (!controller.signal.aborted) {
          setFollowers(result.followers);
          setFollowingAccounts(result.following);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load followers.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  return (
    <FeedColumn className="pawly-followers-page">
      <div className="pawly-feed-tabs pawly-follow-tabs">
        <button
          type="button"
          className={activeTab === "followers" ? "is-selected" : ""}
          aria-pressed={activeTab === "followers"}
          onClick={() => setActiveTab("followers")}
        >
          Followers {!loading && <span>{followers.length}</span>}
        </button>
        <button
          type="button"
          className={activeTab === "following" ? "is-selected" : ""}
          aria-pressed={activeTab === "following"}
          onClick={() => setActiveTab("following")}
        >
          Following {!loading && <span>{followingAccounts.length}</span>}
        </button>
      </div>
      {loading && <div className="pawly-page-loading" role="status" aria-busy="true">Loading followers…</div>}
      {error && (
        <div className="pawly-followers-error" role="alert">
          <span>{error}</span>
          <button
            onClick={() => {
              setLoading(true);
              setError("");
              setRetry((attempt) => attempt + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !error && (activeTab === "followers" ? followers : followingAccounts).map((follower) => {
        const isFollowing = followingHandles.includes(follower.handle) || (
          activeTab === "following" && followingAccounts.some((account) => account.id === follower.id)
        );
        const isUpdating = updatingIds.includes(follower.id);
        return (
          <article className="pawly-follower-row" key={follower.id}>
            <Avatar name={follower.name} src={follower.avatar || undefined} />
            <div className="pawly-follower-details">
              <strong>{follower.name}</strong>
              <span>@{follower.handle}</span>
            </div>
            <button
              className="pawly-secondary-button"
              type="button"
              onClick={() => onMessage(follower)}
            >
              Message
            </button>
            <button
              className={`pawly-follow-button${isFollowing ? " is-following" : ""}`}
              type="button"
              disabled={isUpdating}
              aria-pressed={isFollowing}
              onClick={() => {
                const nextFollowing = !isFollowing;
                setUpdatingIds((current) => [...current, follower.id]);
                void onToggleFollow(follower, nextFollowing)
                  .then(() => {
                    setFollowingAccounts((current) => nextFollowing
                      ? current.some((account) => account.id === follower.id)
                        ? current
                        : [...current, { ...follower, following: true }]
                      : current.filter((account) => account.id !== follower.id));
                  })
                  .catch((requestError: unknown) => {
                    onNotify(
                      requestError instanceof Error
                        ? requestError.message
                        : "Unable to update follow.",
                    );
                  })
                  .finally(() => {
                    setUpdatingIds((current) => current.filter((id) => id !== follower.id));
                  });
              }}
            >
              {isUpdating
                ? "Updating…"
                : isFollowing
                  ? "Following"
                  : "Follow back"}
            </button>
          </article>
        );
      })}
      {!loading && !error && (activeTab === "followers" ? followers : followingAccounts).length === 0 && (
        <div className="pawly-followers-empty">
          <IconUsers size={26} />
          <strong>{activeTab === "followers" ? "No followers yet" : "You aren’t following anyone yet"}</strong>
          <span>
            {activeTab === "followers"
              ? "When someone follows you, they’ll show up here."
              : "People you follow will show up here."}
          </span>
        </div>
      )}
    </FeedColumn>
  );
}

function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onNotify,
  loggedIn,
  following,
  onToggleFollow,
  hideFollow = false,
}: {
  post: FeedPost;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onNotify: (message: string) => void;
  loggedIn: boolean;
  following: boolean;
  onToggleFollow: () => void;
  hideFollow?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [savedCollection, setSavedCollection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoToView, setPhotoToView] = useState<string | null>(null);
  const photoTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!photoToView) return;
    const photoTrigger = photoTriggerRef.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPhotoToView(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      photoTrigger?.focus();
    };
  }, [photoToView]);

  useEffect(() => {
    if (!loggedIn || !/^[0-9a-f]{24}$/i.test(post.id)) return;
    const controller = new AbortController();
    void fetch(getApiUrl(`saved-posts?postId=${encodeURIComponent(post.id)}`), {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(`Unable to load saved-post state (${response.status}).`);
        if (typeof result !== "object" || result === null || !("saved" in result) ||
          typeof result.saved !== "boolean" ||
          !("collection" in result) ||
          !(typeof result.collection === "string" || result.collection === null)) {
          throw new Error("The server returned an invalid saved-post state.");
        }
        if (!controller.signal.aborted) {
          setSaved(result.saved);
          setSavedCollection(result.collection);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          onNotify(error instanceof Error ? error.message : "Unable to load saved-post state.");
        }
      });
    return () => controller.abort();
  }, [loggedIn, onNotify, post.id]);

  const toggleSaved = async () => {
    if (!loggedIn) {
      onNotify("Sign in to save posts.");
      return;
    }
    if (!/^[0-9a-f]{24}$/i.test(post.id)) {
      onNotify("This post cannot be saved yet.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(getApiUrl("saved-posts"), {
        method: saved ? "DELETE" : "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, collection: saved ? savedCollection ?? "Saved posts" : "Saved posts" }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string"
          ? result.error
          : `Unable to save post (${response.status}).`;
        throw new Error(message);
      }
      if (typeof result !== "object" || result === null || !("saved" in result) ||
        result.saved !== !saved) {
        throw new Error("The server returned an invalid saved-post response.");
      }
      setSaved(!saved);
      setSavedCollection(saved ? null : "Saved posts");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Unable to update saved post.");
    } finally {
      setSaving(false);
    }
  };
  const postedAt = postDate(post);
  const absolutePostTime = formatAbsolutePostTime(post);
  return (
    <article className="pawly-post-card">
      <header className="pawly-post-header">
        <Avatar name={post.name} src={post.avatar} />
        <div className="pawly-post-author">
          <div>
            <strong>{post.name}</strong>
            {post.verified && (
              <span className="pawly-verified" title="Verified user">
                <VerificationBadge size={15} />
              </span>
            )}
          </div>
          <span>
            {post.pet ? `${post.pet} · ` : ""}@{post.handle}
          </span>
          {absolutePostTime && postedAt ? (
            <time
              className="pawly-post-time"
              dateTime={postedAt.toISOString()}
            >
              · {absolutePostTime}
            </time>
          ) : (
            <span className="pawly-post-time">· {post.time}</span>
          )}
        </div>
        {!hideFollow && post.handle !== "johndoe" && (
          <button
            className={`pawly-follow-button ${following ? "is-following" : ""}`}
            aria-pressed={following}
            onClick={onToggleFollow}
          >
            {following ? "Following" : "Follow"}
          </button>
        )}
        <button
          className="pawly-icon-button pawly-post-menu"
          aria-label={saved ? "Remove post from saved posts" : "Save post to Saved posts"}
          aria-pressed={saved}
          disabled={saving}
          onClick={() => void toggleSaved()}
        >
          <IconBookmark size={18} />
        </button>
      </header>
      <p className="pawly-post-text">{post.text}</p>
      {post.mediaItems?.length ? (
        <div
          className={`pawly-post-media-grid${post.mediaItems.length === 1 ? " is-single" : ""}`}
        >
          {post.mediaItems.map((media, index) =>
            media.type.startsWith("video/") ? (
              <video
                key={`${media.url}-${index}`}
                controls
                preload="metadata"
                src={media.url}
                aria-label={`Post video: ${media.name}`}
              />
            ) : (
              <button
                key={`${media.url}-${index}`}
                ref={index === 0 ? photoTriggerRef : undefined}
                className="pawly-post-media-grid-image"
                aria-label={`View photo: ${media.name}`}
                onClick={() => setPhotoToView(media.url)}
              >
                <img loading="lazy" decoding="async" src={media.url} alt={media.name || "Pet"} />
              </button>
            ),
          )}
        </div>
      ) : post.image && (
        <button
          ref={photoTriggerRef}
          className="pawly-post-media"
          aria-label={`View photo: ${post.imageAlt ?? "pet photo"}`}
          onClick={() => setPhotoToView(post.image!)}
        >
          <img loading="lazy" decoding="async" src={post.image} alt={post.imageAlt ?? "Pet"} />
        </button>
      )}
      {!post.mediaItems?.length && post.video && (
        <video
          className="pawly-post-video"
          controls
          preload="metadata"
          src={post.video}
          aria-label="Post video"
        />
      )}
      <div className="pawly-post-actions">
        <div className="pawly-post-primary-actions">
          <button
            className={post.liked ? "is-liked" : ""}
            aria-label={
              loggedIn
                ? post.liked ? "Unlike post" : "Like post"
                : "Sign in to like post"
            }
            onClick={onLike}
          >
            <img className="pawly-post-action-icon" src="/icons/like.png" alt="" aria-hidden="true" />
            <span>{post.likes}</span>
          </button>
          <button
            aria-label={loggedIn ? "Show comments" : "Sign in to comment"}
            onClick={() => {
              if (!loggedIn) {
                onNotify("Sign in to join the conversation.");
                return;
              }
              onComment();
            }}
          >
            <img className="pawly-post-action-icon" src="/icons/comment.png" alt="" aria-hidden="true" />
            <span>{post.comments}</span>
          </button>
          <button
            aria-label={loggedIn ? "Share post" : "Sign in to share post"}
            onClick={onShare}
          >
            <img className="pawly-post-action-icon" src="/icons/share.png" alt="" aria-hidden="true" />
            <span>{post.reshares ? post.reshares : "Share"}</span>
          </button>
        </div>
        <button
          className={`pawly-save-action ${saved ? "is-saved" : ""}`}
          aria-label={saved ? "Remove post from saved posts" : "Save post to Saved posts"}
          aria-pressed={saved}
          disabled={saving}
          onClick={() => void toggleSaved()}
        >
          <IconBookmark size={19} />
        </button>
      </div>
      {photoToView && (
        <div
          className="pawly-photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Pet photo"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPhotoToView(null);
          }}
        >
          <button
            className="pawly-photo-close"
            aria-label="Close photo"
            autoFocus
            onClick={() => setPhotoToView(null)}
          >
            <IconX size={22} />
          </button>
          <figure>
            <img src={photoToView} alt={post.imageAlt ?? "Pet"} />
            <figcaption>{post.text}</figcaption>
          </figure>
        </div>
      )}
    </article>
  );
}

function PostCommentsPage({
  post,
  loggedIn,
  user,
  onBack,
  onLike,
  onCommentAdded,
  onNotify,
}: {
  post: FeedPost;
  loggedIn: boolean;
  user: AuthenticatedUser | null;
  onBack: () => void;
  onLike: () => void;
  onCommentAdded: (comment: FeedComment, comments: number) => void;
  onNotify: (message: string) => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const comments = post.commentItems ?? [];

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const commentText = text.trim();
    if (!commentText || submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch(getApiUrl(`posts/${encodeURIComponent(post.id)}/comments`), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : `Unable to add comment (${response.status}).`;
        throw new Error(message);
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("comment" in result) ||
        !isFeedComment(result.comment) ||
        !("comments" in result) ||
        typeof result.comments !== "number"
      ) {
        throw new Error("The server returned an invalid comment.");
      }
      onCommentAdded(result.comment, result.comments);
      setText("");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Unable to add comment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FeedColumn className="pawly-post-comments-page">
      <div className="pawly-post-comments-heading">
        <button type="button" className="pawly-post-comments-back" onClick={onBack}>
          <IconArrowRight size={18} aria-hidden="true" />
          Back to posts
        </button>
      </div>
      <PostCard
        post={post}
        onLike={onLike}
        onComment={() => commentInputRef.current?.focus()}
        onShare={() => {
          navigator.clipboard?.writeText("Pawly post");
        }}
        onNotify={onNotify}
        loggedIn={loggedIn}
        following={false}
        onToggleFollow={() => {}}
        hideFollow
      />
      <section className="pawly-post-comments-list" aria-labelledby="post-comments-title">
        <h2 id="post-comments-title">Comments ({post.comments})</h2>
        {comments.length ? (
          comments.map((comment) => {
            const createdAt = new Date(comment.createdAt);
            return (
              <article className="pawly-post-comment" key={comment.id}>
                <Avatar name={comment.name} src={comment.avatar || undefined} />
                <div>
                  <div className="pawly-post-comment-author">
                    <strong>{comment.name}</strong>
                    <span>@{comment.handle}</span>
                    {Number.isNaN(createdAt.getTime()) ? null : (
                      <time dateTime={createdAt.toISOString()}>
                        {createdAt.toLocaleString()}
                      </time>
                    )}
                  </div>
                  <p>{comment.text}</p>
                </div>
              </article>
            );
          })
        ) : (
          <p className="pawly-post-comments-empty">No comments yet. Start the conversation.</p>
        )}
      </section>
      {loggedIn ? (
        <form className="pawly-post-comment-form" onSubmit={(event) => void submitComment(event)}>
          <Avatar
            name={user?.name ?? "Your profile"}
            src={user?.picture ?? undefined}
          />
          <textarea
            ref={commentInputRef}
            aria-label="Write a comment"
            placeholder="Write a comment..."
            maxLength={2000}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            aria-label={submitting ? "Sending reply" : "Send reply"}
            title={submitting ? "Sending reply" : "Send reply"}
          >
            <img className="pawly-post-send-icon" src="/icons/send.png" alt="" aria-hidden="true" />
          </button>
        </form>
      ) : (
        <p className="pawly-comment-signin">Sign in to comment.</p>
      )}
    </FeedColumn>
  );
}

function ProviderCarousel({
  onProvider,
  providers: localProviders,
  countryName,
  onSeeAll,
  favoriteProviderIds,
  onToggleFavorite,
}: {
  onProvider: (provider: Provider) => void;
  providers: Provider[];
  countryName: string;
  onSeeAll: () => void;
  favoriteProviderIds: string[];
  onToggleFavorite: (provider: Provider) => void;
}) {
  return (
    <section className="pawly-provider-section">
      <div className="pawly-provider-heading">
        <div>
          <h2>Pet care near you</h2>
          <span>{countryName}</span>
        </div>
        <button onClick={onSeeAll}>
          See all <IconChevron />
        </button>
      </div>
      {localProviders.length ? (
        <div className="pawly-provider-scroller">
          {localProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isFavorite={favoriteProviderIds.includes(provider.id)}
              onToggleFavorite={() => onToggleFavorite(provider)}
              onClick={() => onProvider(provider)}
            />
          ))}
        </div>
      ) : (
        <p className="pawly-empty-country">No providers are listed in this country yet.</p>
      )}
    </section>
  );
}

function IconChevron() {
  return <IconArrowRight size={15} />;
}

function ProviderCard({
  provider,
  isFavorite,
  onToggleFavorite,
  onClick,
}: {
  provider: Provider;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}) {
  return (
    <article className="pawly-provider-card">
      <button className="pawly-provider-open" onClick={onClick}>
        <img className="pawly-provider-cover" src={provider.image} alt="" loading="lazy" decoding="async" />
        <span className="pawly-provider-card-body">
          <strong className="pawly-provider-name">
            {provider.name}
            {provider.verified && <VerificationBadge size={15} />}
          </strong>
          <span className="pawly-provider-type">{provider.type}</span>
          <span className="pawly-provider-meta">
            <span><IconStarFilled size={13} /> {provider.rating}</span>
            <span><IconMapPin size={13} /> {provider.location}</span>
          </span>
          <span className="pawly-provider-price">{provider.price}</span>
        </span>
      </button>
      <button
        className={`pawly-provider-favorite ${isFavorite ? "is-favorite" : ""}`}
        aria-label={isFavorite ? `Remove ${provider.name} from favorites` : `Save ${provider.name} to favorites`}
        onClick={onToggleFavorite}
      >
        <IconHeart size={17} fill={isFavorite ? "currentColor" : "none"} />
      </button>
    </article>
  );
}

type SearchPerson = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: string;
  verified: boolean;
};

type SearchPost = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  text: string;
  petName: string;
  time: string;
};

type SearchResults = {
  people: SearchPerson[];
  providers: Provider[];
  posts: SearchPost[];
};

function isSearchProvider(value: unknown): value is Provider {
  return (
    typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" &&
    "name" in value && typeof value.name === "string" &&
    "type" in value && typeof value.type === "string" &&
    "rating" in value && typeof value.rating === "string" &&
    "location" in value && typeof value.location === "string" &&
    "countryCode" in value && typeof value.countryCode === "string" &&
    "image" in value && typeof value.image === "string" &&
    "price" in value && typeof value.price === "string"
  );
}

function Discover({
  search,
  setSearch,
  providers: localProviders,
  countryName,
  onProvider,
  favoriteProviderIds,
  onToggleFavorite,
  followingHandles,
  onToggleFollowPerson,
}: {
  search: string;
  setSearch: (value: string) => void;
  providers: Provider[];
  countryName: string;
  onProvider: (provider: Provider) => void;
  favoriteProviderIds: string[];
  onToggleFavorite: (provider: Provider) => void;
  followingHandles: string[];
  onToggleFollowPerson: (person: SearchPerson, following: boolean) => Promise<void>;
}) {
  const [searchResults, setSearchResults] = useState<SearchResults>({ people: [], providers: [], posts: [] });
  const [loadedSearchQuery, setLoadedSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [updatingPersonIds, setUpdatingPersonIds] = useState<string[]>([]);
  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch(getApiUrl(`search?q=${encodeURIComponent(query)}`), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }).then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
              ? result.error
              : `Search failed (${response.status}).`;
          throw new Error(message);
        }
        if (typeof result !== "object" || result === null || !("people" in result) ||
          !Array.isArray(result.people) || !("providers" in result) || !Array.isArray(result.providers) ||
          !("posts" in result) || !Array.isArray(result.posts)) {
          throw new Error("The server returned invalid search results.");
        }
        const people = result.people.filter((person): person is SearchPerson =>
          typeof person === "object" && person !== null &&
          "id" in person && typeof person.id === "string" &&
          "name" in person && typeof person.name === "string" &&
          "handle" in person && typeof person.handle === "string" &&
          "avatar" in person && typeof person.avatar === "string" &&
          "role" in person && typeof person.role === "string" &&
          "verified" in person && typeof person.verified === "boolean",
        );
        const foundProviders = result.providers.filter(isSearchProvider);
        const posts = result.posts.filter((post): post is SearchPost =>
          typeof post === "object" && post !== null &&
          "id" in post && typeof post.id === "string" &&
          "name" in post && typeof post.name === "string" &&
          "handle" in post && typeof post.handle === "string" &&
          "avatar" in post && typeof post.avatar === "string" &&
          "text" in post && typeof post.text === "string" &&
          "petName" in post && typeof post.petName === "string" &&
          "time" in post && typeof post.time === "string",
        );
        setSearchResults({ people, providers: foundProviders, posts });
        setLoadedSearchQuery(query);
        setSearchError("");
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : "Search failed.");
      });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  const filtered = useMemo(
    () =>
      (search.trim().length >= 2 && loadedSearchQuery === search.trim() && searchResults.providers.length
        ? searchResults.providers
        : localProviders).filter((provider) =>
        `${provider.name} ${provider.type} ${provider.location}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [localProviders, search, searchResults.providers, loadedSearchQuery],
  );
  return (
    <FeedColumn className="pawly-discover-page">
      <label className="pawly-search-field">
        <IconSearch size={19} />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSearchError("");
          }}
          placeholder="Search people, posts, services, providers..."
          aria-label="Search people, posts, services, and providers"
        />
      </label>
      {searchError && <p className="pawly-inline-error" role="alert">{searchError}</p>}
      {search.trim().length >= 2 && loadedSearchQuery !== search.trim() && <p role="status">Searching people and posts…</p>}
      {search.trim().length >= 2 && loadedSearchQuery === search.trim() && (
        <>
          <section className="pawly-profile-section">
            <h2>People</h2>
            {searchResults.people.length ? searchResults.people.map((person) => {
              const isFollowing = followingHandles.includes(person.handle);
              const isUpdating = updatingPersonIds.includes(person.id);
              return (
                <article className="pawly-follower-row" key={person.id}>
                  <Avatar name={person.name} src={person.avatar || undefined} />
                  <div className="pawly-follower-info">
                    <strong>{person.name}{person.verified && <span className="pawly-verified" title="Verified user"><VerificationBadge size={14} /></span>}</strong>
                    <span>{person.handle} · {person.role}</span>
                  </div>
                  <button
                    className={isFollowing ? "pawly-secondary-button" : "pawly-primary-button"}
                    disabled={isUpdating}
                    onClick={() => {
                      setUpdatingPersonIds((current) => [...current, person.id]);
                      void onToggleFollowPerson(person, !isFollowing)
                        .catch((error: unknown) => setSearchError(error instanceof Error ? error.message : "Unable to update follow."))
                        .finally(() => setUpdatingPersonIds((current) => current.filter((id) => id !== person.id)));
                    }}
                  >
                    {isUpdating ? "Updating…" : isFollowing ? "Following" : "Follow"}
                  </button>
                </article>
              );
            }) : <p>No people found.</p>}
          </section>
          <section className="pawly-profile-section">
            <h2>Posts</h2>
            {searchResults.posts.length ? searchResults.posts.map((post) => (
              <article className="pawly-search-post" key={post.id}>
                <div className="pawly-search-post-author">
                  <Avatar name={post.name} src={post.avatar || undefined} />
                  <div><strong>{post.name}</strong><span>{post.handle}</span></div>
                  <small>{post.time ? new Date(post.time).toLocaleDateString() : ""}</small>
                </div>
                <p>{post.text}</p>
                {post.petName && <small>Pet: {post.petName}</small>}
              </article>
            )) : <p>No posts found.</p>}
          </section>
        </>
      )}
      <div className="pawly-category-list">
        {[
          "Veterinary",
          "Grooming",
          "Training",
          "Boarding",
          "Pet sitting",
          "Nutrition",
        ].map((category) => (
          <button key={category} onClick={() => setSearch(category)}>
            {category}
            <span>→</span>
          </button>
        ))}
      </div>
      <h2 className="pawly-subheading">
        {search.trim().length >= 2 ? "Providers and services" : `Providers in ${countryName}`}
      </h2>
      {filtered.length ? (
        <div className="pawly-discover-results">
          {filtered.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isFavorite={favoriteProviderIds.includes(provider.id)}
              onToggleFavorite={() => onToggleFavorite(provider)}
              onClick={() => onProvider(provider)}
            />
          ))}
        </div>
      ) : (
        <div className="pawly-empty-state">
          <IconSearch size={23} />
          <strong>No providers found in {countryName}</strong>
          <button onClick={() => setSearch("")}>Clear search</button>
        </div>
      )}
    </FeedColumn>
  );
}

function ProviderProfile({
  provider,
  services,
  appointments,
  canReview,
  isFavorite,
  onToggleFavorite,
  onBook,
  onMessage,
}: {
  provider: Provider;
  services: ProviderService[];
  appointments: Appointment[];
  canReview: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBook: (service: string) => void;
  onMessage: () => void;
}) {
  const [reviews, setReviews] = useState<Array<{
    id: string;
    reviewerName: string;
    rating: number;
    text: string;
    createdAt: string;
  }>>([]);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const completedAppointments = appointments.filter(
    (appointment) => appointment.providerId === provider.id && appointment.status === "COMPLETED",
  );
  useEffect(() => {
    const controller = new AbortController();
    void fetch(getApiUrl(`providers/${encodeURIComponent(provider.id)}/reviews`), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`Unable to load reviews (${response.status}).`);
      if (typeof result !== "object" || result === null || !("reviews" in result) || !Array.isArray(result.reviews)) {
        throw new Error("The server returned invalid provider reviews.");
      }
      const validated = result.reviews.filter((review): review is {
        id: string;
        reviewerName: string;
        rating: number;
        text: string;
        createdAt: string;
      } =>
        typeof review === "object" && review !== null &&
        "id" in review && typeof review.id === "string" &&
        "reviewerName" in review && typeof review.reviewerName === "string" &&
        "rating" in review && typeof review.rating === "number" &&
        "text" in review && typeof review.text === "string" &&
        "createdAt" in review && typeof review.createdAt === "string",
      );
      setReviews(validated);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setReviewsError(error instanceof Error ? error.message : "Unable to load reviews.");
    });
    return () => controller.abort();
  }, [provider.id]);
  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const appointmentId = String(formData.get("appointmentId") ?? "");
    const rating = Number(formData.get("rating"));
    const text = String(formData.get("text") ?? "").trim();
    setSubmittingReview(true);
    try {
      const response = await fetch(getApiUrl(`providers/${encodeURIComponent(provider.id)}/reviews`), {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, rating, text }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : `Unable to submit review (${response.status}).`;
        throw new Error(message);
      }
      setReviewing(false);
    } catch (error) {
      setReviewsError(error instanceof Error ? error.message : "Unable to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };
  const providerServiceOptions = services
    .filter((service) => service.active && service.providerId === provider.id)
    .map((service) => ({
      name: service.name,
      time: `${service.duration} min`,
      price: `${service.price}`,
    }));
  if (!providerServiceOptions.length) {
    providerServiceOptions.push({
      name: provider.type,
      time: "30 min",
      price: provider.price.replace(/[^0-9.]/g, "") || "0",
    });
  }
  return (
    <FeedColumn className="pawly-profile-page">
      <button
        className="pawly-back-link"
        onClick={() =>
          window.history.length > 1 ? window.history.back() : undefined
        }
      >
        ← Back
      </button>
      <img className="pawly-profile-cover" src={provider.image} alt="" loading="lazy" decoding="async" />
      <div className="pawly-provider-profile-head">
        <div className="pawly-provider-profile-avatar">
          <img src={provider.image} alt="" loading="lazy" decoding="async" />
        </div>
        <div className="pawly-profile-provider-name">
          <h1>
            {provider.name}
            {provider.verified && <VerificationBadge size={18} />}
          </h1>
          <p>
            {provider.type} <span>·</span> <IconMapPin size={14} />{" "}
            {provider.location}
          </p>
          <span className="pawly-profile-rating">
            <IconStarFilled size={15} /> {provider.rating}{" "}
          </span>
        </div>
        {!provider.verified && (
          <div className="pawly-verification-gate">
            <strong>Verification required</strong>
            <p>
              Submit your license and ID to unlock the trusted badge and show
              pet owners you’re a verified provider.
            </p>
          </div>
        )}
        <div className="pawly-profile-actions">
          <button className="pawly-secondary-button" onClick={onToggleFavorite}>
            {isFavorite ? "Saved" : "Save"}
          </button>
          <button className="pawly-secondary-button" onClick={onMessage}>
            Message
          </button>
          <button
            className="pawly-primary-button"
            onClick={() => onBook(providerServiceOptions[0].name)}
            disabled={!providerServiceOptions.length}
          >
            Book appointment
          </button>
        </div>
      </div>
      <section className="pawly-profile-section">
        <h2>About</h2>
        <p>No business description has been added.</p>
      </section>
      <section className="pawly-profile-section">
        <h2>Services</h2>
        {providerServiceOptions.length ? (
          providerServiceOptions.map((service) => (
            <button
              className="pawly-service-row"
              key={service.name}
              onClick={() => onBook(service.name)}
            >
              <span>
                <strong>{service.name}</strong>
                <small>{service.time}</small>
              </span>
              <span>
                {service.price}
                <b>Book</b>
              </span>
            </button>
          ))
        ) : (
          <p>No services are currently available for booking.</p>
        )}
      </section>
      <section className="pawly-profile-section">
        <h2>Recent reviews</h2>
        {reviewsError && <p className="pawly-inline-error" role="alert">{reviewsError}</p>}
        {reviews.map((review) => (
          <article className="pawly-care-record" key={review.id}>
            <span className="pawly-care-record-icon appointment"><IconStarFilled size={16} /></span>
            <div>
              <strong>{review.reviewerName} · {review.rating}/5</strong>
              <span>{review.text}</span>
              <small>{new Date(review.createdAt).toLocaleDateString()}</small>
            </div>
          </article>
        ))}
        {!reviews.length && !reviewsError && <p>No approved reviews have been added yet.</p>}
        {canReview && completedAppointments.length > 0 && (
          reviewing ? (
            <form className="pawly-care-record-form" onSubmit={submitReview}>
              <label>
                Completed appointment
                <select name="appointmentId" required defaultValue={completedAppointments[0].id}>
                  {completedAppointments.map((appointment) => (
                    <option value={appointment.id} key={appointment.id}>
                      {appointment.service} · {appointment.date}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Rating
                <select name="rating" defaultValue="5">
                  {[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} stars</option>)}
                </select>
              </label>
              <label>
                Your review
                <textarea name="text" rows={3} minLength={1} maxLength={1000} required />
              </label>
              <button className="pawly-primary-button" type="submit" disabled={submittingReview}>
                {submittingReview ? "Submitting…" : "Submit review"}
              </button>
            </form>
          ) : (
            <button className="pawly-secondary-button" onClick={() => setReviewing(true)}>Write a review</button>
          )
        )}
      </section>
    </FeedColumn>
  );
}

type PetCareRecord = {
  id: string;
  type: "vaccination" | "medication" | "allergy" | "visit";
  title: string;
  date: string;
  dueDate: string | null;
  notes: string;
};

function formatPetCareDate(date: string) {
  const parsedDate = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : date,
  );
  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PetProfile({
  pet,
  appointments,
  onEdit,
}: {
  pet?: Pet;
  appointments: Appointment[];
  onEdit: () => void;
}) {
  if (!pet) {
    return (
      <FeedColumn>
        <EmptyPet onAdd={onEdit} />
      </FeedColumn>
    );
  }

  return (
    <PetProfileContent
      key={pet.id}
      pet={pet}
      appointments={appointments}
      onEdit={onEdit}
    />
  );
}

function PetProfileContent({
  pet,
  appointments,
  onEdit,
}: {
  pet: Pet;
  appointments: Appointment[];
  onEdit: () => void;
}) {
  const [records, setRecords] = useState<PetCareRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState("");
  const [recordFormOpen, setRecordFormOpen] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [healthNotes, setHealthNotes] = useState(() => {
    try {
      const stored = window.localStorage.getItem(`pawly-health-notes-${pet.id}`);
      const parsed: unknown = stored ? JSON.parse(stored) : {};
      return parsed && typeof parsed === "object" &&
        "allergies" in parsed && typeof parsed.allergies === "string" &&
        "medications" in parsed && typeof parsed.medications === "string"
        ? { allergies: parsed.allergies, medications: parsed.medications }
        : { allergies: "", medications: "" };
    } catch {
      return { allergies: "", medications: "" };
    }
  });
  const [healthEditing, setHealthEditing] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(`pawly-health-notes-${pet.id}`, JSON.stringify(healthNotes));
  }, [pet.id, healthNotes]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(getApiUrl(`pets/${encodeURIComponent(pet.id)}/medical-records`), {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).then(async (response) => {
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage =
          typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string"
            ? result.error
            : `Unable to load medical records (${response.status}).`;
        throw new Error(errorMessage);
      }
      if (
        typeof result !== "object" || result === null || !("records" in result) ||
        !Array.isArray(result.records)
      ) {
        throw new Error("The server returned invalid medical records.");
      }
      setRecords(result.records.filter((record): record is PetCareRecord =>
        typeof record === "object" && record !== null &&
        "id" in record && typeof record.id === "string" &&
        "type" in record && ["vaccination", "medication", "allergy", "visit"].includes(String(record.type)) &&
        "title" in record && typeof record.title === "string" &&
        "date" in record && typeof record.date === "string" &&
        "notes" in record && typeof record.notes === "string" &&
        "dueDate" in record && (record.dueDate === null || typeof record.dueDate === "string"),
      ));
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setRecordsError(error instanceof Error ? error.message : "Unable to load medical records.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setRecordsLoading(false);
    });
    return () => controller.abort();
  }, [pet.id]);

  const completedAppointments = appointments.filter(
    (appointment) => appointment.petId === pet.id && appointment.status === "COMPLETED",
  );
  const timeline = [
    ...completedAppointments.map((appointment) => ({
      id: appointment.id,
      title: appointment.service,
      date: appointment.date,
      notes: `${appointment.providerName} · ${appointment.professional}`,
      type: "appointment" as const,
    })),
    ...records.map((record) => ({ ...record, category: record.type })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const saveCareRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const type = String(formData.get("type") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    const date = String(formData.get("date") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "") || null;
    const notes = String(formData.get("notes") ?? "").trim();
    if (!title || !date || !["vaccination", "medication", "allergy", "visit"].includes(type)) return;
    setSavingRecord(true);
    try {
     const response = await fetch(getApiUrl(`pets/${encodeURIComponent(pet.id)}/medical-records`), {
       method: "POST",
       credentials: "include",
       headers: { Accept: "application/json", "Content-Type": "application/json" },
       body: JSON.stringify({ type, title, date, dueDate, notes }),
     });
     const result: unknown = await response.json().catch(() => null);
     if (!response.ok) {
       const message =
         typeof result === "object" && result !== null && "error" in result &&
         typeof result.error === "string"
           ? result.error
           : `Unable to save medical record (${response.status}).`;
       throw new Error(message);
     }
     if (typeof result !== "object" || result === null || !("record" in result)) {
       throw new Error("The server returned an invalid medical record.");
     }
     const createdRecord = result.record;
     if (
       typeof createdRecord !== "object" || createdRecord === null ||
       !("id" in createdRecord) || typeof createdRecord.id !== "string" ||
       !("type" in createdRecord) || !["vaccination", "medication", "allergy", "visit"].includes(String(createdRecord.type)) ||
       !("title" in createdRecord) || typeof createdRecord.title !== "string" ||
       !("date" in createdRecord) || typeof createdRecord.date !== "string" ||
       !("notes" in createdRecord) || typeof createdRecord.notes !== "string" ||
       !("dueDate" in createdRecord) || (createdRecord.dueDate !== null && typeof createdRecord.dueDate !== "string")
     ) {
       throw new Error("The server returned an invalid medical record.");
     }
     const created: PetCareRecord = {
       id: createdRecord.id,
       type: createdRecord.type as PetCareRecord["type"],
       title: createdRecord.title,
       date: createdRecord.date,
       dueDate: createdRecord.dueDate,
       notes: createdRecord.notes,
     };
     setRecords((current) => [created, ...current]);
     setRecordsError("");
     setRecordFormOpen(false);
    } catch (error) {
     setRecordsError(error instanceof Error ? error.message : "Unable to save medical record.");
    } finally {
     setSavingRecord(false);
    }
  };

  const saveHealthNotes = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setHealthNotes({
      allergies: String(formData.get("allergies") ?? "").trim(),
      medications: String(formData.get("medications") ?? "").trim(),
    });
    setHealthEditing(false);
  };

  return (
    <FeedColumn className="pawly-pet-profile-page">
      <img className="pawly-pet-hero" src={pet.image} alt={pet.name} loading="lazy" decoding="async" />
      <div className="pawly-pet-profile-title">
        <div>
          <span className="pawly-page-kicker">PET PROFILE</span>
          <h1>{pet.name}</h1>
          <p>
            {pet.breed} <span>·</span> {pet.age}
          </p>
        </div>
        <button className="pawly-secondary-button" onClick={onEdit}>
          Edit pet
        </button>
      </div>
      <div className="pawly-profile-section">
        <div className="pawly-care-history-heading">
          <h2>Care history</h2>
          <button className="pawly-secondary-button" onClick={() => setRecordFormOpen((open) => !open)}>
            {recordFormOpen ? "Cancel" : <><IconPlus size={15} /> Add record</>}
          </button>
        </div>
        {recordFormOpen && (
          <form className="pawly-care-record-form" onSubmit={saveCareRecord}>
            <label>
              Record type
              <select name="type" defaultValue="visit" required>
                <option value="vaccination">Vaccination</option>
                <option value="medication">Medication</option>
                <option value="allergy">Allergy</option>
                <option value="visit">Vet visit</option>
              </select>
            </label>
            <label>
              Record title
              <input name="title" required maxLength={120} placeholder="e.g. Annual health check" />
            </label>
            <label>
              Date
              <input name="date" type="date" required />
            </label>
            <label>
              Due date or next dose
              <input name="dueDate" type="date" />
            </label>
            <label>
              Notes
              <textarea name="notes" maxLength={2000} rows={3} placeholder="Add details to remember" />
            </label>
            <button className="pawly-primary-button" type="submit" disabled={savingRecord}>
              {savingRecord ? "Saving…" : "Save record"}
            </button>
          </form>
        )}
        {recordsError && <p className="pawly-inline-error" role="alert">{recordsError}</p>}
        {recordsLoading ? (
          <p role="status">Loading medical records…</p>
        ) : timeline.length ? (
          <div className="pawly-care-timeline">
            {timeline.map((record) => (
              <article className="pawly-care-record" key={`${record.type}-${record.id}`}>
                <span className={`pawly-care-record-icon ${record.type}`}>
                  {"category" in record ? <IconPaw size={17} /> : <IconCalendar size={17} />}
                </span>
                <div>
                  <strong>{record.title}</strong>
                  <span>
                    {"category" in record ? `${record.category} · ` : ""}
                    {record.notes || "Care note"}
                  </span>
                  <small>{formatPetCareDate(record.date)}</small>
                  {"category" in record && record.dueDate && (
                    <small>Due {formatPetCareDate(record.dueDate)}</small>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="pawly-empty-state">
            <IconCalendar size={22} />
            <strong>No care history yet</strong>
            <span>Completed appointments and your care notes will appear here.</span>
          </div>
        )}
      </div>
      <div className="pawly-profile-section">
        <div className="pawly-health-heading">
          <h2>Health notes</h2>
          <button className="pawly-secondary-button" onClick={() => setHealthEditing((editing) => !editing)}>
            {healthEditing ? "Cancel" : "Edit"}
          </button>
        </div>
        {healthEditing ? (
          <form className="pawly-health-form" onSubmit={saveHealthNotes}>
            <label>
              Allergies
              <input name="allergies" maxLength={200} defaultValue={healthNotes.allergies} placeholder="None known" />
            </label>
            <label>
              Medications
              <input name="medications" maxLength={200} defaultValue={healthNotes.medications} placeholder="None added" />
            </label>
            <button className="pawly-primary-button" type="submit">Save health notes</button>
          </form>
        ) : (
          <>
            <div className="pawly-health-row">
              <span>Allergies</span>
              <strong>{healthNotes.allergies || "None added"}</strong>
            </div>
            <div className="pawly-health-row">
              <span>Medications</span>
              <strong>{healthNotes.medications || "None added"}</strong>
            </div>
          </>
        )}
      </div>
    </FeedColumn>
  );
}

function PetsPage({
  pets,
  onSelect,
  onAdd,
}: {
  pets: Pet[];
  onSelect: (pet: Pet) => void;
  onAdd: () => void;
}) {
  return (
    <FeedColumn>
      <div className="pawly-page-actions">
        <button className="pawly-primary-button" onClick={onAdd}>
          <IconPlus size={17} /> Add pet
        </button>
      </div>
      {pets.length ? (
        <div className="pawly-pets-grid">
          {pets.map((pet) => (
            <button
              key={pet.id}
              className="pawly-pet-grid-card"
              onClick={() => onSelect(pet)}
            >
              <img className="pawly-pet-card-cover" src={pet.image} alt={pet.name} loading="lazy" decoding="async" />
              <span className="pawly-provider-card-body pawly-pet-card-body">
                <strong className="pawly-provider-name">{pet.name}</strong>
                <small className="pawly-provider-type">{pet.breed}</small>
                <span className="pawly-provider-meta">
                  <span><IconCalendar size={14} /> {pet.age}</span>
                  <span>View profile <IconArrowRight size={13} /></span>
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyPet onAdd={onAdd} />
      )}
    </FeedColumn>
  );
}

function EmptyPet({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="pawly-empty-state pawly-empty-pet">
      <IconPaw size={28} />
      <strong>You haven’t added a pet yet.</strong>
      <span>Add your first pet to start managing appointments and care.</span>
      <button className="pawly-primary-button" onClick={onAdd}>
        <IconPlus size={16} /> Add your first pet
      </button>
    </div>
  );
}

function FeedPostComposer({
  pets,
  user,
  onNotify,
  textareaRef,
  onPost,
}: {
  pets: Pet[];
  user: AuthenticatedUser | null;
  onNotify: (message: string) => void;
  textareaRef: (element: HTMLTextAreaElement | null) => void;
  onPost: (post: FeedPost, media: SelectedPostMedia[]) => Promise<void>;
}) {
  const mediaInputId = "pawly-feed-media-input";
  const [caption, setCaption] = useState("");
  const [petId, setPetId] = useState(pets[0]?.id ?? "");
  const [media, setMedia] = useState<SelectedPostMedia[]>([]);
  const mediaUrlsRef = useRef(new Set<string>());
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const selected = pets.find((pet) => pet.id === petId);
  useEffect(() => () => {
    mediaUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    mediaUrlsRef.current.clear();
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caption.trim() || publishing) return;
    const firstImage = media.find((item) => item.type.startsWith("image/"));
    setPublishError("");
    setPublishing(true);
    try {
      await onPost({
        id: `local-${Date.now()}`,
        userId: user?.id,
        name: user?.name || "You",
        handle: user?.email.split("@")[0] || "you",
        pet: selected?.name,
        time: "now",
        createdAt: new Date().toISOString(),
        text: caption.trim(),
        imageAlt: firstImage?.name || "New pet post",
        likes: 0,
        comments: 0,
        avatar: user?.picture || "",
        provider: user?.role === "provider",
      }, media);
      media.forEach((item) => URL.revokeObjectURL(item.url));
      mediaUrlsRef.current.clear();
      setCaption("");
      setMedia([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your post.";
      setPublishError(message);
      onNotify(message);
    } finally {
      setPublishing(false);
    }
  };
  return (
    <section className="pawly-feed-composer" aria-label="Create a post">
      <form className="pawly-post-composer-form" onSubmit={submit}>
        {publishError && (
          <p className="pawly-post-publish-error" role="alert">
            {publishError}
          </p>
        )}
        <div className="pawly-post-composer">
          <div className="pawly-post-composer-input">
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="What’s happening with your pet?"
              aria-label="Post caption"
              required
              rows={2}
            />
          </div>
          {media.length > 0 && (
            <div className="pawly-composer-media-grid" aria-label="Selected media">
              {media.map((item, index) => (
                <div className="pawly-composer-media-item" key={`${item.url}-${index}`}>
                  {item.type.startsWith("video/") ? (
                    <video src={item.url} muted autoPlay loop playsInline aria-label={item.name} />
                  ) : (
                    <img src={item.url} alt={item.name} />
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => {
                      URL.revokeObjectURL(item.url);
                      mediaUrlsRef.current.delete(item.url);
                      setMedia((current) => current.filter((selectedMedia) => selectedMedia.url !== item.url));
                    }}
                  >
                    <IconX size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="pawly-post-composer-toolbar">
            <label
              className="pawly-composer-tool"
              htmlFor={mediaInputId}
              aria-label="Add a photo or video"
            >
              <IconPlus size={24} />
              <input
                id={mediaInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                multiple
                aria-label="Choose photos or videos from your device"
                onChange={(event) => {
                  const input = event.currentTarget;
                  const files = Array.from(input.files ?? []);
                  input.value = "";
                  if (media.length + files.length > 5) {
                    onNotify("A post can include up to 5 photos or videos.");
                    return;
                  }
                  const supportedTypes = new Set([
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/gif",
                    "video/mp4",
                    "video/webm",
                    "video/quicktime",
                  ]);
                  const supportedExtensions = new Set([
                    "jpg",
                    "jpeg",
                    "png",
                    "webp",
                    "gif",
                    "mp4",
                    "webm",
                    "mov",
                  ]);
                  const isSupported = (file: File) => {
                    const extension = file.name.split(".").pop()?.toLowerCase();
                    return supportedTypes.has(file.type) ||
                      (extension !== undefined && supportedExtensions.has(extension));
                  };
                  if (files.some((file) => !isSupported(file))) {
                    onNotify("Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV media.");
                    return;
                  }
                  if (files.some((file) => file.size > 3 * 1024 * 1024)) {
                    onNotify("Each photo or video must be smaller than 3 MB.");
                    return;
                  }
                  if (
                    media.reduce((total, item) => total + item.file.size, 0) +
                      files.reduce((total, file) => total + file.size, 0) >
                    40 * 1024 * 1024
                  ) {
                    onNotify("All post media combined must be smaller than 40 MB.");
                    return;
                  }
                  const nextMedia = files.map((file) => {
                    const url = URL.createObjectURL(file);
                    mediaUrlsRef.current.add(url);
                    return { file, url, type: file.type, name: file.name };
                  });
                  if (nextMedia.length) setMedia((current) => [...current, ...nextMedia]);
                }}
              />
            </label>
            <label className="pawly-form-label pawly-post-pet-select">
              Share with
              <select
                value={petId}
                onChange={(event) => setPetId(event.target.value)}
                aria-label="Choose a pet for this post"
              >
                <option value="">Myself</option>
                {pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="pawly-post-submit"
              type="submit"
              aria-label="Publish post"
              disabled={!caption.trim() || publishing}
            >
              <img className="pawly-post-send-icon" src="/icons/send.png" alt="" aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function AddPetModal({
  onClose,
  onSave,
  onError,
}: {
  onClose: () => void;
  onSave: (pet: Pet, photo?: File) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const [photo, setPhoto] = useState<{ url: string; name: string; file: File } | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const species = String(form.get("species") ?? "Dog");
    void Promise.resolve(onSave({
      id: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name,
      breed: String(form.get("breed") ?? "") || species,
      age: "New pet",
      image: photo?.url ?? "",
    }, photo?.file)).catch((error: unknown) => {
      onError(error instanceof Error ? error.message : "Unable to save your pet.");
    });
  };
  return (
    <div
      className="pawly-modal-backdrop pawly-add-pet-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="pawly-modal pawly-pet-modal pawly-add-pet-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add a pet"
      >
        <header>
          <button
            className="pawly-icon-button pawly-add-pet-close"
            aria-label="Close"
            onClick={onClose}
          >
            <img src="/exit.png" alt="" aria-hidden="true" />
          </button>
        </header>
        <form onSubmit={submit}>
          <label>
            Pet name
            <input name="name" required />
          </label>
          <div className="pawly-form-grid">
            <label>
              Species
              <select name="species">
                <option>Dog</option>
                <option>Cat</option>
                <option>Bird</option>
                <option>Rabbit</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Breed
              <input name="breed" />
            </label>
          </div>
          <div className="pawly-pet-photo-picker">
            <span>Pet photo</span>
            <label
              className="pawly-pet-photo-trigger"
              aria-label="Choose a pet photo from your device"
            >
              <img src="/menuicons/pet.png" alt="" aria-hidden="true" />
              <input
                name="photoFile"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      event.currentTarget.value = "";
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result !== "string") {
                        onError("Unable to load this pet photo. Please try another image.");
                        return;
                      }
                      setPhoto({ url: reader.result, name: file.name, file });
                  };
                  reader.onerror = () => onError("Unable to load this pet photo. Please try another image.");
                  reader.readAsDataURL(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {photo && (
            <div className="pawly-pet-photo-preview">
              <img src={photo.url} alt={`Selected pet photo: ${photo.name}`} />
              <button
                type="button"
                aria-label="Remove selected pet photo"
                onClick={() => {
                  setPhoto(null);
                }}
              >
                <IconX size={16} />
              </button>
            </div>
          )}
          <div className="pawly-modal-actions">
            <button
              type="button"
              className="pawly-secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="pawly-primary-button" type="submit">
              Save pet
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
