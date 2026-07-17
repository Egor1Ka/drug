import { describe, expect, it } from 'vitest'

import type { Post } from '@/payload-types'

import { calculateReadTime } from '@/utilities/readTime'

const textNode = (text: string) => ({ type: 'text', version: 1, text })

const paragraphNode = (text: string) => ({
  type: 'paragraph',
  version: 1,
  children: [textNode(text)],
})

const buildContent = (paragraphs: string[]): Post['content'] =>
  ({
    root: {
      type: 'root',
      children: paragraphs.map(paragraphNode),
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }) as Post['content']

const toWord = (_: unknown, index: number): string => `word${index}`
const wordsOf = (count: number): string => Array.from({ length: count }, toWord).join(' ')

describe('calculateReadTime', () => {
  it('returns 1 minute minimum for short content', () => {
    expect(calculateReadTime(buildContent(['hello world']))).toBe(1)
  })

  it('rounds up at 200 words per minute', () => {
    expect(calculateReadTime(buildContent([wordsOf(401)]))).toBe(3)
  })

  it('counts words across nested children', () => {
    expect(calculateReadTime(buildContent([wordsOf(150), wordsOf(150)]))).toBe(2)
  })

  it('returns 1 minute for empty content', () => {
    expect(calculateReadTime(buildContent([]))).toBe(1)
  })
})
