import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { Form } from '@/payload-types'

const APP_LOGIN_EN = 'https://app.drug-card.io/login/en'

// Normally the seed fills a global only when empty (never clobbers editor work).
// Set SEED_LAYOUT_FORCE=1 to overwrite the header/footer globals with the seed
// content — used to re-apply updated seed content to an already-seeded database.
const FORCE_GLOBALS = process.env.SEED_LAYOUT_FORCE === '1'

const toRichTextParagraph = (text: string) => ({
  root: {
    children: [
      {
        children: [{ text, type: 'text', version: 1 }],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const customLink = (label: string, url: string) => ({
  link: { label, type: 'custom' as const, url },
})

// ---------- Форма подписки ----------

const NEWSLETTER_SLUG = 'newsletter'

const NEWSLETTER_COPY = {
  en: {
    confirmation: 'Thank you for subscribing!',
    emailLabel: 'E-mail',
    submit: 'Subscribe',
  },
  uk: {
    confirmation: 'Дякуємо за підписку!',
    emailLabel: 'E-mail',
    submit: 'Підписатися',
  },
}

const seedNewsletterForm = async (payload: Payload) => {
  const existing = await payload.find({
    collection: 'forms',
    limit: 1,
    where: { slug: { equals: NEWSLETTER_SLUG } },
  })

  if (existing.docs[0]) {
    payload.logger.info('Form "newsletter" already exists — left untouched')
    return existing.docs[0] as Form
  }

  const created = await payload.create({
    collection: 'forms',
    context: { disableRevalidate: true },
    data: {
      confirmationMessage: toRichTextParagraph(NEWSLETTER_COPY.en.confirmation),
      confirmationType: 'message',
      fields: [
        {
          blockType: 'email',
          label: NEWSLETTER_COPY.en.emailLabel,
          name: 'email',
          required: true,
        },
      ] as NonNullable<Form['fields']>,
      slug: NEWSLETTER_SLUG,
      submitButtonLabel: NEWSLETTER_COPY.en.submit,
      title: 'Newsletter',
    },
    locale: 'en',
  })

  const createdRows = (created.fields || []) as NonNullable<Form['fields']>

  const toUkRow = (row: NonNullable<Form['fields']>[number]) => ({
    ...row,
    label: NEWSLETTER_COPY.uk.emailLabel,
  })

  await payload.update({
    collection: 'forms',
    context: { disableRevalidate: true },
    data: {
      confirmationMessage: toRichTextParagraph(NEWSLETTER_COPY.uk.confirmation),
      fields: createdRows.map(toUkRow),
      submitButtonLabel: NEWSLETTER_COPY.uk.submit,
    },
    id: created.id,
    locale: 'uk',
  })

  payload.logger.info('Created form "newsletter"')

  return created as Form
}

// ---------- Header ----------

// Slugs mirror drug-card.io exactly so the copy's internal pages can live at the
// same paths. External destinations (app login, socials) stay absolute.
const HEADER_EN = {
  ctaButtons: {
    demoButtonLabel: 'Request a Demo',
    loginButton: { label: 'Log In', newTab: true, type: 'custom' as const, url: APP_LOGIN_EN },
  },
  navItems: [
    {
      ...customLink('Why DrugCard?', '/why-drugcard'),
      subItems: [
        customLink('About Us', '/about-us'),
        customLink('Implementation & Onboarding', '/implementation-onboarding'),
        customLink('Compliance', '/compliance'),
        customLink('Audit Readiness', '/audit-readiness'),
        customLink('Manual screening vs DrugCard screening', '/manual-screening-vs-drugcard-screening'),
      ],
    },
    {
      ...customLink('Solution', '/solution'),
      subItems: [
        customLink('DrugCard Platform', '/local-literature'),
        customLink('Simple Search by DrugCard', '/simple-search'),
        customLink('Regulatory Intelligence', '/regulatory-intelligence'),
        customLink('Adverse Event Database', '/adverse-event-database'),
        customLink('eCTDlight', '/drugcard-ectdlight-en'),
      ],
    },
    {
      ...customLink('Services', '/services'),
      subItems: [
        customLink('LQPPV Services', '/local-qualified-person-for-pharmacovigilance-lqppv'),
        customLink('Signal Management', '/signal-management'),
        customLink('PSUR Services', '/psur'),
        customLink('ICSR Management', '/icsr-management'),
        customLink('PSMF Management', '/pharmacovigilance-system-master-file'),
        customLink('Risk Management Plan', '/risk-management-plan-for-pharmacovigilance'),
        customLink('Pharmacovigilance Training Services', '/pharmacovigilance-audit-amp-training-services'),
        customLink('Pharmacovigilance Consultancy', '/pharmacovigilance-consultancy-services'),
      ],
    },
    {
      ...customLink('Resources', '/resources'),
      subItems: [
        customLink('Blog', '/blog'),
        customLink('Case Studies', '/case-studies'),
        customLink('Documents', '/documents'),
        customLink('Local Medical Journals', '/local-medical-journals'),
        customLink('News', '/news'),
      ],
    },
    {
      ...customLink('Contact us', '/contact-us'),
      subItems: [customLink('Partnership', '/partnership')],
    },
    // Top-level item on the original site (shown in every language).
    customLink('БПР', '/zakhody-bpr'),
  ],
}

const HEADER_UK = {
  ctaButtons: {
    demoButtonLabel: 'Замовити демо',
    loginButton: { label: 'Увійти', newTab: true, type: 'custom' as const, url: APP_LOGIN_EN },
  },
  navItems: [
    {
      ...customLink('Чому DrugCard?', '/why-drugcard'),
      subItems: [
        customLink('Про нас', '/about-us'),
        customLink('Впровадження', '/implementation-onboarding'),
        customLink('Комплаєнс', '/compliance'),
        customLink('Готовність до аудиту', '/audit-readiness'),
        customLink('Ручний скринінг vs DrugCard', '/manual-screening-vs-drugcard-screening'),
      ],
    },
    {
      ...customLink('Рішення', '/solution'),
      subItems: [
        customLink('Платформа DrugCard', '/local-literature'),
        customLink('Simple Search', '/simple-search'),
        customLink('Regulatory Intelligence', '/regulatory-intelligence'),
        customLink('База побічних явищ', '/adverse-event-database'),
        customLink('eCTDlight', '/drugcard-ectdlight-en'),
      ],
    },
    {
      ...customLink('Послуги', '/services'),
      subItems: [
        customLink('Послуги ЛУВБ', '/local-qualified-person-for-pharmacovigilance-lqppv'),
        customLink('Управління сигналами', '/signal-management'),
        customLink('Послуги PSUR', '/psur'),
        customLink('Управління ICSR', '/icsr-management'),
        customLink('Управління PSMF', '/pharmacovigilance-system-master-file'),
        customLink('План управління ризиками', '/risk-management-plan-for-pharmacovigilance'),
        customLink('Навчання з фармаконагляду', '/pharmacovigilance-audit-amp-training-services'),
        customLink('Консалтинг з фармаконагляду', '/pharmacovigilance-consultancy-services'),
      ],
    },
    {
      ...customLink('Ресурси', '/resources'),
      subItems: [
        customLink('Блог', '/blog'),
        customLink('Кейси', '/case-studies'),
        customLink('Документи', '/documents'),
        customLink('Місцеві медичні журнали', '/local-medical-journals'),
        customLink('Новини', '/news'),
      ],
    },
    {
      ...customLink("Зв'язатися з нами", '/contact-us'),
      subItems: [customLink('Партнерство', '/partnership')],
    },
    customLink('Заходи БПР', '/zakhody-bpr'),
  ],
}

const seedHeader = async (payload: Payload) => {
  const current = await payload.findGlobal({ locale: 'en', slug: 'header' })

  if (!FORCE_GLOBALS && current && current.navItems && current.navItems.length > 0) {
    payload.logger.info('Global "header" already filled — left untouched')
    return
  }

  await payload.updateGlobal({
    context: { disableRevalidate: true },
    data: HEADER_EN as never,
    locale: 'en',
    slug: 'header',
  })

  await payload.updateGlobal({
    context: { disableRevalidate: true },
    data: HEADER_UK as never,
    locale: 'uk',
    slug: 'header',
  })

  payload.logger.info('Seeded global "header" (en + uk)')
}

// ---------- Footer ----------

const FOOTER_SOCIALS = [
  { platform: 'telegram' as const, url: 'https://t.me/dmytro_halytskiy' },
  { platform: 'facebook' as const, url: 'https://www.facebook.com/drugcards/' },
  { platform: 'youtube' as const, url: 'https://www.youtube.com/channel/UCufbHwOccg8-uUT7FS5toIw' },
  { platform: 'linkedin' as const, url: 'https://www.linkedin.com/company/drugcards/' },
]

const FOOTER_EN = {
  contacts: {
    address:
      'ДрагКардс Україна, Україна, 79042, Львівська область, місто Львів, вулиця Шевченка Т., будинок 111 а, офіс 6',
    email: 'sales@drug-card.io',
    phone: '+372 5565 7104',
    tagline: 'Driving Pharmacovigilance forward with AI-enabled Data Intelligence',
  },
  legal: {
    copyright: '© Copyright 2021-2026 DrugCard OÜ. All rights reserved.',
    legalLinks: [
      customLink('Privacy Policy', '/privacy-policy'),
      customLink('Quality Policy', '/quality-policy'),
    ],
  },
  linkColumns: [
    {
      links: [
        customLink('Why DrugCard?', '/why-drugcard'),
        customLink('DrugCard Platform', '/local-literature'),
        customLink('Simple Search', '/simple-search'),
        customLink('Regulatory Intelligence', '/regulatory-intelligence'),
        customLink('Adverse Event Database', '/adverse-event-database'),
      ],
      title: 'Why DrugCard?',
    },
    {
      links: [
        customLink('Services', '/services'),
        { link: { label: 'Log In', newTab: true, type: 'custom' as const, url: APP_LOGIN_EN } },
        customLink('Blog', '/blog'),
        customLink('Documents', '/documents'),
        customLink('Case Studies', '/case-studies'),
      ],
      title: 'Services & Resources',
    },
    {
      links: [
        customLink('Partnership', '/partnership'),
        customLink('Contact us', '/contact-us'),
        customLink('About us', '/about-us'),
        customLink('Заходи БПР', '/zakhody-bpr'),
      ],
      title: 'Company & Support',
    },
  ],
  newsletter: { heading: 'Sign up and receive the latest tips via email' },
}

const FOOTER_UK = {
  contacts: {
    address:
      'ДрагКардс Україна, Україна, 79042, Львівська область, місто Львів, вулиця Шевченка Т., будинок 111 а, офіс 6',
    tagline: 'Розвиваємо фармаконагляд за допомогою AI та аналітики даних',
  },
  legal: {
    copyright: '© Copyright 2021-2026 DrugCard OÜ. Усі права захищені.',
    legalLinks: [
      customLink('Політика конфіденційності', '/privacy-policy'),
      customLink('Політика якості', '/quality-policy'),
    ],
  },
  linkColumns: [
    {
      links: [
        customLink('Чому DrugCard?', '/why-drugcard'),
        customLink('Платформа DrugCard', '/local-literature'),
        customLink('Simple Search', '/simple-search'),
        customLink('Regulatory Intelligence', '/regulatory-intelligence'),
        customLink('База побічних явищ', '/adverse-event-database'),
      ],
      title: 'Чому DrugCard?',
    },
    {
      links: [
        customLink('Послуги', '/services'),
        { link: { label: 'Увійти', newTab: true, type: 'custom' as const, url: APP_LOGIN_EN } },
        customLink('Блог', '/blog'),
        customLink('Документи', '/documents'),
        customLink('Кейси', '/case-studies'),
      ],
      title: 'Послуги та ресурси',
    },
    {
      links: [
        customLink('Партнерство', '/partnership'),
        customLink("Зв'язатися з нами", '/contact-us'),
        customLink('Про нас', '/about-us'),
        customLink('Заходи БПР', '/zakhody-bpr'),
      ],
      title: 'Компанія та підтримка',
    },
  ],
  newsletter: { heading: 'Підпишіться та отримуйте актуальні новини на email' },
}

const seedFooter = async (payload: Payload, newsletterForm: Form) => {
  const current = await payload.findGlobal({ locale: 'en', slug: 'footer' })

  if (!FORCE_GLOBALS && current && current.linkColumns && current.linkColumns.length > 0) {
    payload.logger.info('Global "footer" already filled — left untouched')
    return
  }

  await payload.updateGlobal({
    context: { disableRevalidate: true },
    data: {
      ...FOOTER_EN,
      newsletter: { ...FOOTER_EN.newsletter, form: newsletterForm.id },
      socials: FOOTER_SOCIALS,
    } as never,
    locale: 'en',
    slug: 'footer',
  })

  await payload.updateGlobal({
    context: { disableRevalidate: true },
    data: FOOTER_UK as never,
    locale: 'uk',
    slug: 'footer',
  })

  payload.logger.info('Seeded global "footer" (en + uk)')
}

const seedLayout = async () => {
  const payload = await getPayload({ config })

  const newsletterForm = await seedNewsletterForm(payload)
  await seedHeader(payload)
  await seedFooter(payload, newsletterForm)
}

await seedLayout()
process.exit(0)
