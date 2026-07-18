export {
  fetchPageContent,
  getFaqSection,
  getLogosSection,
  getStatsSection,
  getTeamSection,
  getTestimonialsSection,
} from './api/pageContent'

export { FaqAccordion } from './ui/FaqAccordion'
export { LogoCarousel } from './ui/LogoCarousel'
export { StatsRow } from './ui/StatsRow'
export { TeamCards } from './ui/TeamCards'
export { TestimonialCards } from './ui/TestimonialCards'

export type {
  FaqSectionBlock,
  LogosSectionBlock,
  StatsSectionBlock,
  TeamSectionBlock,
  TestimonialsSectionBlock,
} from '@/payload-types'
