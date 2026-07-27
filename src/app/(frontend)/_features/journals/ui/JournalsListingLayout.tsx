import React from 'react'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => <div className="pt-12">{children}</div>

const Breadcrumbs: React.FC<SlotProps> = ({ children }) => (
  <div className="container mb-10">{children}</div>
)

const Header: React.FC<SlotProps> = ({ children }) => (
  <div className="container mb-16 text-center">{children}</div>
)

const Content: React.FC<SlotProps> = ({ children }) => <div className="container">{children}</div>

const Cta: React.FC<SlotProps> = ({ children }) => <div className="mt-24">{children}</div>

export const JournalsListingLayout = Object.assign(Root, { Breadcrumbs, Content, Cta, Header })
