// テスト環境（velocity-cup-staging）へデプロイする。
// @cloudflare/vite-plugin はビルド時の CLOUDFLARE_ENV で wrangler.jsonc の env を選び、
// その結果を dist/ の wrangler.json に書き出す。wrangler deploy はそのファイルを使う。
// Windows でも動くように、環境変数は cross-env ではなくこのスクリプトで渡す。
import { execSync } from "node:child_process";

const run = (command, env = process.env) => execSync(command, { stdio: "inherit", env });

run("npm run build", { ...process.env, CLOUDFLARE_ENV: "staging" });
run("node scripts/clean-appledouble.mjs");
// ビルド結果はすでにテスト環境用なので、ここでは CLOUDFLARE_ENV を渡さない。
run("npx wrangler deploy");
