'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface CteStats {
  total: number
  pendente: number
  discrepancia: number
  correto: number
  liberado: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<CteStats>({
    total: 0,
    pendente: 0,
    discrepancia: 0,
    correto: 0,
    liberado: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/ctes')
        const ctes = response.data.data || []
        
        setStats({
          total: ctes.length,
          pendente: ctes.filter((c: any) => c.status === 'PENDENTE').length,
          discrepancia: ctes.filter((c: any) => c.status === 'DISCREPANCIA').length,
          correto: ctes.filter((c: any) => c.status === 'CORRETO').length,
          liberado: ctes.filter((c: any) => c.status === 'LIBERADO').length
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    { name: 'Total', value: stats.total, color: 'bg-blue-500' },
    { name: 'Pendentes', value: stats.pendente, color: 'bg-yellow-500' },
    { name: 'Discrepância', value: stats.discrepancia, color: 'bg-red-500' },
    { name: 'Corretos', value: stats.correto, color: 'bg-green-500' },
    { name: 'Liberados', value: stats.liberado, color: 'bg-purple-500' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Visão geral da auditoria de fretes</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card) => (
            <div key={card.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md ${card.color} p-3`}>
                    <span className="text-white text-xl font-bold">{card.value}</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{card.name}</dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Bem-vindo ao Veltra TMS</h2>
        <p className="text-gray-600">
          Sistema de auditoria de fretes para controle e verificação de valores de transporte.
          Utilize o menu acima para navegar entre as funcionalidades.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900">📄 CTEs</h3>
            <p className="text-sm text-gray-600 mt-1">Importe e audite conhecimentos de transporte eletrônico</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900">📊 Tabelas de Frete</h3>
            <p className="text-sm text-gray-600 mt-1">Cadastre e gerencie tabelas de frete por transportadora</p>
          </div>
        </div>
      </div>
    </div>
  )
}
