'use client'

import { useState, useTransition } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { updateReportStatus } from '@/app/api/reports/actions'

interface Report {
  id: string
  reason: string
  status: string
  created_at: string
  reporter: { username: string; display_name: string } | null
  reported: { username: string; display_name: string } | null
  message: { content: string } | null
  room: { name: string } | null
}

interface Stats {
  users: number
  rooms: number
  messages: number
}

export function AdminClient({ reports: initialReports, stats }: { reports: Report[]; stats: Stats }) {
  const [reports, setReports] = useState(initialReports)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleUpdateReport = async (reportId: string, status: string) => {
    startTransition(async () => {
      const result = await updateReportStatus(reportId, status)
      if (result.success) {
        setReports(prev => prev.filter(r => r.id !== reportId))
      }
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          🛡️ Panel de Administración
        </h1>
        <span className="retro-badge retro-badge-hot">ADMIN</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="retro-panel p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{stats.users}</div>
          <div className="text-xs text-gray-500">👤 Usuarios</div>
        </div>
        <div className="retro-panel p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.rooms}</div>
          <div className="text-xs text-gray-500">🏠 Salas activas</div>
        </div>
        <div className="retro-panel p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.messages}</div>
          <div className="text-xs text-gray-500">💬 Mensajes</div>
        </div>
      </div>

      {/* Reportes pendientes */}
      <div className="retro-panel p-5">
        <div className="retro-section-title">
          🚨 Reportes Pendientes ({reports.length})
        </div>

        {reports.length === 0 ? (
          <div className="retro-empty">
            <span className="empty-icon">✨</span>
            <p>No hay reportes pendientes. ¡Todo tranquilo!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <div key={report.id} className="border border-orange-200 rounded p-3 bg-orange-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-gray-700">
                        🚨 Reporte de <span className="text-blue-600">@{report.reporter?.username}</span>
                      </span>
                      {report.reported && (
                        <span className="text-xs text-gray-600">
                          contra <span className="text-red-600 font-bold">@{report.reported.username}</span>
                        </span>
                      )}
                      {report.room && (
                        <span className="text-xs text-gray-500">en sala "{report.room.name}"</span>
                      )}
                    </div>

                    <p className="text-xs text-gray-700 mb-1">
                      <span className="font-bold">Motivo:</span> {report.reason}
                    </p>

                    {report.message && (
                      <div className="bg-white border border-gray-200 rounded p-1.5 mb-1">
                        <p className="text-xs text-gray-600 italic">"{report.message.content}"</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">{formatRelativeTime(report.created_at)}</p>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleUpdateReport(report.id, 'resolved')}
                      disabled={isPending}
                      className="retro-btn retro-btn-success text-xs whitespace-nowrap"
                    >
                      ✓ Resolver
                    </button>
                    <button
                      onClick={() => handleUpdateReport(report.id, 'dismissed')}
                      disabled={isPending}
                      className="retro-btn retro-btn-secondary text-xs"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Links útiles */}
      <div className="retro-panel p-4 mt-4">
        <div className="retro-section-title">🔗 Accesos rápidos</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/rooms')}
            className="retro-btn retro-btn-secondary text-xs"
          >
            🏠 Ver salas
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          💡 La moderación se gestiona desde este panel y con los comandos de sala.
        </p>
      </div>
    </div>
  )
}
