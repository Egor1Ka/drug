import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { Form } from '@/payload-types'

const SITE = 'https://drug-card.io/wp-content/uploads'

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

const CONTACT_FORM_SLUG = 'contact-us'

const CONTACT_FORM_FIELDS = [
  { blockType: 'text', labels: { en: 'Name', uk: "Ім'я" }, name: 'name' },
  { blockType: 'text', labels: { en: 'Surname', uk: 'Прізвище' }, name: 'surname' },
  { blockType: 'email', labels: { en: 'E-mail', uk: 'E-mail' }, name: 'email' },
  { blockType: 'text', labels: { en: 'Phone number', uk: 'Номер телефону' }, name: 'phone' },
  { blockType: 'text', labels: { en: 'Company', uk: 'Компанія' }, name: 'company' },
] as const

const CONTACT_FORM_COPY = {
  en: {
    confirmation: 'Thank you! We received your request and will contact you shortly.',
    submit: 'Send',
    title: 'Contact us',
  },
  uk: {
    confirmation: "Дякуємо! Ми отримали вашу заявку та зв'яжемося з вами найближчим часом.",
    submit: 'Надіслати',
    title: 'Contact us',
  },
}

type ContactFormRow = NonNullable<Form['fields']>[number]

const toContactFieldEn = (field: (typeof CONTACT_FORM_FIELDS)[number]) => ({
  blockType: field.blockType,
  label: field.labels.en,
  name: field.name,
  required: true,
})

const buildContactFieldsEn = () =>
  CONTACT_FORM_FIELDS.map(toContactFieldEn) as NonNullable<Form['fields']>

const toUkLabelEntry = (field: (typeof CONTACT_FORM_FIELDS)[number]) =>
  [field.name, field.labels.uk] as const

const UK_LABEL_BY_NAME: Record<string, string> = Object.fromEntries(
  CONTACT_FORM_FIELDS.map(toUkLabelEntry),
)

// The field structure (rows, names, required) is shared across locales —
// the uk pass rewrites the SAME rows (ids preserved) with translated labels only.
const toUkRow = (row: ContactFormRow) => ({
  ...row,
  label: UK_LABEL_BY_NAME[row.name] || row.label,
})

const enrichContactForm = async (payload: Payload) => {
  const existing = await payload.find({
    collection: 'forms',
    limit: 1,
    where: { slug: { equals: CONTACT_FORM_SLUG } },
  })

  if (existing.docs[0]) {
    payload.logger.info('Form "contact-us" already exists — left untouched')
    return
  }

  const created = await payload.create({
    collection: 'forms',
    context: { disableRevalidate: true },
    data: {
      confirmationMessage: toRichTextParagraph(CONTACT_FORM_COPY.en.confirmation),
      confirmationType: 'message',
      fields: buildContactFieldsEn(),
      slug: CONTACT_FORM_SLUG,
      submitButtonLabel: CONTACT_FORM_COPY.en.submit,
      title: CONTACT_FORM_COPY.en.title,
    },
    locale: 'en',
  })

  const createdRows = (created.fields || []) as ContactFormRow[]

  await payload.update({
    collection: 'forms',
    context: { disableRevalidate: true },
    data: {
      confirmationMessage: toRichTextParagraph(CONTACT_FORM_COPY.uk.confirmation),
      fields: createdRows.map(toUkRow),
      submitButtonLabel: CONTACT_FORM_COPY.uk.submit,
    },
    id: created.id,
    locale: 'uk',
  })

  payload.logger.info('Created form "contact-us" (shared structure, en + uk labels)')
}

const LOGO_SOURCES = [
  { alt: 'Chiesi logo', url: `${SITE}/2026/01/chies.png` },
  { alt: 'Grindex logo', url: `${SITE}/2026/01/grindex_bw.png` },
  { alt: 'Meisys logo', url: `${SITE}/2022/10/Meysis-logo.png` },
  { alt: 'Farmak logo', url: `${SITE}/2024/05/Logo_Farmak_Black-1-1-1.png` },
  { alt: 'World Medicine logo', url: `${SITE}/2023/04/worldmedicine.png` },
  { alt: 'Adamed logo', url: `${SITE}/2026/01/adamed1.png` },
  { alt: 'Phibro logo', url: `${SITE}/2026/01/phibro_bw.png` },
  { alt: 'Medfiles logo', url: `${SITE}/2026/01/medfiles_bw.png` },
  { alt: 'Yuria-Pharm logo', url: `${SITE}/2026/01/yuria_bw.png` },
  { alt: 'Dar Al Dawa logo', url: `${SITE}/2026/01/dar_bw.png` },
  { alt: 'Biopharma logo', url: `${SITE}/2026/01/bio_bw.png` },
  { alt: 'Polpharma logo', url: `${SITE}/2026/01/polp_bw.png` },
  { alt: 'GM Pharma logo', url: `${SITE}/2026/01/gmpharma_bw.png` },
  { alt: 'Vorwarts Pharma logo', url: `${SITE}/2026/01/vorwar_bw.png` },
  { alt: 'Sano logo', url: `${SITE}/2026/01/sano_bw.png` },
  { alt: 'PLG logo', url: `${SITE}/2026/01/plg_bw.png` },
  { alt: 'OM Pharma logo', url: `${SITE}/2026/01/om_bw.png` },
]

const TEAM_ITEMS = [
  {
    description:
      'Leads product strategy and development, translating pharmacovigilance requirements, automation, and AI into practical customer solutions.',
    linkedinUrl: 'https://www.linkedin.com/company/drugcard/',
    name: 'Artem Horilyk',
    photoAlt: 'Artem Horilyk photo',
    photoUrl: `${SITE}/2025/12/11-230x230.png`,
    role: 'Chief Product Officer',
  },
  {
    description:
      "Defines the company's strategic direction, oversees business operations, and drives DrugCard's growth across international markets.",
    linkedinUrl: 'https://www.linkedin.com/company/drugcard/',
    name: 'Dmytro Horilyk',
    photoAlt: 'Dmytro Horilyk photo',
    photoUrl: `${SITE}/2025/12/21-230x230.png`,
    role: 'Chief Executive Officer',
  },
  {
    description:
      'Oversees the technology strategy and platform development, ensuring scalability, reliability, and security of all solutions.',
    linkedinUrl: 'https://www.linkedin.com/company/drugcard/',
    name: 'Myroslav Demchun',
    photoAlt: 'Myroslav Demchun photo',
    photoUrl: `${SITE}/2025/12/31-230x230.jpg`,
    role: 'Chief Technology Officer',
  },
]

const TESTIMONIAL_ITEMS = [
  {
    authorName: 'Dovilė Marcinkė',
    authorRole: 'Head of Global Drug Safety Unit and QPPV',
    photoAlt: 'Dovilė Marcinkė photo',
    photoUrl: `${SITE}/2022/10/1674723628558.jpeg`,
    quote:
      'DrugCards stands out as a mandatory operation tool, enabling our presence and activities with efficiency, cost saving and compliance with GVP regulations and other applicable requirements.',
  },
  {
    authorName: 'Jaime Ruiz',
    authorRole: 'Senior Pharmacovigilance Specialist',
    photoAlt: 'Jaime Ruiz photo',
    photoUrl: `${SITE}/2025/10/jaime-ruiz.jpeg`,
    quote:
      'No more spending hours reading articles, since we started working with Drugcard we are more productive in other tasks. It is a very reliable tool that has certainly helped us a lot in the team. 100% recommendable!',
  },
  {
    authorName: 'Cristina Ruiz',
    authorRole: 'PV Project Manager',
    photoAlt: 'Cristina Ruiz photo',
    photoUrl: `${SITE}/2025/10/cristina-ruiz.jpeg`,
    quote:
      'Drugcard has allowed us to automate a critical process in our work: local literature monitoring. Not only does it save time, but it also captures more information than we could gather manually, and with the time saved, we can now focus on high-priority tasks such as signal detection, PSURs, RMPs, and much more.',
  },
]

const FAQ_ITEMS = [
  {
    answer:
      'Based on our customer feedback 50-70% time-savings could be achieved. However, we strongly welcome that planned time and cost savings were calculated for each project individually. Suppose it takes 30 minutes to read and another 5 more minutes to properly record evidence of reading, with DrugCard it would take only 3 minutes max, which is almost 10 times less.',
    question: 'How much time can I save when using DrugCard?',
  },
  {
    answer:
      'Yes, we often face requests from our customers to help them screen printed hard copies of journals with scan quality being far from perfect. We use our own proprietary OCR technology which delivers up to 99% accuracy of average quality scanned texts.',
    question: 'Can DrugCard recognize poorly scanned texts?',
  },
  {
    answer:
      'Yes, screening medical literature in local languages is DrugCards main competitive strength. To date we successfully read 100+ languages and already covered 1500+ local journals. It means you can add search keywords in Greek, Hindi, Arabic, Japanese hieroglyphics, you name it.',
    question: 'Can DrugCard screen local medical journals in local languages?',
  },
  {
    answer:
      'Yes. Once DrugCard identifies a new drug mentioning in any local journal you will get an instant notification by email. On top you will receive weekly summary reports.',
    question: 'Can I have weekly reports with all data collected in a week?',
  },
  {
    answer:
      'On average, it takes up to 2-3 weeks. The timeframe depends on country-specific factors and the number of journals.',
    question: 'How long does it take to add journals in a new country?',
  },
  {
    answer:
      'It took us one year and a team of 5 people to develop the core, and 2 more years and 6 more people to make the platform friendly, reliable, bug-free, responsive and regulatory compliant.',
    question: 'How long could it take for me to develop such a system internally?',
  },
  {
    answer:
      'Yes — DrugCard automates routine screening so your PV specialists can redirect efforts to more intelligent work like signal detection, risk assessment, ICSR & case follow-up activities, quality control, etc.',
    question: 'With DrugCard can I manage local medical literature screening without any staff?',
  },
  {
    answer:
      'Screening local medical literature in local languages is our main competitive strength. DrugCard combines 100+ languages, 2200+ local journals across 138+ countries, proprietary OCR for hard-copy scans, instant email alerts and full traceability designed for GVP compliance.',
    question: 'What are your unique strengths compared to your competition?',
  },
]

const STATS_ITEMS = [
  { label: 'Languages', sublabel: 'Supported by DrugCard', value: '100+' },
  { label: 'Countries', sublabel: 'Medical journals coverage', value: '138+' },
  { label: 'Local journals', sublabel: 'Continuously monitored', value: '2200+' },
  { label: 'Time savings', sublabel: 'Compared to human-only approach', value: '60%' },
]

const mimetypeFromUrl = (url: string) => {
  if (url.endsWith('.png')) return 'image/png'
  if (url.endsWith('.svg')) return 'image/svg+xml'
  return 'image/jpeg'
}

const filenameFromUrl = (url: string) => url.split('/').slice(-1)[0]

const fetchImageBuffer = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

const findExistingMediaId = async (payload: Payload, filename: string) => {
  const baseName = filename.split('.')[0]
  const result = await payload.find({
    collection: 'media',
    limit: 1,
    where: { filename: { contains: baseName } },
  })
  const existing = result.docs[0]
  return existing ? String(existing.id) : null
}

const createImageUploader =
  (payload: Payload) =>
  async ({ alt, url }: { alt: string; url: string }) => {
    const filename = filenameFromUrl(url)
    const existingId = await findExistingMediaId(payload, filename)
    if (existingId) return existingId

    const data = await fetchImageBuffer(url)
    const created = await payload.create({
      collection: 'media',
      data: { alt },
      file: { data, mimetype: mimetypeFromUrl(url), name: filename, size: data.length },
    })
    return String(created.id)
  }

const uploadAllImages = async (payload: Payload) => {
  const uploadImage = createImageUploader(payload)
  const toLogoUpload = (logo: (typeof LOGO_SOURCES)[number]) => uploadImage(logo)
  const toTeamUpload = (member: (typeof TEAM_ITEMS)[number]) =>
    uploadImage({ alt: member.photoAlt, url: member.photoUrl })
  const toTestimonialUpload = (item: (typeof TESTIMONIAL_ITEMS)[number]) =>
    uploadImage({ alt: item.photoAlt, url: item.photoUrl })

  try {
    const logoIds = await Promise.all(LOGO_SOURCES.map(toLogoUpload))
    const teamPhotoIds = await Promise.all(TEAM_ITEMS.map(toTeamUpload))
    const testimonialPhotoIds = await Promise.all(TESTIMONIAL_ITEMS.map(toTestimonialUpload))
    return { logoIds, teamPhotoIds, testimonialPhotoIds }
  } catch (error) {
    payload.logger.warn(
      `Media upload failed (${String(error)}) — updating content without images. Configure BLOB_READ_WRITE_TOKEN and re-run to attach them.`,
    )
    return null
  }
}

const toFaqItem = ({ answer, question }: (typeof FAQ_ITEMS)[number]) => ({
  answer: toRichTextParagraph(answer),
  question,
})

const toLogoItem = (logoId: string) => ({ logo: logoId })

const buildSections = (media: Awaited<ReturnType<typeof uploadAllImages>>) => {
  const toTeamItem = ({ description, linkedinUrl, name, role }: (typeof TEAM_ITEMS)[number], index: number) => ({
    description,
    linkedinUrl,
    name,
    photo: media ? media.teamPhotoIds[index] : undefined,
    role,
  })

  const toTestimonialItem = (
    { authorName, authorRole, quote }: (typeof TESTIMONIAL_ITEMS)[number],
    index: number,
  ) => ({
    authorName,
    authorRole,
    photo: media ? media.testimonialPhotoIds[index] : undefined,
    quote,
  })

  const logosSections = media
    ? [
        {
          blockType: 'logos' as const,
          heading: 'Our customers',
          items: media.logoIds.map(toLogoItem),
          sectionKey: 'client-logos',
        },
      ]
    : []

  return [
    ...logosSections,
    {
      blockType: 'stats' as const,
      items: STATS_ITEMS,
      sectionKey: 'platform-stats',
    },
    {
      blockType: 'team' as const,
      heading: 'Our Management Team',
      items: TEAM_ITEMS.map(toTeamItem),
      sectionKey: 'management-team',
    },
    {
      blockType: 'testimonials' as const,
      heading: 'Testimonials',
      items: TESTIMONIAL_ITEMS.map(toTestimonialItem),
      sectionKey: 'testimonials-main',
    },
    {
      blockType: 'faq' as const,
      items: FAQ_ITEMS.slice(0, 4).map(toFaqItem),
      sectionKey: 'faq-main',
    },
    {
      blockType: 'faq' as const,
      items: FAQ_ITEMS.slice(4).map(toFaqItem),
      sectionKey: 'faq-secondary',
    },
  ]
}

const enrichHomeContent = async () => {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'page-content',
    limit: 1,
    where: { pageKey: { equals: 'home' } },
  })
  const homeDoc = existing.docs[0]
  const media = await uploadAllImages(payload)
  const sections = buildSections(media)

  if (!homeDoc) {
    await payload.create({
      collection: 'page-content',
      context: { disableRevalidate: true },
      data: { pageKey: 'home', sections },
      locale: 'en',
    })
    payload.logger.info(`Created page-content "home" (images: ${media ? 'attached' : 'skipped'})`)
  } else {
    await payload.update({
      collection: 'page-content',
      context: { disableRevalidate: true },
      data: { sections },
      id: homeDoc.id,
      locale: 'en',
    })
    payload.logger.info(`Updated page-content "home" (images: ${media ? 'attached' : 'skipped'})`)
  }

  await enrichContactForm(payload)
}

await enrichHomeContent()
process.exit(0)
