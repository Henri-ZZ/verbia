// One-off maintenance script: rename / describe a Waffo subscription product.
//
// Usage (run from repo root; reads WAFFO_* from .env.local):
//   node --env-file=.env.local scripts/waffo-rename.mjs --env test|prod --product monthly|annual --name "..." [--description "..."]
//
// Optionally override the product id with --product-id PROD_xxx (defaults to
// WAFFO_MONTHLY_PRODUCT_ID / WAFFO_ANNUAL_PRODUCT_ID). Never prints the key.
import { WaffoPancake } from "@waffo/pancake-ts";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const environment = arg("env");
const product = arg("product");
const name = arg("name");
const description = arg("description");
const productIdOverride = arg("product-id");

if (!["test", "prod"].includes(environment ?? "")) throw new Error("--env must be test or prod");
if (!["monthly", "annual"].includes(product ?? "")) throw new Error("--product must be monthly or annual");
if (!name) throw new Error("--name is required");
if (description === undefined) throw new Error("--description is required (pass empty string to clear)");

const merchantId = process.env.WAFFO_MERCHANT_ID;
const privateKey = process.env.WAFFO_PRIVATE_KEY;
if (!merchantId || !privateKey) throw new Error("WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY missing from .env.local");

const fallbackId = product === "monthly" ? process.env.WAFFO_MONTHLY_PRODUCT_ID : process.env.WAFFO_ANNUAL_PRODUCT_ID;
const id = productIdOverride ?? fallbackId;
if (!id) throw new Error(`No product id for --product ${product}; pass --product-id`);

const client = new WaffoPancake({ merchantId, privateKey, environment });
const { product: updated } = await client.subscriptionProducts.update({
  id,
  name,
  description // name/description only; never touches pricing or billing period
});
console.log(`[waffo] ${environment} ${id} -> name="${updated.name}" billingPeriod=${updated.billingPeriod} status=${updated.status}`);
