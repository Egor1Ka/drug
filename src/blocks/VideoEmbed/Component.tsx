import React from 'react'

import type { VideoEmbedBlock as VideoEmbedBlockProps } from '@/payload-types'

const YOUTUBE_ID_PATTERNS = [
  /youtube\.com\/watch\?v=([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
  /youtube-nocookie\.com\/embed\/([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
]

const extractYouTubeId = (url: string) => {
  const matchAgainstUrl = (pattern: RegExp) => url.match(pattern)
  const matched = YOUTUBE_ID_PATTERNS.map(matchAgainstUrl).find(Boolean)
  return matched ? matched[1] : null
}

type Props = VideoEmbedBlockProps & { className?: string }

export const VideoEmbedBlock: React.FC<Props> = ({ caption, className, videoUrl }) => {
  const videoId = extractYouTubeId(videoUrl)
  if (!videoId) return null

  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-xl shadow-lg">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
          loading="lazy"
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          title={caption || 'Video'}
        />
      </div>
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
