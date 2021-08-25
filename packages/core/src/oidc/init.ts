import Koa from 'koa';
import mount from 'koa-mount';
import { Provider } from 'oidc-provider';
import postgresAdapter from '@/oidc/adapter';

import { fromKeyLike } from 'jose/jwk/from_key_like';
import { findUserById } from '@/queries/user';
import { routes } from '@/routes/consts';
import { issuer, privateKey } from './consts';

export default async function initOidc(app: Koa): Promise<Provider> {
  const keys = [await fromKeyLike(privateKey)];
  const cookieConfig = Object.freeze({
    sameSite: 'lax',
    path: '/',
    signed: true,
  } as const);
  const oidc = new Provider(issuer, {
    adapter: postgresAdapter,
    renderError: (ctx, out, error) => {
      console.log('OIDC error', error);
    },
    cookies: {
      // V2: Rotate this when necessary
      // https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#cookieskeys
      keys: ['LOGTOSEKRIT1'],
      long: cookieConfig,
      short: cookieConfig,
    },
    jwks: {
      keys,
    },
    features: {
      revocation: { enabled: true },
      introspection: { enabled: true },
      devInteractions: { enabled: false },
      resourceIndicators: {
        enabled: true,
        getResourceServerInfo: () => ({ scope: '', accessTokenFormat: 'jwt' }),
      },
    },
    interactions: {
      url: (_, interaction) => {
        switch (interaction.prompt.name) {
          case 'login':
            return routes.signIn.credentials;
          case 'consent':
            return routes.signIn.consent;
          default:
            throw new Error(`Prompt not supported: ${interaction.prompt.name}`);
        }
      },
    },
    clientBasedCORS: (_, origin) => {
      console.log('origin', origin);
      return origin.startsWith('http://localhost:3000');
    },
    findAccount: async (ctx, sub) => {
      await findUserById(sub);

      return {
        accountId: sub,
        claims: async (use, scope, claims, rejected) => {
          console.log('use:', use);
          console.log('scope:', scope);
          console.log('claims:', claims);
          console.log('rejected:', rejected);
          return { sub };
        },
      };
    },
  });
  app.use(mount('/oidc', oidc.app));
  return oidc;
}