import type { Metadata } from 'next'

import { getTranslations, setRequestLocale } from 'next-intl/server'

import type { AppLocale } from '@/i18n/routing'
import {
  CtaBanner,
  HeroSection,
  HomeLayout,
  PressureCards,
  RequirementsList,
  SegmentTabs,
  VideoEmbed,
} from '@frontend/_features/home'
import {
  buildPageMetadata,
  FaqAccordion,
  fetchPageContent,
  getFaqSection,
  getLogosSection,
  getStatsSection,
  getTeamSection,
  getTestimonialsSection,
  LogoCarousel,
  StatsRow,
  TeamCards,
  TestimonialCards,
} from '@frontend/_features/page-content'
import { Show } from '@frontend/_shared/ui/Show'

const HOME_PAGE_KEY = 'home'
const PRODUCT_VIDEO_ID = 'FFO0DnD-zpw'

type Args = {
  params: Promise<{ locale: AppLocale }>
}

export default async function HomePage({ params }: Args) {
  const { locale } = await params

  setRequestLocale(locale)

  const t = await getTranslations('Home')
  const content = await fetchPageContent(HOME_PAGE_KEY, locale)

  const logos = getLogosSection(content, 'client-logos')
  const stats = getStatsSection(content, 'platform-stats')
  const team = getTeamSection(content, 'management-team')
  const testimonials = getTestimonialsSection(content, 'testimonials-main')
  const faqMain = getFaqSection(content, 'faq-main')
  const faqSecondary = getFaqSection(content, 'faq-secondary')

  return (
    <HomeLayout>
      <HomeLayout.Hero>
        <HeroSection />
        <VideoEmbed title={t('video.title')} videoId={PRODUCT_VIDEO_ID} />
      </HomeLayout.Hero>
      <Show when={!!logos}>
        <HomeLayout.Logos>
          <LogoCarousel section={logos!} />
        </HomeLayout.Logos>
      </Show>
      <HomeLayout.Pressures>
        <PressureCards />
      </HomeLayout.Pressures>
      <HomeLayout.Requirements>
        <RequirementsList />
      </HomeLayout.Requirements>
      <Show when={!!stats}>
        <HomeLayout.Stats>
          <StatsRow heading={t('stats.heading')} section={stats!} />
        </HomeLayout.Stats>
      </Show>
      <Show when={!!team}>
        <HomeLayout.Team>
          <TeamCards section={team!} />
        </HomeLayout.Team>
      </Show>
      <HomeLayout.Segments>
        <SegmentTabs />
      </HomeLayout.Segments>
      <Show when={!!testimonials}>
        <HomeLayout.Testimonials>
          <TestimonialCards section={testimonials!} subtitle={t('testimonials.subtitle')} />
        </HomeLayout.Testimonials>
      </Show>
      <Show when={!!faqMain}>
        <HomeLayout.Faq heading={t('faq.heading')}>
          <FaqAccordion section={faqMain!} />
          <Show when={!!faqSecondary}>
            <FaqAccordion section={faqSecondary!} />
          </Show>
        </HomeLayout.Faq>
      </Show>
      <HomeLayout.Cta>
        <CtaBanner />
      </HomeLayout.Cta>
    </HomeLayout>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Home.meta' })

  const content = await fetchPageContent(HOME_PAGE_KEY, locale)
  const fallback = { title: t('title'), description: t('description') }

  return buildPageMetadata(content, fallback)
}
