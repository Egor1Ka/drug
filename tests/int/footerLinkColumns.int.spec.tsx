import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  FooterLinkColumns,
  type FooterLinkColumn,
} from '@frontend/_features/layout/ui/FooterLinkColumns'

afterEach(cleanup)

const columns: FooterLinkColumn[] = [
  {
    id: 'c1',
    links: [
      { id: 'l1', link: { label: 'Why DrugCard?', type: 'custom', url: '/why-drugcard' } },
      { id: 'l2', link: { label: 'Simple Search', type: 'custom', url: '/simple-search' } },
    ],
    title: 'Product',
  },
  {
    id: 'c2',
    links: [{ id: 'l3', link: { label: 'Blog', type: 'custom', url: '/blog' } }],
    title: 'Resources',
  },
]

describe('FooterLinkColumns', () => {
  it('renders a heading per column', () => {
    render(<FooterLinkColumns columns={columns} />)

    expect(screen.getByText('Product')).toBeTruthy()
    expect(screen.getByText('Resources')).toBeTruthy()
  })

  it('renders every link of every column', () => {
    render(<FooterLinkColumns columns={columns} />)

    expect(screen.getByRole('link', { name: 'Why DrugCard?' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Simple Search' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Blog' })).toBeTruthy()
  })

  it('renders a column with no links without crashing', () => {
    render(<FooterLinkColumns columns={[{ id: 'c3', title: 'Empty' }]} />)

    expect(screen.getByText('Empty')).toBeTruthy()
  })
})
