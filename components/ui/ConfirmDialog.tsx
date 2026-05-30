'use client'

import { useState } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative retro-panel max-w-sm w-full mx-4 p-5 shadow-2xl">
        {/* Title bar estilo 2009 */}
        <div className="retro-header -m-5 mb-4 px-4 py-2 rounded-t-lg flex items-center">
          <span className="text-white text-xs font-bold">{title}</span>
        </div>

        <p className="text-sm text-gray-700 mb-5">{message}</p>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="retro-btn retro-btn-secondary text-xs"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`retro-btn text-xs ${danger ? 'retro-btn-danger' : 'retro-btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useConfirm() {
  const [state, setState] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmLabel?: string
    danger?: boolean
    resolve?: (value: boolean) => void
  }>({ isOpen: false, title: '', message: '' })

  const confirm = (title: string, message: string, danger = false, confirmLabel?: string) =>
    new Promise<boolean>(resolve => {
      setState({ isOpen: true, title, message, danger, confirmLabel, resolve })
    })

  const handleConfirm = () => {
    state.resolve?.(true)
    setState(s => ({ ...s, isOpen: false }))
  }

  const handleCancel = () => {
    state.resolve?.(false)
    setState(s => ({ ...s, isOpen: false }))
  }

  return {
    confirm,
    ConfirmDialogElement: (
      <ConfirmDialog
        isOpen={state.isOpen}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        danger={state.danger}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
  }
}
