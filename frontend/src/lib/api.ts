export function api(path: string) {
  return `/api/${path.replace(/^\/+/, '')}`
}
