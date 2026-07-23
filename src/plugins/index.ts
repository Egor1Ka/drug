import { fields as formFieldBlocks, formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { Block, CollectionAfterChangeHook, Field, Plugin } from 'payload'
import { revalidateTag } from 'next/cache'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { Author, News, PageContent, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { pageKeyToPath } from '@/utilities/pageKeyToPath'

type SeoDoc = Author | News | PageContent | Post

const getDocLabel = (doc?: SeoDoc) => {
  if (doc && 'title' in doc && doc.title) return doc.title
  if (doc && 'name' in doc && doc.name) return doc.name
  return undefined
}

const generateTitle: GenerateTitle<SeoDoc> = ({ doc }) => {
  const label = getDocLabel(doc)
  return label ? `${label} | Payload Website Template` : 'Payload Website Template'
}

const generateURL: GenerateURL<SeoDoc> = ({ collectionConfig, doc }) => {
  const url = getServerSideURL()

  if (collectionConfig?.slug === 'authors' && doc && 'slug' in doc && doc.slug) {
    return `${url}/blog/author/${doc.slug}`
  }

  if (collectionConfig?.slug === 'news' && doc && 'slug' in doc && doc.slug) {
    return `${url}/news/${doc.slug}`
  }

  if (doc && 'pageKey' in doc && doc.pageKey) {
    return `${url}${pageKeyToPath(doc.pageKey)}`
  }

  return doc && 'slug' in doc && doc.slug ? `${url}/${doc.slug}` : url
}

// Stable key the frontend references a form by (e.g. 'contact-us').
const formSlugField: Field = {
  name: 'slug',
  type: 'text',
  index: true,
  required: true,
  unique: true,
  admin: {
    description: 'Stable key the code references this form by (e.g. "contact-us").',
  },
}

// Inferred return types keep TS from applying fresh-literal excess-property
// checks against the whole Field union (mirrors the template's inline mapper).
const localizeFormField = (field: Field) => ({ ...field, localized: true })

// Preserve the template's richText toolbar override while turning on localization.
const localizeConfirmationMessage = (field: Field) => ({
  ...field,
  localized: true,
  editor: lexicalEditor({
    features: ({ rootFeatures }) => {
      return [
        ...rootFeatures,
        FixedToolbarFeature(),
        HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
      ]
    },
  }),
})

// Localize ONLY the human-facing texts inside a form-field block (label,
// placeholder, select option labels). The field structure — names, order,
// required — stays shared across locales, so the editor never has to
// duplicate fields per language.
const localizeBlockLabelFields = (blockFields: Field[]): Field[] =>
  blockFields.map(localizeLabelField)

const localizeLabelField = (field: Field): Field => {
  if (field.type === 'row' || field.type === 'collapsible') {
    return { ...field, fields: localizeBlockLabelFields(field.fields) }
  }
  if (!('name' in field) || typeof field.name !== 'string') return field
  if (field.name === 'label' || field.name === 'placeholder') {
    return { ...field, localized: true } as Field
  }
  if (field.name === 'options' && field.type === 'array') {
    return { ...field, fields: localizeBlockLabelFields(field.fields) }
  }
  return field
}

// The plugin officially exports its field block configs for exactly this kind
// of merging (see docs: "fields — values can be a boolean or a partial Block").
const localizeFormFieldBlock = (block: Block): Block => ({
  ...block,
  fields: localizeBlockLabelFields(block.fields),
})

const formFieldOverrides = {
  confirmationMessage: localizeConfirmationMessage,
  submitButtonLabel: localizeFormField,
}

const applyFormFieldOverride = (field: Field): Field => {
  if (!('name' in field) || typeof field.name !== 'string') return field

  const override = formFieldOverrides[field.name as keyof typeof formFieldOverrides]
  if (!override) return field

  // The transform only adds `localized`/`editor` to text, blocks and richText
  // fields, but TS widens `override` across the whole Field union.
  return override(field) as Field
}

const buildFormFields = ({ defaultFields }: { defaultFields: Field[] }): Field[] => [
  formSlugField,
  ...defaultFields.map(applyFormFieldOverride),
]

// Forms are embedded in the statically-prerendered layout and fetched through
// a tag-cached query (see forms/api/forms.ts), so invalidating the per-slug tag
// regenerates every locale of the prerender — mirrors revalidateHeader. The
// path-based revalidation this replaced never purged the dynamic-route
// prerender on Vercel.
const revalidateForm: CollectionAfterChangeHook = ({ doc, req: { context, payload } }) => {
  if (context.disableRevalidate) return doc

  payload.logger.info(`Revalidating form: ${doc.slug}`)

  revalidateTag(`form_${doc.slug}`, 'max')

  return doc
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      text: localizeFormFieldBlock(formFieldBlocks.text as Block),
      email: localizeFormFieldBlock(formFieldBlocks.email as Block),
      textarea: localizeFormFieldBlock(formFieldBlocks.textarea as Block),
      select: localizeFormFieldBlock(formFieldBlocks.select as Block),
      checkbox: localizeFormFieldBlock(formFieldBlocks.checkbox as Block),
      country: false,
      state: false,
      number: false,
      message: false,
      payment: false,
    },
    formOverrides: {
      fields: buildFormFields,
      hooks: {
        afterChange: [revalidateForm],
      },
    },
  }),
  vercelBlobStorage({
    collections: {
      media: true,
    },
    token: process.env.BLOB_READ_WRITE_TOKEN,
  }),
]
