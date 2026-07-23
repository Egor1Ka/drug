import React from 'react'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => <div className="pt-24 pb-24">{children}</div>

const Header: React.FC<SlotProps> = ({ children }) => (
  <div className="container mb-10">{children}</div>
)

const Content: React.FC<SlotProps> = ({ children }) => <div className="container">{children}</div>

export const CaseStudyListingLayout = Object.assign(Root, { Content, Header })
