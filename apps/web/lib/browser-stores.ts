export const STORE_URLS = {
  chrome: "https://chromewebstore.google.com/detail/mngnmhdbilfebcejgicplbgjnnejejbn",
  edge: "https://microsoftedge.microsoft.com/addons/detail/gfomnnahmcpfnibkcfdfamcfbcacojlf"
} as const;

export type BrowserStore = keyof typeof STORE_URLS;
