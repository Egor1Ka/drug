import React from 'react'

import type { Author } from '@/payload-types'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { Show } from '@frontend/_shared/ui/Show'

const AuthorBio: React.FC<{ bio: Author['bio'] }> = ({ bio }) => {
  if (!bio) return null

  return <RichText className="basis-full" data={bio} enableGutter={false} />
}

export const AuthorProfile: React.FC<{ author: Author }> = ({ author }) => {
  const { avatar, bio, name, title } = author
  const avatarObject = avatar && typeof avatar === 'object' ? avatar : null

  return (
    <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
      <Show when={avatarObject}>
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
          <Media fill imgClassName="object-cover" resource={avatarObject} size="96px" />
        </div>
      </Show>

      <div>
        <h1 className="text-4xl font-bold">{name}</h1>
        <Show when={title}>
          <p className="mt-2 text-lg text-muted-foreground">{title}</p>
        </Show>
      </div>

      <AuthorBio bio={bio} />
    </div>
  )
}
