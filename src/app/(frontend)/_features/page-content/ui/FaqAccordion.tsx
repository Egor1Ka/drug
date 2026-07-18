'use client'

import { CirclePlus } from 'lucide-react'
import React, { useState } from 'react'

import RichText from '@/components/RichText'
import type { FaqSectionBlock } from '@/payload-types'
import { cn } from '@/utilities/ui'
import { Show } from '@frontend/_shared/ui/Show'

type FaqItem = FaqSectionBlock['items'][number]

export const FaqAccordion: React.FC<{ section: FaqSectionBlock }> = ({ section }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleItem = (index: number) => () => setOpenIndex(openIndex === index ? null : index)

  const renderFaqItem = (item: FaqItem, index: number) => {
    const isOpen = index === openIndex

    return (
      <div className="border-t border-border py-5" key={item.id || index}>
        <button
          aria-expanded={isOpen}
          className="flex w-full cursor-pointer items-center justify-between gap-4 text-left font-medium text-foreground"
          onClick={toggleItem(index)}
          type="button"
        >
          {item.question}
          <CirclePlus
            className={cn(
              'h-6 w-6 shrink-0 text-muted-foreground/50 transition-transform duration-300',
              isOpen && 'rotate-45',
            )}
          />
        </button>
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="pt-3 text-[15px] leading-relaxed text-muted-foreground">
              <RichText data={item.answer} enableGutter={false} enableProse={false} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Show when={!!section.heading}>
        <h2 className="mb-6 text-2xl font-semibold text-foreground">{section.heading}</h2>
      </Show>
      <div>{section.items.map(renderFaqItem)}</div>
    </div>
  )
}
