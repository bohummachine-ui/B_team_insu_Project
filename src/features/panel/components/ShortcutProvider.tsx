'use client'
import { useGlobalShortcut } from '../hooks/useGlobalShortcut'

export default function ShortcutProvider() {
  useGlobalShortcut()
  return null
}
