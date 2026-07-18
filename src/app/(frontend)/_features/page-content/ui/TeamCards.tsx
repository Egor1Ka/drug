import { Linkedin } from 'lucide-react'
import React from 'react'

import { Media } from '@/components/Media'
import type { TeamSectionBlock } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

type TeamMember = TeamSectionBlock['items'][number]

const renderTeamMember = (member: TeamMember, index: number) => (
  <li
    className="flex flex-col items-center rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-sm"
    key={member.id || index}
  >
    <Show when={!!member.photo}>
      <div className="relative h-44 w-44 overflow-hidden rounded-full bg-muted">
        <Media fill imgClassName="object-cover" resource={member.photo} />
      </div>
    </Show>
    <h3 className="mt-7 text-lg font-bold text-foreground">{member.name}</h3>
    <p className="mt-2 text-muted-foreground">{member.role}</p>
    <Show when={!!member.description}>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{member.description}</p>
    </Show>
    <Show when={!!member.linkedinUrl}>
      <a
        aria-label={`${member.name} on LinkedIn`}
        className="mt-6 text-foreground transition hover:text-primary"
        href={member.linkedinUrl || ''}
        rel="noreferrer"
        target="_blank"
      >
        <Linkedin className="h-7 w-7" />
      </a>
    </Show>
  </li>
)

export const TeamCards: React.FC<{ section: TeamSectionBlock }> = ({ section }) => (
  <div>
    <Show when={!!section.heading}>
      <h2 className="mb-12 text-center text-3xl font-semibold text-foreground md:text-4xl">
        {section.heading}
      </h2>
    </Show>
    <ul className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
      {section.items.map(renderTeamMember)}
    </ul>
  </div>
)
