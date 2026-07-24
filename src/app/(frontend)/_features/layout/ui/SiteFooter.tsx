import type { TypedLocale } from 'payload'
import React from 'react'

import { resolveRelation } from '@/utilities/resolveRelation'
import { Show } from '@frontend/_shared/ui/Show'

import { fetchFooterData } from '../api/footer'
import { FooterContacts } from './FooterContacts'
import { FooterLayout } from './FooterLayout'
import { FooterLegal } from './FooterLegal'
import { FooterLinkColumns } from './FooterLinkColumns'
import { FooterSocials } from './FooterSocials'
import { NewsletterSignup } from './NewsletterSignup'

export const SiteFooter = async ({ locale }: { locale: TypedLocale }) => {
  const footer = await fetchFooterData(locale)

  const linkColumns = footer?.linkColumns || []
  const socials = footer?.socials || []
  const newsletter = footer?.newsletter
  // depth 1 отдаёт связанную форму объектом; неразрешённый relationship
  // (форма удалена) — блок подписки тогда не рендерим.
  const newsletterForm = resolveRelation(newsletter ? newsletter.form : null)

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
