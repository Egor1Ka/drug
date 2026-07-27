// Public API of the documents feature — routes import ONLY from
// '@frontend/_features/documents'.
export { DOCUMENTS_LIMIT, fetchPublishedDocuments } from './api/documents'
export { DocumentCard, type DocumentCardItem } from './ui/DocumentCard'
export { DocumentsArchive } from './ui/DocumentsArchive'
export { DocumentsCta } from './ui/DocumentsCta'
export { DocumentsListingLayout } from './ui/DocumentsListingLayout'
export * from './client'
