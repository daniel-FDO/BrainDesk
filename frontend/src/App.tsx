import { useEffect, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar.tsx'
import { Splash } from './components/Splash.tsx'
import { TopBar } from './components/TopBar.tsx'
import { FocusTimerProvider } from './context/FocusTimer.tsx'
import { MindfulBreakProvider } from './context/MindfulBreak.tsx'
import { ProfileProvider } from './context/Profile.tsx'
import { useIsLoggedIn } from './hooks/useAuth.ts'
import { useHashRoute } from './hooks/useHashRoute.ts'
import { useNotes } from './hooks/useNotes.ts'
import { useUpcomingSessions } from './hooks/useUpcomingSessions.ts'
import { Assistant } from './pages/Assistant.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Login } from './pages/Login.tsx'
import { Notes } from './pages/Notes.tsx'
import { Planner } from './pages/Planner.tsx'
import { Resources } from './pages/Resources.tsx'
import { Settings } from './pages/Settings.tsx'
import { Topics } from './pages/Topics.tsx'

const TITLES = {
  dashboard: 'Dashboard',
  notes: 'Notes',
  topics: 'Subjects & Topics',
  planner: 'Study Planner',
  assistant: 'AI Assistant',
  resources: 'Resources',
  settings: 'Settings',
} as const

/** Plays the intro, then shows the login screen until there's a token, then the app. */
export default function App() {
  const loggedIn = useIsLoggedIn()
  return <Splash>{loggedIn ? <Workspace /> : <Login />}</Splash>
}

function Workspace() {
  const [route, navigate] = useHashRoute()
  const [menuOpen, setMenuOpen] = useState(false)
  const notesStore = useNotes()
  const { notes } = notesStore
  const upcoming = useUpcomingSessions()
  const [chosenNoteId, setSelectedNoteId] = useState<string | null>(null)
  // Until the user picks one, the most recently edited note is selected.
  const selectedNoteId = chosenNoteId && notes.some((n) => n.id === chosenNoteId) ? chosenNoteId : (notes[0]?.id ?? null)
  const [noteQuery, setNoteQuery] = useState('')
  const [assistantPrompt, setAssistantPrompt] = useState<string | null>(null)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = `${TITLES[route]} · BrainDesk`
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [route])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  async function createNote() {
    try {
      const note = await notesStore.create()
      setSelectedNoteId(note.id)
      setNoteQuery('')
      navigate('notes')
    } catch {
      window.alert('Couldn’t create a note. Check your connection and try again.')
    }
  }

  function openNote(id: string) {
    setSelectedNoteId(id)
    setNoteQuery('')
    navigate('notes')
  }

  function search(query: string) {
    setNoteQuery(query)
    navigate('notes')
  }

  function askAssistant(prompt: string) {
    setAssistantPrompt(prompt)
    navigate('assistant')
  }

  return (
    <ProfileProvider>
      <FocusTimerProvider>
        <MindfulBreakProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <div className="app">
            <Sidebar route={route} open={menuOpen} onClose={() => setMenuOpen(false)} />
            <div className="app__main">
              <TopBar
                onMenu={() => setMenuOpen(true)}
                menuOpen={menuOpen}
                onSearch={search}
                onCreateNote={createNote}
                upcoming={upcoming.sessions}
                pageTitle={TITLES[route]}
              />
              <main id="main" ref={mainRef} tabIndex={-1} className="page">
                {route === 'dashboard' && (
                  <Dashboard
                    notes={notes}
                    notesStatus={notesStore.status}
                    upcoming={upcoming.sessions}
                    onNavigate={navigate}
                    onCreateNote={createNote}
                    onOpenNote={openNote}
                    onAskAssistant={askAssistant}
                  />
                )}
                {route === 'notes' && (
                  <Notes
                    notes={notes}
                    status={notesStore.status}
                    saveState={notesStore.saveState}
                    onUpdate={notesStore.update}
                    onDelete={notesStore.remove}
                    selectedId={selectedNoteId}
                    onSelect={setSelectedNoteId}
                    query={noteQuery}
                    onQueryChange={setNoteQuery}
                    onCreateNote={createNote}
                    onAskAssistant={askAssistant}
                  />
                )}
                {route === 'topics' && <Topics onNavigate={navigate} onAskAssistant={askAssistant} />}
                {route === 'planner' && <Planner onNavigate={navigate} onSessionsChanged={upcoming.refresh} />}
                {route === 'assistant' && (
                  <Assistant
                    notes={notes}
                    upcoming={upcoming.sessions}
                    onOpenNote={openNote}
                    initialPrompt={assistantPrompt}
                    onInitialPromptUsed={() => setAssistantPrompt(null)}
                  />
                )}
                {route === 'resources' && <Resources />}
                {route === 'settings' && <Settings />}
              </main>
            </div>
          </div>
        </MindfulBreakProvider>
      </FocusTimerProvider>
    </ProfileProvider>
  )
}
