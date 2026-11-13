export function isChallenge(content: string): boolean {
  const page = content.toLowerCase();
  return [
    "just a moment",
    "cf-chl-",
    "performing security verification",
    "widget containing a cloudflare security challenge",
  ].some((marker) => page.includes(marker));
}
