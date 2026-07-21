import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { SiteLogo } from '@frontend/_features/layout/ui/SiteLogo'

afterEach(cleanup)

describe('SiteLogo', () => {
  it('renders the colored logo by default', () => {
    render(<SiteLogo />)

    const image = screen.getByAltText('DrugCard') as HTMLImageElement

    expect(image.getAttribute('src')).toBe('/logo-drugcard.svg')
  })

  it('renders the white logo for the white variant', () => {
    render(<SiteLogo variant="white" />)

    const image = screen.getByAltText('DrugCard') as HTMLImageElement

    expect(image.getAttribute('src')).toBe('/logo-drugcard-white.svg')
  })

  it('merges a custom className', () => {
    render(<SiteLogo className="h-6" />)

    const image = screen.getByAltText('DrugCard')

    expect(image.className.includes('h-6')).toBe(true)
  })
})
