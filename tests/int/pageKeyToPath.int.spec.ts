import { describe, expect, it } from 'vitest'

import { pageKeyToPath } from '@/utilities/pageKeyToPath'

describe('pageKeyToPath', () => {
  it('maps the home key to the site root', () => {
    expect(pageKeyToPath('home')).toBe('')
  })

  it('prefixes any other key with a slash', () => {
    expect(pageKeyToPath('pricing')).toBe('/pricing')
  })
})
