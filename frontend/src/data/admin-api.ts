import { getApiUrl, postApi } from "./api";

export type AdminRole = "admin" | "superadmin";

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: "active" | "suspended";
  avatar?: string;
  mustChangePassword: boolean;
};

export type AdminSession = {
  email: string;
  role: AdminRole;
  token: string;
  account: AdminAccount;
};

export type AdminDashboardData = {
  profile: AdminAccount;
  users: {
    id: string;
    name: string;
    email: string;
    location: string;
    avatar: string;
    type: "Pet owner" | "Provider";
    status: "active" | "suspended";
    verified: boolean;
  }[];
  projects: {
    id: string;
    name: string;
    category: string;
    description: string;
    region: string;
    members: number;
    status: "active" | "paused";
  }[];
  requests: {
    id: string;
    name: string;
    email: string;
    category: string;
    location: string;
    countryCode: string;
    license: string;
    status: "pending" | "needs-info";
  }[];
  reports: {
    id: string;
    postId: string;
    author: string;
    reason: string;
    excerpt: string;
    reportedBy: string;
    time: string;
  }[];
  team: AdminAccount[];
};

export const adminDataResources = [
  { id: "users", label: "User accounts" },
  { id: "providers", label: "Provider records" },
  { id: "pets", label: "Pets" },
  { id: "medical-records", label: "Pet medical records" },
  { id: "appointments", label: "Appointments" },
  { id: "account-data", label: "Private account data" },
  { id: "conversations", label: "Conversations" },
  { id: "messages", label: "Messages" },
  { id: "follows", label: "Follow relationships" },
  { id: "posts", label: "Posts" },
  { id: "reviews", label: "Provider reviews" },
  { id: "reports", label: "Content reports" },
  { id: "projects", label: "Admin projects" },
  { id: "lost-found", label: "Lost-and-found alerts" },
  { id: "adoptions", label: "Adoption listings" },
  { id: "adoption-applications", label: "Adoption applications" },
  { id: "saved-posts", label: "Saved posts" },
  { id: "provider-availability", label: "Provider availability" },
  { id: "admin-accounts", label: "Admin accounts" },
] as const;

export type AdminDataResource = (typeof adminDataResources)[number]["id"];

export type AdminDataPage = {
  resource: AdminDataResource;
  page: number;
  pageSize: number;
  total: number;
  records: Record<string, unknown>[];
};

export type AdminModerationReview = {
  id: string;
  providerName: string;
  reviewerName: string;
  rating: number;
  text: string;
  createdAt: string;
};

const sessionKey = "pawly-admin-session";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getAdminData(
  resource: AdminDataResource,
  page: number,
  signal?: AbortSignal,
): Promise<AdminDataPage> {
  const session = getAdminSession();
  if (!session) throw new Error("Your admin session has expired. Sign in again.");

  const url = getApiUrl("admin/data");
  url.searchParams.set("resource", resource);
  url.searchParams.set("page", String(page));
  const response = await fetch(url, {
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.token}`,
    },
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      clearAdminSession();
      window.location.assign("/admin/login");
    }
    const message = typeof result === "object" && result && "error" in result && typeof result.error === "string"
      ? result.error
      : `Unable to load admin records (${response.status}).`;
    throw new Error(message);
  }
  if (
    typeof result !== "object" ||
    result === null ||
    !("resource" in result) ||
    result.resource !== resource ||
    !("page" in result) ||
    typeof result.page !== "number" ||
    !("pageSize" in result) ||
    typeof result.pageSize !== "number" ||
    !("total" in result) ||
    typeof result.total !== "number" ||
    !("records" in result) ||
    !Array.isArray(result.records) ||
    !result.records.every(isObjectRecord)
  ) {
    throw new Error("The server returned invalid admin record data.");
  }

  return result as AdminDataPage;
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const session = getAdminSession();
  if (!session) throw new Error("Your admin session has expired. Sign in again.");

  const response = await fetch(getApiUrl("admin/dashboard"), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.token}`,
    },
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      clearAdminSession();
      window.location.assign("/admin/login");
    }
    const message = typeof result === "object" && result && "error" in result && typeof result.error === "string"
      ? result.error
      : `Unable to load admin dashboard (${response.status}).`;
    throw new Error(message);
  }
  return result as AdminDashboardData;
}

export async function getAdminReviews(signal?: AbortSignal): Promise<AdminModerationReview[]> {
  const session = getAdminSession();
  if (!session) throw new Error("Your admin session has expired. Sign in again.");

  const response = await fetch(getApiUrl("admin/reviews"), {
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.token}`,
    },
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      clearAdminSession();
      window.location.assign("/admin/login");
    }
    const message = typeof result === "object" && result && "error" in result && typeof result.error === "string"
      ? result.error
      : `Unable to load reviews (${response.status}).`;
    throw new Error(message);
  }
  if (
    typeof result !== "object" ||
    result === null ||
    !("reviews" in result) ||
    !Array.isArray(result.reviews)
  ) {
    throw new Error("The server returned invalid review moderation data.");
  }

  return result.reviews.filter((review): review is AdminModerationReview =>
    isObjectRecord(review) &&
    typeof review.id === "string" &&
    typeof review.providerName === "string" &&
    typeof review.reviewerName === "string" &&
    typeof review.rating === "number" &&
    typeof review.text === "string" &&
    typeof review.createdAt === "string",
  );
}

export async function performAdminAction<T = { ok: boolean }>(
  resource: string,
  body: unknown,
): Promise<T> {
  const session = getAdminSession();
  if (!session) throw new Error("Your admin session has expired. Sign in again.");
  try {
    return await postApi<T>(resource, body, session.token);
  } catch (error) {
    if (error instanceof Error && error.message.includes("(401)")) {
      clearAdminSession();
      window.location.assign("/admin/login");
    }
    throw error;
  }
}

export async function uploadAdminAvatar(avatar: string): Promise<string> {
  const result = await performAdminAction<{ avatar: string }>("admin/profile/avatar", { avatar });
  return result.avatar;
}

export function getAdminAccounts(): AdminAccount[] {
  const session = getAdminSession();
  return session ? [session.account] : [];
}

export function getAdminSession(): AdminSession | null {
  try {
    const stored = sessionStorage.getItem(sessionKey);
    if (!stored) return null;
    const session = JSON.parse(stored) as AdminSession;
    return session.token && session.account?.email === session.email ? session : null;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  sessionStorage.removeItem(sessionKey);
}

export async function updateAdminAccountStatus(
  email: string,
  status: "active" | "suspended",
): Promise<void> {
  const session = getAdminSession();
  if (!session) throw new Error("Sign in before managing admin accounts.");
  await postApi("admin/accounts/status", { email, status }, session.token);
}

export async function createAdminAccount(input: {
  email: string;
  temporaryPassword: string;
  role: AdminRole;
}): Promise<AdminAccount> {
  const session = getAdminSession();
  if (!session || session.account.role !== "superadmin") {
    throw new Error("Sign in as a superadmin before creating admin accounts.");
  }

  const result = await postApi<{ account: AdminAccount }>(
    "admin/accounts",
    input,
    session?.token,
  );
  return result.account;
}

export async function logoutAdmin(): Promise<void> {
  const session = getAdminSession();
  if (!session) return;
  await postApi("admin/logout", {}, session.token);
}

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AdminAccount | null> {
  const result = await postApi<{ session: AdminSession }>("admin/login", {
    email,
    password,
  });
  sessionStorage.setItem(sessionKey, JSON.stringify(result.session));
  return result.session.account;
}

export async function changeAdminPassword(nextPassword: string): Promise<void> {
  const session = getAdminSession();
  if (!session) throw new Error("Your admin session has expired. Sign in again.");

  const result = await postApi<{ session: AdminSession }>(
    "admin/password",
    { password: nextPassword },
    session.token,
  );
  sessionStorage.setItem(sessionKey, JSON.stringify(result.session));
}
