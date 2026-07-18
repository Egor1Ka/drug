import React from 'react'

type VideoEmbedProps = {
  title: string
  videoId: string
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({ title, videoId }) => (
  <div className="overflow-hidden rounded-xl shadow-lg">
    <iframe
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="aspect-video w-full"
      loading="lazy"
      src={`https://www.youtube-nocookie.com/embed/${videoId}`}
      title={title}
    />
  </div>
)
