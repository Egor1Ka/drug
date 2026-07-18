'use client'

import React, { useEffect, useRef, useState } from 'react'

import { Media } from '@/components/Media'
import type { LogosSectionBlock } from '@/payload-types'
import { cn } from '@/utilities/ui'
import { Show } from '@frontend/_shared/ui/Show'

type LogoItem = LogosSectionBlock['items'][number]

const AUTOPLAY_INTERVAL_MS = 2500

const LogoImage: React.FC<{ item: LogoItem }> = ({ item }) => (
  <Media
    className="flex h-14 items-center"
    imgClassName="max-h-14 w-auto object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
    resource={item.logo}
  />
)

const renderLogoItem = (item: LogoItem, index: number) => (
  <li
    className="flex w-1/2 shrink-0 snap-start items-center justify-center px-6 sm:w-1/4 lg:w-[14.2857%]"
    key={item.id || index}
  >
    {item.link ? (
      <a href={item.link} rel="noreferrer" target="_blank">
        <LogoImage item={item} />
      </a>
    ) : (
      <LogoImage item={item} />
    )}
  </li>
)

const toPositionIndex = (_unused: unknown, index: number) => index

export const LogoCarousel: React.FC<{ section: LogosSectionBlock }> = ({ section }) => {
  const trackRef = useRef<HTMLUListElement>(null)
  const isPausedRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [positionsCount, setPositionsCount] = useState(0)

  const measureItemWidth = () => {
    const track = trackRef.current
    if (!track || !track.firstElementChild) return 0
    return (track.firstElementChild as HTMLElement).offsetWidth
  }

  const scrollToIndex = (index: number) => {
    const track = trackRef.current
    const itemWidth = measureItemWidth()
    if (!track || !itemWidth) return
    track.scrollTo({ behavior: 'smooth', left: index * itemWidth })
  }

  const selectSlide = (index: number) => () => scrollToIndex(index)

  const handleScroll = () => {
    const track = trackRef.current
    const itemWidth = measureItemWidth()
    if (!track || !itemWidth) return
    const lastPositionIndex = Math.max(0, positionsCount - 1)
    setActiveIndex(Math.min(lastPositionIndex, Math.round(track.scrollLeft / itemWidth)))
  }

  const pauseAutoplay = () => {
    isPausedRef.current = true
  }

  const resumeAutoplay = () => {
    isPausedRef.current = false
  }

  // Dots = reachable scroll positions (items - visible + 1), not one per logo:
  // the track cannot scroll further than its last full page.
  useEffect(() => {
    const measurePositions = () => {
      const track = trackRef.current
      if (!track || !track.firstElementChild) return

      const itemWidth = (track.firstElementChild as HTMLElement).offsetWidth
      if (!itemWidth) return

      const visibleCount = Math.max(1, Math.round(track.clientWidth / itemWidth))
      setPositionsCount(Math.max(1, section.items.length - visibleCount + 1))
    }

    measurePositions()
    window.addEventListener('resize', measurePositions)

    return () => window.removeEventListener('resize', measurePositions)
  }, [section.items.length])

  useEffect(() => {
    const advanceSlide = () => {
      const track = trackRef.current
      if (!track || isPausedRef.current) return

      const firstItem = track.firstElementChild as HTMLElement | null
      if (!firstItem || !firstItem.offsetWidth) return

      const maxScrollLeft = track.scrollWidth - track.clientWidth
      const isAtEnd = track.scrollLeft >= maxScrollLeft - 4
      const nextIndex = isAtEnd ? 0 : Math.round(track.scrollLeft / firstItem.offsetWidth) + 1

      track.scrollTo({ behavior: 'smooth', left: nextIndex * firstItem.offsetWidth })
    }

    const intervalId = window.setInterval(advanceSlide, AUTOPLAY_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [])

  const renderDot = (positionIndex: number) => (
    <button
      aria-label={`Go to slide ${positionIndex + 1}`}
      className={cn(
        'h-2 w-2 cursor-pointer rounded-full transition',
        positionIndex === activeIndex ? 'bg-primary' : 'bg-border',
      )}
      key={positionIndex}
      onClick={selectSlide(positionIndex)}
      type="button"
    />
  )

  const positionIndexes = Array.from({ length: positionsCount }, toPositionIndex)

  return (
    <div onMouseEnter={pauseAutoplay} onMouseLeave={resumeAutoplay}>
      <Show when={!!section.heading}>
        <h2 className="mb-10 text-center text-3xl font-semibold text-foreground md:text-4xl">
          {section.heading}
        </h2>
      </Show>
      <ul
        className="flex snap-x snap-mandatory overflow-x-auto py-2 scrollbar-none [&::-webkit-scrollbar]:hidden"
        onScroll={handleScroll}
        ref={trackRef}
      >
        {section.items.map(renderLogoItem)}
      </ul>
      <Show when={positionsCount > 1}>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {positionIndexes.map(renderDot)}
        </div>
      </Show>
    </div>
  )
}
