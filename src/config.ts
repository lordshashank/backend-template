export interface Config {
  port: number;
  databaseUrl: string;
  wsPort: number;
  errorpingBotToken?: string;
  errorpingChatId?: string;
  errorpingApiKey?: string;
  jwtSecret?: string;
  feedbackAdminKey?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  uploadMaxSize?: number;
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return {
    port: parseInt(process.env.PORT || "3001", 10),
    databaseUrl,
    wsPort: parseInt(process.env.WS_PORT || "3002", 10),
    errorpingBotToken: process.env.ERRORPING_BOT_TOKEN || undefined,
    errorpingChatId: process.env.ERRORPING_CHAT_ID || undefined,
    errorpingApiKey: process.env.ERRORPING_API_KEY || undefined,
    jwtSecret: process.env.JWT_SECRET || undefined,
    feedbackAdminKey: process.env.FEEDBACK_ADMIN_KEY || undefined,
    s3Bucket: process.env.S3_BUCKET || undefined,
    s3Region: process.env.S3_REGION || undefined,
    s3Endpoint: process.env.S3_ENDPOINT || undefined,
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || undefined,
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || undefined,
    uploadMaxSize: process.env.UPLOAD_MAX_SIZE
      ? parseInt(process.env.UPLOAD_MAX_SIZE, 10)
      : undefined,
  };
}
