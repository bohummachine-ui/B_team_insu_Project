import { create } from 'zustand'
import type { AttendanceStatus } from '@/types'

interface AttendanceState {
  currentStatus: AttendanceStatus | null
  lastUpdated: string | null
  setStatus: (status: AttendanceStatus) => void
  reset: () => void
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  currentStatus: null,
  lastUpdated: null,
  setStatus: (status) =>
    set({ currentStatus: status, lastUpdated: new Date().toISOString() }),
  reset: () => set({ currentStatus: null, lastUpdated: null }),
}))
