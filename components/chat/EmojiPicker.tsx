'use client'

import { useState } from 'react'

const EMOTICONS_2009 = [
  { code: ':)', label: 'Feliz' },
  { code: ':D', label: 'Risa' },
  { code: ':P', label: 'Lengua' },
  { code: ';)', label: 'Guiño' },
  { code: ':(', label: 'Triste' },
  { code: ':O', label: 'Sorpresa' },
  { code: ':S', label: 'Confuso' },
  { code: 'xD', label: 'Carcajada' },
  { code: ":'(", label: 'Llanto' },
  { code: ':*', label: 'Beso' },
  { code: ':$', label: 'Vergüenza' },
  { code: '<3', label: 'Corazón' },
  { code: ':@', label: 'Enojo' },
  { code: ':|', label: 'Serio' },
  { code: ':/', label: 'Duda' },
  { code: '^_^', label: 'Feliz 2' },
  { code: 'O:)', label: 'Ángel' },
  { code: '3:)', label: 'Diablito' },
  { code: ':3', label: 'Gatito' },
  { code: ':B', label: 'Dientes' },
  { code: '-_-', label: 'Dormido' },
  { code: '>:(', label: 'Enojado' },
  { code: 'o.O', label: 'What' },
  { code: ':v', label: 'Pacman' },
]

interface EmojiPickerProps {
  onSelect: (code: string) => void
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="retro-btn retro-btn-secondary text-xs px-2 py-1"
        title="Emoticones 2009"
      >
        😊
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic afuera */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Picker */}
          <div className="absolute bottom-full left-0 mb-1 z-50 retro-panel p-2 shadow-2xl"
            style={{ minWidth: '200px' }}>
            <div className="text-xs text-gray-500 mb-1 px-1 font-bold">
              MSN Emoticones 2009
            </div>
            <div className="grid grid-cols-6 gap-0.5">
              {EMOTICONS_2009.map(emoji => (
                <button
                  key={emoji.code}
                  type="button"
                  onClick={() => {
                    onSelect(emoji.code)
                    setIsOpen(false)
                  }}
                  className="text-xs px-1.5 py-1 rounded hover:bg-blue-100 transition-colors text-center"
                  title={emoji.label}
                >
                  {emoji.code}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
