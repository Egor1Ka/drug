import React from 'react'

type SlotProps = {
  children: React.ReactNode
}

const Root: React.FC<SlotProps> = ({ children }) => (
  <header className="sticky top-0 z-40 border-b border-border bg-background">
    <div className="container flex h-20 items-center justify-between gap-6">{children}</div>
  </header>
)

const Logo: React.FC<SlotProps> = ({ children }) => (
  <div className="flex shrink-0 items-center">{children}</div>
)

const Nav: React.FC<SlotProps> = ({ children }) => (
  <div className="hidden flex-1 justify-center lg:flex">{children}</div>
)

const Actions: React.FC<SlotProps> = ({ children }) => (
  <div className="flex shrink-0 items-center gap-3">{children}</div>
)

export const HeaderLayout = Object.assign(Root, { Actions, Logo, Nav })
