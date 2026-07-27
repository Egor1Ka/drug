import React from 'react'

// The orange "Have questions for our experts?" band that closes several pages
// on the original site. The wave edges are Elementor's SVG shape dividers,
// reproduced here 1:1 — geometry, sizes and opacities all come from the live
// page, so the band reads identically.
//
// Presentational only: copy and buttons arrive from the feature that uses it,
// which is what lets documents and journals share one visual without sharing
// their wording.

const WAVE_VIEW_BOX = '0 0 1000 100'

// Single crest, filled with the page background so it carves the top edge of
// the band out of the orange.
const TOP_WAVE_PATH =
  'M421.9,6.5c22.6-2.5,51.5,0.4,75.5,5.3c23.6,4.9,70.9,23.5,100.5,35.7c75.8,32.2,133.7,44.5,192.6,49.7 c23.6,2.1,48.7,3.5,103.4-2.5c54.7-6,106.2-25.6,106.2-25.6V0H0v30.3c0,0,72,32.6,158.4,30.5c39.2-0.7,92.8-6.7,134-22.4 c21.2-8.1,52.2-18.2,79.7-24.2C399.3,7.9,411.6,7.5,421.9,6.5z'

// Three overlapping crests at rising opacity — the translucent layers are what
// give the foot of the band its depth.
const BOTTOM_WAVE_LAYERS = [
  {
    d: 'M473,67.3c-203.9,88.3-263.1-34-320.3,0C66,119.1,0,59.7,0,59.7V0h1000v59.7 c0,0-62.1,26.1-94.9,29.3c-32.8,3.3-62.8-12.3-75.8-22.1C806,49.6,745.3,8.7,694.9,4.7S492.4,59,473,67.3z',
    opacity: 0.33,
  },
  {
    d: 'M734,67.3c-45.5,0-77.2-23.2-129.1-39.1c-28.6-8.7-150.3-10.1-254,39.1 s-91.7-34.4-149.2,0C115.7,118.3,0,39.8,0,39.8V0h1000v36.5c0,0-28.2-18.5-92.1-18.5C810.2,18.1,775.7,67.3,734,67.3z',
    opacity: 0.66,
  },
  {
    d: 'M766.1,28.9c-200-57.5-266,65.5-395.1,19.5C242,1.8,242,5.4,184.8,20.6C128,35.8,132.3,44.9,89.9,52.5C28.6,63.7,0,0,0,0 h1000c0,0-9.9,40.9-83.6,48.1S829.6,47,766.1,28.9z',
    opacity: 1,
  },
]

// Pill buttons sit on the same orange as the band and are defined purely by
// their glow, exactly as on the original. Exported so every consumer styles
// its triggers identically.
export const WAVE_CTA_BUTTON_CLASS =
  'cursor-pointer rounded-[30px] bg-primary px-5 py-3.5 text-lg leading-[23.4px] font-semibold text-primary-foreground shadow-[0_0_10px_rgba(0,0,0,0.5)] transition hover:opacity-90'

type WaveLayerProps = {
  d: string
  opacity: number
}

const renderBottomLayer = ({ d, opacity }: WaveLayerProps, index: number) => (
  <path className="fill-background" d={d} key={index} opacity={opacity} />
)

type WaveCtaBandProps = {
  children: React.ReactNode
  heading: string
  text: string
}

export const WaveCtaBand: React.FC<WaveCtaBandProps> = ({ children, heading, text }) => (
  // Vertical rhythm measured off the live page at 1440px: 59 / 30 / 50 / 86 px,
  // which adds up to its 372px band.
  <section className="relative bg-primary pt-14.75 pb-21.5">
    {/* The extra 1.3px of width and the -1px offset kill the hairline gap
        browsers leave between an SVG edge and the section it sits on. */}
    <div className="pointer-events-none absolute -top-px left-0 h-[54px] w-full overflow-hidden">
      <svg
        className="block h-full w-[calc(100%+1.3px)] -scale-x-100"
        preserveAspectRatio="none"
        viewBox={WAVE_VIEW_BOX}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path className="fill-background" d={TOP_WAVE_PATH} />
      </svg>
    </div>

    <div className="relative z-10 container max-w-[925px] text-center">
      <h2 className="text-3xl leading-[1.2] font-semibold text-black md:text-[36px]">{heading}</h2>

      {/* Capped so the sentence breaks onto two lines as it does on the
          original, which forces the break with a hard <br> we do not want in a
          translated string. */}
      <p className="mx-auto mt-7.5 max-w-200 text-lg leading-[1.4] text-black">{text}</p>

      <div className="mt-12.5 flex flex-wrap items-center justify-center gap-5">{children}</div>
    </div>

    <div className="pointer-events-none absolute -bottom-px left-0 h-[184px] w-full rotate-180 overflow-hidden">
      <svg
        className="block h-full w-[calc(146.09%+1.3px)] -scale-x-100"
        preserveAspectRatio="none"
        viewBox={WAVE_VIEW_BOX}
        xmlns="http://www.w3.org/2000/svg"
      >
        {BOTTOM_WAVE_LAYERS.map(renderBottomLayer)}
      </svg>
    </div>
  </section>
)
