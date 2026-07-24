'use client'

import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import React from 'react'

import RichText from '@/components/RichText'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Form } from '@/payload-types'
import { Show } from '@frontend/_shared/ui/Show'

import { buildSubmissionData } from '../helpers/fields'
import { useFormSubmission } from '../hooks/useFormSubmission'

type FormFieldBlock = NonNullable<Form['fields']>[number]
type FieldOfType<BlockType extends FormFieldBlock['blockType']> = Extract<
  FormFieldBlock,
  { blockType: BlockType }
>

const DEFAULT_SUBMIT_LABEL = 'Send'
const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.'

// Native select styled to match the ui Input control.
const SELECT_CLASSES =
  'border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] focus-visible:ring-4 focus-visible:outline-1 md:text-sm'

const labelText = (field: { label?: string | null; name: string }) => field.label || field.name

const FieldLabel: React.FC<{
  htmlFor: string
  label: string
  required?: boolean | null
}> = ({ htmlFor, label, required }) => (
  <Label htmlFor={htmlFor}>
    {label}
    <Show when={required}>
      <span className="text-primary"> *</span>
    </Show>
  </Label>
)

const TextInputField: React.FC<{ field: FieldOfType<'text'> }> = ({ field }) => (
  <div className="space-y-1.5">
    <FieldLabel htmlFor={field.name} label={labelText(field)} required={field.required} />
    <Input
      defaultValue={field.defaultValue || ''}
      id={field.name}
      name={field.name}
      required={!!field.required}
      type="text"
    />
  </div>
)

const EmailInputField: React.FC<{ field: FieldOfType<'email'> }> = ({ field }) => (
  <div className="space-y-1.5">
    <FieldLabel htmlFor={field.name} label={labelText(field)} required={field.required} />
    <Input id={field.name} name={field.name} required={!!field.required} type="email" />
  </div>
)

const TextareaField: React.FC<{ field: FieldOfType<'textarea'> }> = ({ field }) => (
  <div className="space-y-1.5">
    <FieldLabel htmlFor={field.name} label={labelText(field)} required={field.required} />
    <Textarea
      defaultValue={field.defaultValue || ''}
      id={field.name}
      name={field.name}
      required={!!field.required}
    />
  </div>
)

const SelectField: React.FC<{ field: FieldOfType<'select'> }> = ({ field }) => {
  const options = field.options || []
  const toOption = (option: { label: string; value: string }) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  )

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={field.name} label={labelText(field)} required={field.required} />
      <select
        className={SELECT_CLASSES}
        defaultValue={field.defaultValue || ''}
        id={field.name}
        name={field.name}
        required={!!field.required}
      >
        <option value="">{labelText(field)}</option>
        {options.map(toOption)}
      </select>
    </div>
  )
}

const CheckboxField: React.FC<{ field: FieldOfType<'checkbox'> }> = ({ field }) => (
  <div className="flex items-center gap-2">
    <Checkbox
      defaultChecked={!!field.defaultValue}
      id={field.name}
      name={field.name}
      required={!!field.required}
    />
    <FieldLabel htmlFor={field.name} label={labelText(field)} required={field.required} />
  </div>
)

const FIELD_COMPONENTS = {
  checkbox: CheckboxField,
  email: EmailInputField,
  select: SelectField,
  text: TextInputField,
  textarea: TextareaField,
} as const

type RenderableBlockType = keyof typeof FIELD_COMPONENTS

const isRenderableField = (
  field: FormFieldBlock,
): field is Extract<FormFieldBlock, { blockType: RenderableBlockType }> =>
  field.blockType in FIELD_COMPONENTS

const FormField: React.FC<{ field: FormFieldBlock }> = ({ field }) => {
  if (!isRenderableField(field)) return null

  const FieldControl = FIELD_COMPONENTS[field.blockType] as React.FC<{ field: FormFieldBlock }>
  return <FieldControl field={field} />
}

type FormRendererProps = {
  errorMessage?: string
  form: Form
  submittingLabel?: string
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  errorMessage = DEFAULT_ERROR_MESSAGE,
  form,
  submittingLabel,
}) => {
  const { state, submit } = useFormSubmission(form)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit(buildSubmissionData(new FormData(event.currentTarget)))
  }

  const fields = form.fields || []
  const submitLabel = form.submitButtonLabel || DEFAULT_SUBMIT_LABEL
  const buttonLabel = state === 'sending' ? submittingLabel || submitLabel : submitLabel

  const toFormField = (field: FormFieldBlock, index: number) => (
    <FormField field={field} key={field.id || index} />
  )

  return (
    <div>
      <Show when={state === 'success' && !!form.confirmationMessage}>
        <RichText
          data={form.confirmationMessage as DefaultTypedEditorState}
          enableGutter={false}
          enableProse
        />
      </Show>

      <Show when={state !== 'success'}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {fields.map(toFormField)}

          <Show when={state === 'error'}>
            <p className="text-sm text-destructive">{errorMessage}</p>
          </Show>

          <button
            className="w-full cursor-pointer rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-default disabled:opacity-60"
            disabled={state === 'sending'}
            type="submit"
          >
            {buttonLabel}
          </button>
        </form>
      </Show>
    </div>
  )
}
