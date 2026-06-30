export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // OpenAI direct integration
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // Self-hosted credentials
  appUsername: process.env.APP_USERNAME ?? "admin",
  appPassword: process.env.APP_PASSWORD ?? "",
  appPasswordHash: process.env.APP_PASSWORD_HASH ?? "",
  // Optional: Manus Forge API (for notifications if available)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
