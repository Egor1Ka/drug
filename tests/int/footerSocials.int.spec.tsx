import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { FooterSocials } from '@frontend/_features/layout/ui/FooterSocials'

afterEach(cleanup)

describe('FooterSocials', () => {
  it('renders one external link per social entry', () => {
    render(
      <FooterSocials
        socials={[
          { id: '1', platform: 'linkedin', url: 'https://linkedin.com/company/drugcard' },
          { id: '2', platform: 'youtube', url: 'https://youtube.com/@drugcard' },
        ]}
      />,
    )

    const linkedin = screen.getByRole('link', { name: 'LinkedIn' })

    expect(linkedin.getAttribute('href')).toBe('https://linkedin.com/company/drugcard')
    expect(linkedin.getAttribute('target')).toBe('_blank')
    expect(linkedin.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByRole('link', { name: 'YouTube' })).toBeTruthy()
  })

  it('skips an entry whose platform has no icon', () => {
    render(
      <FooterSocials
        socials={[
          { id: '1', platform: 'tiktok' as 'linkedin', url: 'https://tiktok.com/@drugcard' },
          { id: '2', platform: 'facebook', url: 'https://facebook.com/drugcard' },
        ]}
      />,
    )

    expect(screen.getAllByRole('link').length).toBe(1)
    expect(screen.getByRole('link', { name: 'Facebook' })).toBeTruthy()
  })

  it('skips an entry with no url', () => {
    render(<FooterSocials socials={[{ id: '1', platform: 'telegram', url: '' }]} />)

    expect(screen.queryAllByRole('link').length).toBe(0)
  })
})
