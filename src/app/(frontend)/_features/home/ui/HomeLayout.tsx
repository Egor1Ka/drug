import React from 'react'

import { Show } from '@frontend/_shared/ui/Show'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => <article className="pb-20">{children}</article>

const Hero: React.FC<SlotProps> = ({ children }) => (
  <section className="container pt-14 pb-16 md:pt-24">
    <div className="grid items-center gap-10 lg:grid-cols-2">{children}</div>
  </section>
)

const Logos: React.FC<SlotProps> = ({ children }) => (
  <section className="container py-14">{children}</section>
)

const Pressures: React.FC<SlotProps> = ({ children }) => (
  <section className="container py-16">{children}</section>
)

const Requirements: React.FC<SlotProps> = ({ children }) => (
  <section className="container py-16">{children}</section>
)

const Stats: React.FC<SlotProps> = ({ children }) => (
  <section className="container py-16">{children}</section>
)

const Team: React.FC<SlotProps> = ({ children }) => (
  <section className="container py-16">{children}</section>
)

const Segments: React.FC<SlotProps> = ({ children }) => (
  <section className="container py-16">{children}</section>
)

const Testimonials: React.FC<SlotProps> = ({ children }) => (
  <section className="container py-16">{children}</section>
)

type FaqSlotProps = SlotProps & {
  heading?: string
}

// Each child is an independent accordion; the layout only places them side by side.
const Faq: React.FC<FaqSlotProps> = ({ children, heading }) => (
  <section className="container py-16">
    <Show when={!!heading}>
      <h2 className="mb-12 text-center text-[32px] font-semibold text-foreground md:text-[40px]">
        {heading}
      </h2>
    </Show>
    <div className="mx-auto grid max-w-6xl items-start gap-x-16 md:grid-cols-2">{children}</div>
  </section>
)

const Cta: React.FC<SlotProps> = ({ children }) => (
  <section className="container py-20">{children}</section>
)

export const HomeLayout = Object.assign(Root, {
  Cta,
  Faq,
  Hero,
  Logos,
  Pressures,
  Requirements,
  Segments,
  Stats,
  Team,
  Testimonials,
})
