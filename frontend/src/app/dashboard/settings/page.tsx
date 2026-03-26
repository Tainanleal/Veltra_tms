'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'

interface AuditConfig {
  toleranciaPercent: number
  toleranciaFixo: number
  valorLimiteAuditoria: number
  podeAprovarDiscrepancia: boolean
}

export default function SettingsPage() {
  const [config, setConfig] = useState<AuditConfig>({
    toleranciaPercent: 5,
    toleranciaFixo: 10,
    valorLimiteAuditoria: 1000,
    podeAprovarDiscrepancia: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/audit-config')
        setConfig(response.data)
      } catch (error) {
        console.error('Error fetching config:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/audit-config', config)
      alert('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-600">Configure as tolerâncias de auditoria</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-lg font-medium mb-4">Tolerâncias de Auditoria</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tolerância Percentual (%)
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Diferença percentual máxima para aprovação automática
            </p>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={config.toleranciaPercent}
              onChange={(e) => setConfig({ ...config, toleranciaPercent: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tolerância em Valor (R$)
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Diferença em reais máxima para aprovação automática
            </p>
            <input
              type="number"
              step="0.01"
              min="0"
              value={config.toleranciaFixo}
              onChange={(e) => setConfig({ ...config, toleranciaFixo: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Valor Limite para Auditoria (R$)
            </label>
            <p className="text-xs text-gray-500 mb-1">
              CT-es acima deste valor sempre precisam de aprovação manual
            </p>
            <input
              type="number"
              step="0.01"
              min="0"
              value={config.valorLimiteAuditoria}
              onChange={(e) => setConfig({ ...config, valorLimiteAuditoria: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex items-center">
            <input
              id="podeAprovarDiscrepancia"
              type="checkbox"
              checked={config.podeAprovarDiscrepancia}
              onChange={(e) => setConfig({ ...config, podeAprovarDiscrepancia: e.target.checked })}
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label htmlFor="podeAprovarDiscrepancia" className="ml-2 block text-sm text-gray-700">
              Permitir aprovação de discrepâncias
            </label>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  )
}
