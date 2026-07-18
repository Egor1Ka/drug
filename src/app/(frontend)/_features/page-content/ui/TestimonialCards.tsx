import { Star } from 'lucide-react'
import React from 'react'

import { Media } from '@/components/Media'
import type { TestimonialsSectionBlock } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

type TestimonialItem = TestimonialsSectionBlock['items'][number]

const STAR_INDEXES = [0, 1, 2, 3, 4]

const renderStar = (index: number) => (
  <Star className="h-3.5 w-3.5 fill-primary text-primary" key={index} />
)

const renderTestimonialCard = (item: TestimonialItem, index: number) => (
  <li className="rounded-xl border border-border bg-card p-6" key={item.id || index}>
    <div className="flex items-center gap-4">
      <Show when={!!item.photo}>
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
          <Media fill imgClassName="object-cover" resource={item.photo} />
        </div>
      </Show>
      <div>
        <div className="font-bold text-foreground">{item.authorName}</div>
        <div className="mt-1 flex gap-0.5">{STAR_INDEXES.map(renderStar)}</div>
        <Show when={!!item.authorRole}>
          <div className="mt-1 text-sm text-muted-foreground">{item.authorRole}</div>
        </Show>
      </div>
    </div>
    <div className="mt-5 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
      {item.quote}
    </div>
  </li>
)

type TestimonialCardsProps = {
  section: TestimonialsSectionBlock
  subtitle?: string
}

export const TestimonialCards: React.FC<TestimonialCardsProps> = ({ section, subtitle }) => (
  <div>
    <Show when={!!section.heading}>
      <h2 className="text-center text-3xl font-semibold text-foreground md:text-4xl">
        {section.heading}
      </h2>
    </Show>
    <Show when={!!subtitle}>
      <p className="mx-auto mt-5 max-w-xl text-center text-muted-foreground">{subtitle}</p>
    </Show>
    <ul className="mt-12 grid gap-6 lg:grid-cols-3">{section.items.map(renderTestimonialCard)}</ul>
  </div>
)
