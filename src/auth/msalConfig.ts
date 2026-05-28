import { PublicClientApplication } from '@azure/msal-browser';

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AAD_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AAD_TENANT_ID as string}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage' as const,
  },
};

export const loginRequest = {
  scopes: [
    'User.Read',
    'Mail.Read',
    'Mail.ReadWrite',
    'Mail.Send',
    'Contacts.Read',
  ],
};

export type MsalInstance = PublicClientApplication;
