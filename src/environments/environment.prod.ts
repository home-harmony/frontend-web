import type { AppConfig } from '../app/core/config/app-config';

export const environment: AppConfig = {
  production: true,
  apiUrl: 'https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod',
  cognitoDomain: 'https://familyledger-prod-YOUR_ACCOUNT_ID.auth.YOUR_REGION.amazoncognito.com',
  cognitoClientId: 'YOUR_COGNITO_WEB_CLIENT_ID',
  callbackUrl: 'https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net/auth/callback',
  logoutUrl: 'https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net/auth/logout',
};
