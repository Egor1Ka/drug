import type { Block } from 'payload'

export const VideoEmbed: Block = {
  slug: 'videoEmbed',
  interfaceName: 'VideoEmbedBlock',
  fields: [
    {
      name: 'videoUrl',
      type: 'text',
      required: true,
      admin: {
        description: 'YouTube link in any form: watch, share (youtu.be) or embed URL.',
      },
    },
    {
      name: 'caption',
      type: 'text',
      admin: {
        description: 'Optional caption shown under the player; also used as the iframe title.',
      },
    },
  ],
}
