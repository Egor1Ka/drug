import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  findEmailFieldName,
  NewsletterSignup,
} from '@frontend/_features/layout/ui/NewsletterSignup'
import type { Form } from '@/payload-types'

afterEach(cleanup)

const form = {
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
    newsletterSuccess: 'Thank you for subscribing!',
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

    await waitFor(() => expect(screen.getByText('Thank you for subscribing!')).toBeTruthy())

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
