import { create } from "zustand"

interface UserDetails {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface UserStore {
  user: UserDetails | null
  setUser: (user: UserDetails) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))
