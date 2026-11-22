import { useState, type FormEvent } from 'react'
import { logout } from '../lib/api.ts'
import { Menu } from './Menu.tsx'
import { Icon } from './ui.tsx'
import type { StudySession } from '../types.ts'

interface TopBarProps {
  onMenu: () => void
  menuOpen: boolean
  onSearch: (query: string) => void
  onCreateNote: () => void
  upcoming: StudySession[]
  /** Current page, shown in the breadcrumb. */
  pageTitle: string
}

export function TopBar({ onMenu, menuOpen, onSearch, onCreateNote, upcoming, pageTitle }: TopBarProps) {
  const [query, setQuery] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    onSearch(query.trim())
  }

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn topbar__menu"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-expanded={menuOpen}
        aria-controls="sidebar"
      >
        <Icon name="menu" />
      </button>

      <nav className="crumbs mono" aria-label="Breadcrumb">
        <span>Workspace</span>
        <Icon name="chevron_right" />
        <span className="crumbs__current" aria-current="location">
          {pageTitle}
        </span>
      </nav>

      <form className="search topbar__search" role="search" onSubmit={submit}>
        <Icon name="search" />
        <label className="sr-only" htmlFor="global-search">
          Search notes, lectures, concepts
        </label>
        <input
          id="global-search"
          type="search"
          placeholder="Search notes, lectures, concepts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <div className="topbar__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={onCreateNote}>
          <Icon name="add" />
          <span className="hide-sm">Create note</span>
        </button>
        <Menu
          label="Notifications"
          trigger={<Icon name="notifications" />}
          heading="Upcoming sessions"
          items={
            upcoming.length
              ? upcoming.slice(0, 5).map((s) => ({
                  label: s.title,
                  detail: `${s.when} · ${s.minutes} min`,
                  icon: 'event',
                  href: '#/planner',
                }))
              : [{ label: 'Nothing scheduled', detail: 'Plan a session in the planner', icon: 'event_available', href: '#/planner' }]
          }
        />
        <Menu
          label="Account"
          trigger={<Icon name="person" filled />}
          triggerClassName="avatar avatar--sm"
          items={[
            { label: 'Profile & settings', icon: 'settings', href: '#/settings' },
            { label: 'Sign out', icon: 'logout', onSelect: logout, danger: true },
          ]}
        />
      </div>
    </header>
  )
}
