import React from 'react'

import { ContactModalTrigger } from '@frontend/_features/contact'

export const CaseStudyCta: React.FC = () => (
  <section className="mx-auto max-w-[48rem] rounded-lg bg-primary px-8 py-12 text-center text-primary-foreground">
    <h2 className="text-3xl font-bold">Ready to Achieve Similar Results?</h2>
    <p className="mt-3 text-primary-foreground/90">
      Book a personalised demo and see what DrugCard can do for your team.
    </p>
    <ContactModalTrigger className="mt-6 inline-flex items-center rounded-md bg-background px-6 py-3 text-sm font-semibold text-foreground hover:opacity-90">
      Book a demo
    </ContactModalTrigger>
  </section>
)
