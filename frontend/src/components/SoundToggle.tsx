import { useState } from 'react'
import { sound } from '@/lib/soundEngine'
import { Volume2, VolumeX } from 'lucide-react'

export function SoundToggle() {
  const [muted, setMuted] = useState(sound.isMuted)

  const handleToggle = () => {
    const isNowMuted = sound.toggleMute()
    setMuted(isNowMuted)
  }

  return (
    <button
      onClick={handleToggle}
      className="p-1.5 rounded-md text-ink-2 hover:text-ink hover:bg-white/[0.05] transition-colors border border-transparent hover:border-hairline flex items-center justify-center"
      title={muted ? 'Unmute procedural audio' : 'Mute procedural audio'}
      aria-label={muted ? 'Unmute audio' : 'Mute audio'}
    >
      {muted ? (
        <VolumeX size={15} className="text-ink-faint" />
      ) : (
        <Volume2 size={15} className="text-ink-2" />
      )}
    </button>
  )
}
