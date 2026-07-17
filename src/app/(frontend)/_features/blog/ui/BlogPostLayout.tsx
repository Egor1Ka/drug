import React from 'react'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => (
  <article className="pt-16 pb-16">{children}</article>
)

const Header: React.FC<SlotProps> = ({ children }) => (
  <header className="container">
    <div className="mx-auto max-w-[48rem]">{children}</div>
  </header>
)

const Content: React.FC<SlotProps> = ({ children }) => (
  <div className="container pt-8">{children}</div>
)

const Similar: React.FC<SlotProps> = ({ children }) => (
  <section className="container mt-16">{children}</section>
)

export const BlogPostLayout = Object.assign(Root, { Content, Header, Similar })
