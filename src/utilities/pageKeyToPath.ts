// pageKey convention: 'home' → '' (site root), anything else → '/<pageKey>'.
// Single source of truth for how a page-content document maps onto a route,
// shared by revalidation and SEO URL generation.
export const pageKeyToPath = (pageKey: string) => (pageKey === 'home' ? '' : `/${pageKey}`)
