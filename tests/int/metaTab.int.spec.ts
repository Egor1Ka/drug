import { describe, expect, it } from 'vitest'

import type { Field, Tab } from 'payload'

import { metaTab } from '@/fields/metaTab'

type NamedField = Extract<Field, { name: string }>

const isNamedField = (field: Field): field is NamedField => 'name' in field

const nameEquals = (name: string) => (field: NamedField) => field.name === name

const tabName = (tab: Tab): string | undefined => ('name' in tab ? tab.name : undefined)

const findFieldByName = (name: string): NamedField | undefined =>
  metaTab.fields.filter(isNamedField).find(nameEquals(name))

const isLocalized = (field: Field | undefined): boolean =>
  !!field && 'localized' in field && field.localized === true

const relationTargetOf = (field: Field | undefined): unknown =>
  field && 'relationTo' in field ? field.relationTo : null

describe('metaTab', () => {
  it('is the SEO tab named meta', () => {
    expect(tabName(metaTab)).toBe('meta')
    expect(metaTab.label).toBe('SEO')
  })

  it('localizes title and description', () => {
    expect(isLocalized(findFieldByName('title'))).toBe(true)
    expect(isLocalized(findFieldByName('description'))).toBe(true)
  })

  it('points the image field at the media collection', () => {
    expect(relationTargetOf(findFieldByName('image'))).toBe('media')
  })
})
