import React, { Fragment } from 'react'

export const Show: React.FC<{ children: React.ReactNode; when: unknown }> = ({
  children,
  when,
}) => {
  if (!when) return null

  return <Fragment>{children}</Fragment>
}
