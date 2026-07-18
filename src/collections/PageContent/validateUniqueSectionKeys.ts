type SectionRow = { sectionKey?: unknown }

const toSectionKey = (section: SectionRow) => section.sectionKey

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const findDuplicateKey = (keys: string[]) => {
  const isSeenEarlier = (key: string, index: number) => keys.indexOf(key) !== index

  return keys.find(isSeenEarlier)
}

export const validateUniqueSectionKeys = (value: unknown): true | string => {
  if (!Array.isArray(value)) return true

  const sectionKeys = value.map(toSectionKey).filter(isNonEmptyString)
  const duplicateKey = findDuplicateKey(sectionKeys)

  if (duplicateKey) {
    return `Duplicate sectionKey "${duplicateKey}" — section keys must be unique within a page`
  }

  return true
}
