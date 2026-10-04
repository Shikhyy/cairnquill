/**
 * Cairnquill global state – role and demo mode only.
 * All server state uses TanStack Query.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'investigator' | 'approver' | 'auditor' | 'dev'
export type Theme = 'light' | 'dark'

interface AppStore {
  role: Role
  user: string
  theme: Theme
  demoMode: boolean

  setRole: (role: Role) => void
  setUser: (user: string) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setDemoMode: (v: boolean) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      role: 'investigator',
      user: 'demo_investigator',
      theme: 'dark',
      demoMode: true,

      setRole: (role) => {
        // Auto-assign a demo user matching the role
        const users: Record<Role, string> = {
          investigator: 'demo_investigator',
          approver: 'demo_approver',
          auditor: 'demo_auditor',
          dev: 'demo_dev',
        }
        set({ role, user: users[role] })
      },

      setUser: (user) => set({ user }),

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', next)
        set({ theme: next })
      },

      setDemoMode: (v) => set({ demoMode: v }),
    }),
    {
      name: 'cq-app-store',
      partialize: (s) => ({ role: s.role, user: s.user, theme: s.theme }),
    },
  ),
)

// Apply persisted theme on load
const stored = useAppStore.getState()
document.documentElement.setAttribute('data-theme', stored.theme)
