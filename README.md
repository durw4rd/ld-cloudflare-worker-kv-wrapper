## LaunchDarkly Cloudflare KV Worker Example

Simple Cloudflare worker example to show how to use LaunchDarkly Cloudflare SDKwith Cloudflare KV store.

This worker includes a KV store wrapper that counts the number of reads and caches the fetched data to avoid extra reads.

### How to run

1. Clone the repository
2. Update the `wrangler.jsonc` file with your own `LaunchDarkly client side ID` and `kv_namespaces` details. 
3. Run `npx wrangler dev --remote`
4. Make a request to the worker at `http://localhost:8787`. You should see the flag data printed on the screen together with the number of KV reads.

