import type { AppConfig } from '../app/core/config/models/app-config';

export const environment: AppConfig = {
  production: false,
  apiUrl: 'https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/dev',
  cognitoDomain: 'https://familyledger-dev-YOUR_ACCOUNT_ID.auth.YOUR_REGION.amazoncognito.com',
  cognitoClientId: 'YOUR_COGNITO_WEB_CLIENT_ID',
  callbackUrl: 'http://localhost:4200/auth/callback',
  logoutUrl: 'http://localhost:4200/auth/logout',
};
