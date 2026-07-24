import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { findEmailFieldName } from '@frontend/_features/forms/client'
import { NewsletterSignup } from '@frontend/_features/layout/ui/NewsletterSignup'
import type { Form } from '@/payload-types'

// Реальный RichText тянет @payloadcms/ui (scss) — jsdom его не переварит.
// Тест проверяет поведение формы, а не lexical-рендеринг, поэтому мокаем
// компонент простым рендером текстовых узлов дерева. Фабрика vi.mock
// хоистится, поэтому она самодостаточна — без ссылок на внешние переменные.
vi.mock('@/components/RichText', () => {
  type LexicalNode = { children?: LexicalNode[]; text?: string }

  const collectLexicalText = (node: LexicalNode): string => {
    const ownText = node.text || ''
    const childTexts = (node.children || []).map(collectLexicalText)

    return ownText + childTexts.join('')
  }

  const RichTextMock = ({ data }: { data: { root: LexicalNode } }) => (
    <div>{collectLexicalText(data.root)}</div>
  )

  return { default: RichTextMock }
})

afterEach(cleanup)

// Success-текст задаёт редактор в админке (confirmationMessage формы),
// поэтому в фикстуре — lexical-документ, а не строка из переводов.
const confirmationMessage = {
  root: {
    children: [
      {
        children: [{ text: 'Thanks! Check your inbox.', type: 'text', version: 1 }],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

const form = {
  confirmationMessage,
  confirmationType: 'message',
  fields: [
    { blockType: 'text', id: 'f0', name: 'firstName', required: false },
    { blockType: 'email', id: 'f1', name: 'email', required: true },
  ],
  id: 'form-1',
  submitButtonLabel: 'Subscribe',
  title: 'Newsletter',
} as unknown as Form

const MESSAGES = {
  Layout: {
    newsletterError: 'Something went wrong. Please try again.',
    newsletterPlaceholder: 'Your email',
    newsletterSending: 'Sending...',
    newsletterSubmit: 'Subscribe',
  },
}

const renderSignup = () =>
  render(
    <NextIntlClientProvider locale="en" messages={MESSAGES}>
      <NewsletterSignup form={form} heading="Sign up and receive the latest tips via email" />
    </NextIntlClientProvider>,
  )

describe('findEmailFieldName', () => {
  it('returns the name of the first email field', () => {
    expect(findEmailFieldName(form)).toBe('email')
  })

  it('returns null when the form has no email field', () => {
    const withoutEmail = { fields: [{ blockType: 'text', id: 'x', name: 'note' }] } as unknown as Form

    expect(findEmailFieldName(withoutEmail)).toBeNull()
  })
})

describe('NewsletterSignup', () => {
  it('renders the heading and the submit label from the form', () => {
    renderSignup()

    expect(screen.getByText('Sign up and receive the latest tips via email')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeTruthy()
  })

  it('posts the email to the form-submissions endpoint and shows success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByPlaceholderText('Your email'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('/api/form-submissions')
    expect(JSON.parse(options.body)).toEqual({
      form: 'form-1',
      submissionData: [{ field: 'email', value: 'a@b.com' }],
    })

    // Success-текст пришёл из confirmationMessage формы, а не из переводов.
    await waitFor(() => expect(screen.getByText('Thanks! Check your inbox.')).toBeTruthy())

    vi.unstubAllGlobals()
  })

  it('shows an error message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByPlaceholderText('Your email'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))

    await waitFor(() =>
      expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy(),
    )

    vi.unstubAllGlobals()
  })

  it('renders nothing when the form has no email field', () => {
    const withoutEmail = {
      fields: [{ blockType: 'text', id: 'x', name: 'note' }],
      id: 'form-2',
      title: 'No email',
    } as unknown as Form

    const { container } = render(
      <NextIntlClientProvider locale="en" messages={MESSAGES}>
        <NewsletterSignup form={withoutEmail} heading="Never shown" />
      </NextIntlClientProvider>,
    )

    expect(container.firstChild).toBeNull()
    expect(screen.queryByPlaceholderText('Your email')).toBeNull()
  })
})
