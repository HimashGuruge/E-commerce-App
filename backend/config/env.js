import dotenv from "dotenv";
dotenv.config();

export const googleOAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${process.env.BACKEND_URL}/api/users/google`,
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
  scopes: ["profile", "email"],
};

export const appConfig = {
  frontendUrl: process.env.FRONTEND_URL,
  backendUrl: process.env.BACKEND_URL,
  jwtSecret: process.env.JWT_SECRET,
};

export const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
};

export const simConfig = {
  apiKey: process.env.SIM_API_KEY,
  workflowUrl: process.env.SIM_WORKFLOW_URL,
};

