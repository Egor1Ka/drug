// Client-safe public API of the feature: everything except the server-only
// fetchPublishedDocuments (payload + node), which must not enter the client
// bundle. Client components import from here, server code from './index'.
export { DocumentGateProvider, useDocumentGate } from './ui/DocumentGateProvider'
export { GetPdfButton } from './ui/GetPdfButton'
