// Client-safe public API of the feature: everything except the server-only
// fetchPublishedJournals (payload + node), which must not enter the client
// bundle. Client components import from here, server code from './index'.
export { DownloadJournalButton } from './ui/DownloadJournalButton'
