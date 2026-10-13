import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDirectory, "../php-api/.env");

function parseEnv(contents) {
  const values = new Map();
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith("#")) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    values.set(match[1], value);
  }
  return values;
}

function isStrongPassword(value, minimumLength) {
  return value.length >= minimumLength && new Set(value).size >= Math.min(16, minimumLength);
}

let contents;
try {
  contents = await readFile(envPath, "utf8");
} catch {
  console.error("Production preflight failed: backend/php-api/.env is missing.");
  console.error("Copy php-api/.env.example to php-api/.env, set real production values, and retry.");
  process.exit(1);
}

const env = parseEnv(contents);
const errors = [];
const required = (key) => {
  const value = env.get(key)?.trim() ?? "";
  if (!value || /^(?:change.?me|replace.?me|url_safe_[a-z_]+|your_.*)$/i.test(value)) {
    errors.push(`${key} must be configured with a real value.`);
  }
  return value;
};

if (required("APP_ENV") !== "production") {
  errors.push("APP_ENV must be exactly production.");
}

const appOrigin = required("APP_ORIGIN");
let originUrl;
try {
  originUrl = new URL(appOrigin);
  if (
    originUrl.protocol !== "https:" ||
    originUrl.username ||
    originUrl.password ||
    originUrl.pathname !== "/" ||
    originUrl.search ||
    originUrl.hash
  ) {
    errors.push("APP_ORIGIN must be the public HTTPS origin only, for example https://pawly.example.");
  }
} catch {
  errors.push("APP_ORIGIN must be a valid public HTTPS origin.");
}

const apiOrigin = (env.get("API_ORIGIN")?.trim() || (env.get("APP_ENV") === "production" ? required("API_ORIGIN") : appOrigin));
let apiOriginUrl;
try {
  apiOriginUrl = new URL(apiOrigin);
  if (
    apiOriginUrl.protocol !== "https:" ||
    apiOriginUrl.username ||
    apiOriginUrl.password ||
    apiOriginUrl.pathname !== "/" ||
    apiOriginUrl.search ||
    apiOriginUrl.hash
  ) {
    errors.push("API_ORIGIN must be the public HTTPS API origin only, for example https://pawly-api.onrender.com.");
  }
} catch {
  errors.push("API_ORIGIN must be a valid public HTTPS origin.");
}

const redirectUri = required("GOOGLE_REDIRECT_URI");
if (apiOriginUrl) {
  const expectedRedirect = new URL("/api/auth/google/callback", apiOriginUrl).toString();
  if (redirectUri !== expectedRedirect) {
    errors.push("GOOGLE_REDIRECT_URI must match API_ORIGIN/api/auth/google/callback exactly.");
  }
}
for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) required(key);
if (!["Lax", "None"].includes(required("SESSION_SAME_SITE"))) {
  errors.push("SESSION_SAME_SITE must be Lax for same-site hosting or None when Firebase and the API use different sites.");
}

const database = required("MONGODB_DATABASE");
if (!/^[A-Za-z0-9_-]{1,63}$/.test(database)) {
  errors.push("MONGODB_DATABASE must contain only letters, numbers, underscores, or hyphens (max 63 characters).");
}
const appUsername = required("MONGODB_USERNAME");
const appPassword = required("MONGODB_PASSWORD");
const rootUsername = required("MONGO_INITDB_ROOT_USERNAME");
const rootPassword = required("MONGO_INITDB_ROOT_PASSWORD");
if (!/^[A-Za-z0-9_-]+$/.test(appPassword)) {
  errors.push("MONGODB_PASSWORD must be URL-safe (letters, numbers, underscores, or hyphens).");
}
if (!isStrongPassword(appPassword, 48)) {
  errors.push("MONGODB_PASSWORD must be a unique, randomly generated value of at least 48 characters.");
}
if (!isStrongPassword(rootPassword, 48)) {
  errors.push("MONGO_INITDB_ROOT_PASSWORD must be a unique, randomly generated value of at least 48 characters.");
}
if (appPassword === rootPassword || appUsername === rootUsername) {
  errors.push("MongoDB application and root credentials must be different.");
}
required("MONGODB_URI");
const mongoUri = env.get("MONGODB_URI")?.trim() ?? "";
const mongoMatch = mongoUri.match(/^mongodb(?:\+srv)?:\/\/([^/?#]+)/i);
if (!mongoMatch) {
  errors.push("MONGODB_URI must be a valid authenticated mongodb:// or mongodb+srv:// URI.");
} else {
  const authority = mongoMatch[1];
  const separator = authority.lastIndexOf("@");
  const credentials = separator < 0 ? "" : authority.slice(0, separator);
  const colon = credentials.indexOf(":");
  if (colon < 1) {
    errors.push("MONGODB_URI must include the application database username and password.");
  } else {
    try {
      const uriUsername = decodeURIComponent(credentials.slice(0, colon));
      const uriPassword = decodeURIComponent(credentials.slice(colon + 1));
      if (uriUsername !== appUsername || uriPassword !== appPassword) {
        errors.push("MONGODB_URI credentials must match MONGODB_USERNAME and MONGODB_PASSWORD.");
      }
    } catch {
      errors.push("MONGODB_URI credentials must be correctly URL-encoded.");
    }
  }
}

const superadminEmail = required("SUPERADMIN_EMAIL");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(superadminEmail)) {
  errors.push("SUPERADMIN_EMAIL must be a valid email address.");
}
const superadminPassword = required("SUPERADMIN_PASSWORD");
if (!isStrongPassword(superadminPassword, 40)) {
  errors.push("SUPERADMIN_PASSWORD must be unique and randomly generated, with at least 40 characters.");
}
if ([appPassword, rootPassword].includes(superadminPassword)) {
  errors.push("SUPERADMIN_PASSWORD must be different from both MongoDB passwords.");
}

for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) required(key);

const bindAddress = env.get("PAWLY_BIND_ADDRESS")?.trim() || "127.0.0.1";
if (!["127.0.0.1", "::1", "localhost"].includes(bindAddress)) {
  errors.push("PAWLY_BIND_ADDRESS must be loopback-only; terminate public HTTPS at a trusted reverse proxy on this host.");
}

if (errors.length > 0) {
  console.error("Production preflight failed:");
  for (const error of errors) console.error(`- ${error}`);
  console.error("No secret values were printed. Update backend/php-api/.env and run npm run deploy:check again.");
  process.exit(1);
}

console.log("Production configuration checks passed.");
console.log("Before going live, verify DNS/TLS, firewall rules, OAuth console settings, backups, and a real sign-in/booking smoke test.");
