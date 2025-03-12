import { init as initLD } from '@launchdarkly/cloudflare-server-sdk';

let kvReadCount = 0;
let cachedFlags = null;

// Simple KV wrapper that counts reads and uses cache
const createKVWrapper = (kv) => {
  return new Proxy(kv, {
    get: (target, prop) => {
      const original = target[prop];
      if (typeof original === 'function') {
        return async (...args) => {
          if (prop === 'get') {
            // If we have cached data, use it
            if (cachedFlags) {
              return cachedFlags;
            }
            
            // Otherwise do the KV read and cache it
            kvReadCount++;
            const value = await original.apply(target, args);
            if (value) {
              cachedFlags = value;
            }
            return value;
          }
          
          if (prop === 'list') {
            kvReadCount++;
            return original.apply(target, args);
          }
          
          return original.apply(target, args);
        };
      }
      return original;
    }
  });
};

export default {
  async fetch(request, env, ctx) {
    const clientSideID = env.LD_CLIENT_SIDE_ID;
    const flagKey = 'fun-flag';
    // const { searchParams } = new URL(request.url);

    console.log('Environment setup:', {
      clientSideID,
      hasKV: !!env.LD_KV,
      url: request.url,
      method: request.method
    });

    // Reset counters and cache for each request
    kvReadCount = 0;
    cachedFlags = null;

    try {
      const wrappedKV = createKVWrapper(env.LD_KV);
      const ldClient = initLD(clientSideID, wrappedKV, { sendEvents: true });
      await ldClient.waitForInitialization();
      
      // const email = searchParams.get('email') ?? 'test@anymail.com';
      const context = { kind: 'user', key: 'test-user-key-1' };
      
      console.log('Evaluating flag:', flagKey);
      // const flagValue = await ldClient.variation(flagKey, context, false);
      // const flagDetail = await ldClient.variationDetail(flagKey, context, false);
      const allFlags = await ldClient.allFlagsState(context);

      ctx.waitUntil(
        ldClient.flush((err, res) => {
          console.log(`Event flush completed:`, { success: !!res, error: err });
          ldClient.close();
        }),
      );

      return new Response(JSON.stringify({
        environment: {
          clientSideID,
          hasKV: !!env.LD_KV
        },
        kvReadOperations: kvReadCount,
        // flagValue,
        // flagDetail,
        allFlags
      }, null, 2));

    } catch (error) {
      console.error('Operation failed:', {
        error: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      return new Response(JSON.stringify({
        error: error.message,
        stack: error.stack,
        type: error.constructor.name,
        kvReadOperations: kvReadCount
      }, null, 2), { status: 500 });
    }
  },
};
