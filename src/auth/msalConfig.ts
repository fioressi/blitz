import { PublicClientApplication } from '@azure/msal-browser';

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AAD_CLIENT_ID as string,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AAD_TENANT_ID as string}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage' as const,
    storeAuthStateInCookie: true, // IE11 / Safari ITP Fallback
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
