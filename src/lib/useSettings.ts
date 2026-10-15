import { useEffect, useState } from 'react'
import { loadSettings, onSettingsChange } from './settings'

export function useSettings() {
  const [s, setS] = useState(loadSettings)
  useEffect(() => onSettingsChange(() => setS(loadSettings())), [])
  return s
}
