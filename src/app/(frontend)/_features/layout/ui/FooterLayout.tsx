import React from 'react'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => (
  <footer className="mt-auto bg-black text-white">
    <div className="container py-14">{children}</div>
  </footer>
)

const Top: React.FC<SlotProps> = ({ children }) => (
  <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">{children}</div>
)

const Contacts: React.FC<SlotProps> = ({ children }) => <div>{children}</div>

const Columns: React.FC<SlotProps> = ({ children }) => <div>{children}</div>

const Newsletter: React.FC<SlotProps> = ({ children }) => (
  <div className="mt-12 border-t border-white/10 pt-8">{children}</div>
)

const Socials: React.FC<SlotProps> = ({ children }) => <div className="mt-8">{children}</div>

const Legal: React.FC<SlotProps> = ({ children }) => (
  <div className="mt-8 border-t border-white/10 pt-6">{children}</div>
)

export const FooterLayout = Object.assign(Root, {
  Columns,
  Contacts,
  Legal,
  Newsletter,
  Socials,
  Top,
})
