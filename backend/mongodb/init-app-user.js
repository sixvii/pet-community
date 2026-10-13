const databaseName = process.env.MONGODB_DATABASE;
const username = process.env.MONGODB_USERNAME;
const password = process.env.MONGODB_PASSWORD;

if (!databaseName || !username || !password) {
  throw new Error("MongoDB application user configuration is incomplete.");
}

db.getSiblingDB(databaseName).createUser({
  user: username,
  pwd: password,
  roles: [{ role: "readWrite", db: databaseName }],
});
