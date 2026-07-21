import type { TypedLocale } from 'payload'
import React from 'react'

import type { Form } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

import { fetchFooterData } from '../api/footer'
import { FooterContacts } from './FooterContacts'
import { FooterLayout } from './FooterLayout'
import { FooterLegal } from './FooterLegal'
import { FooterLinkColumns } from './FooterLinkColumns'
import { FooterSocials } from './FooterSocials'
import { NewsletterSignup } from './NewsletterSignup'

// depth 1 отдаёт связанную форму объектом; строка означает, что документ
// не разрешился (форма удалена) — блок подписки тогда не рендерим.
const resolveNewsletterForm = (form: string | Form | null | undefined): Form | null => {
  if (!form) return null
  if (typeof form === 'string') return null

  return form
}

export const SiteFooter = async ({ locale }: { locale: TypedLocale }) => {
  const footer = await fetchFooterData(locale)

  const linkColumns = footer?.linkColumns || []
  const socials = footer?.socials || []
  const newsletter = footer?.newsletter
  const newsletterForm = resolveNewsletterForm(newsletter ? newsletter.form : null)

  return (
    <FooterLayout>
      <FooterLayout.Top>
        <FooterLayout.Contacts>
          <FooterContacts contacts={footer?.contacts} />
        </FooterLayout.Contacts>

        <FooterLayout.Columns>
          <Show when={linkColumns.length > 0}>
            <FooterLinkColumns columns={linkColumns} />
          </Show>
        </FooterLayout.Columns>
      </FooterLayout.Top>

      <Show when={!!newsletterForm}>
        <FooterLayout.Newsletter>
          <NewsletterSignup
            form={newsletterForm}
            heading={newsletter ? newsletter.heading : null}
          />
        </FooterLayout.Newsletter>
      </Show>

      <Show when={socials.length > 0}>
        <FooterLayout.Socials>
          <FooterSocials socials={socials} />
        </FooterLayout.Socials>
      </Show>

      <FooterLayout.Legal>
        <FooterLegal legal={footer?.legal} />
      </FooterLayout.Legal>
    </FooterLayout>
  )
}
