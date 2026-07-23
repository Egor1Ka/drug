// Public API of the case-studies feature —
// pages import ONLY from '@frontend/_features/case-studies'.

export { CaseStudyArchive } from './ui/CaseStudyArchive'
export { CaseStudyCard, type CaseStudyCardItem } from './ui/CaseStudyCard'
export { CaseStudySnapshot } from './ui/CaseStudySnapshot'
export { CaseStudyListingLayout } from './ui/CaseStudyListingLayout'
export { CaseStudyPostLayout } from './ui/CaseStudyPostLayout'
export { CaseStudyCta } from './ui/CaseStudyCta'

export {
  CASE_STUDY_CARD_SELECT,
  fetchAllCaseStudies,
  fetchAllCaseStudySlugs,
  fetchCaseStudyBySlug,
} from './api/case-studies'
