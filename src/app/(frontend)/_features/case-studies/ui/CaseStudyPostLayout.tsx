import React from 'react'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => <div className="pt-24 pb-24">{children}</div>

const Header: React.FC<SlotProps> = ({ children }) => (
  <div className="container mb-8">{children}</div>
)

const Snapshot: React.FC<SlotProps> = ({ children }) => (
  <div className="container mb-12">
    <div className="mx-auto max-w-[48rem]">{children}</div>
  </div>
)

const Content: React.FC<SlotProps> = ({ children }) => <div className="container">{children}</div>

const Cta: React.FC<SlotProps> = ({ children }) => (
  <div className="container mt-16">{children}</div>
)

export const CaseStudyPostLayout = Object.assign(Root, { Content, Cta, Header, Snapshot })
