import type { Post } from '@/payload-types'

type UnknownNode = { [key: string]: unknown }

const WORDS_PER_MINUTE = 200

const isText = (value: unknown): value is string => typeof value === 'string'
const isNodeArray = (value: unknown): value is UnknownNode[] => Array.isArray(value)

const collectText = (node: UnknownNode): string => {
  const ownText = isText(node.text) ? node.text : ''
  const children = isNodeArray(node.children) ? node.children : []
  const childTexts = children.map(collectText)

  return [ownText, ...childTexts].join(' ')
}

export const calculateReadTime = (content: Post['content']): number => {
  const text = collectText(content.root as unknown as UnknownNode)
  const words = text.split(/\s+/).filter(Boolean)

  return Math.max(1, Math.ceil(words.length / WORDS_PER_MINUTE))
}
