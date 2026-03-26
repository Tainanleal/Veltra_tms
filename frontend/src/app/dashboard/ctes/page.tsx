'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'

interface Cte {
  id: string
  chaveAcesso: string
  dataEmissao: string
  emitenteNome: string
  tomadorNome: string
  valorTotalServico: number
  valorAuditado: number | null
  diferencaValor: number | null
  diferencaPercent: number | null
  status: string
}

const statusColors: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  CONFERIDO: 'bg-blue-100 text-blue-800',
  DISCREPANCIA: 'bg-red-100 text-red-800',
  CORRETO: 'bg-green-100 text-green-800',
  LIBERADO: 'bg-purple-100 text-purple-800',
}

export default function CtesPage() {
  const [ctes, setCtes] = useState<Cte[]>([])
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedCte, setSelectedCte] = useState<Cte | null>(null)
  const [xmlContent, setXmlContent] = useState('')
  const [importing, setImporting] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    busca: '',
    dataInicial: '',
    dataFinal: ''
  })

  const fetchCtes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.busca) params.append('busca', filters.busca)
      if (filters.dataInicial) params.append('dataInicial', filters.dataInicial)
      if (filters.dataFinal) params.append('dataFinal', filters.dataFinal)
      
      const response = await api.get(`/ctes?${params.toString()}`)
      setCtes(response.data.data || [])
    } catch (error) {
      console.error('Error fetching CTEs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCtes()
  }, [filters])

  const handleImport = async () => {
    if (!xmlContent.trim()) return
    
    setImporting(true)
    try {
      await api.post('/ctes/import', { xml: xmlContent })
      setShowImportModal(false)
      setXmlContent('')
      fetchCtes()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao importar XML')
    } finally {
      setImporting(false)
    }
  }

  const handleRelease = async () => {
    const justificativa = prompt('Justificativa para liberação:')
    if (!justificativa || !selectedCte) return

    try {
      await api.post(`/ctes/${selectedCte.id}/release`, { justificativa })
      setShowDetailModal(false)
      setSelectedCte(null)
      fetchCtes()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao liberar CTE')
    }
  }

  const openDetail = async (cte: Cte) => {
    try {
      const response = await api.get(`/ctes/${cte.id}`)
      setSelectedCte(response.data)
      setShowDetailModal(true)
    } catch (error) {
      console.error('Error fetching CTE details:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CTEs</h1>
          <p className="mt-1 text-sm text-gray-600">Auditoria de conhecimentos de transporte</p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          + Importar XML
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Buscar por chave, emitente..."
            value={filters.busca}
            onChange={(e) => setFilters({ ...filters, busca: e.target.value })}
            className="px-3 py-2 border rounded-md"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="DISCREPANCIA">Discrepância</option>
            <option value="CORRETO">Correto</option>
            <option value="LIBERADO">Liberado</option>
          </select>
          <input
            type="date"
            value={filters.dataInicial}
            onChange={(e) => setFilters({ ...filters, dataInicial: e.target.value })}
            className="px-3 py-2 border rounded-md"
            placeholder="Data inicial"
          />
          <input
            type="date"
            value={filters.dataFinal}
            onChange={(e) => setFilters({ ...filters, dataFinal: e.target.value })}
            className="px-3 py-2 border rounded-md"
            placeholder="Data final"
          />
        </div>
      </div>

      {/* Tabela de CTEs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : ctes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum CTE encontrado. Importe um XML para começar.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chave Acesso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transportadora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tomador</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor CT-e</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Auditado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diferença</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ctes.map((cte) => (
                <tr key={cte.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{cte.chaveAcesso.slice(-10)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(cte.dataEmissao)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{cte.emitenteNome}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{cte.tomadorNome || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(cte.valorTotalServico)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {cte.valorAuditado ? formatCurrency(cte.valorAuditado) : '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${cte.diferencaValor && cte.diferencaValor > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {cte.diferencaValor ? formatCurrency(cte.diferencaValor) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[cte.status]}`}>
                      {cte.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => openDetail(cte)}
                      className="text-primary hover:text-primary/80"
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Importação */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Importar XML de CT-e</h2>
            <textarea
              value={xmlContent}
              onChange={(e) => setXmlContent(e.target.value)}
              placeholder="Cole o conteúdo do XML aqui..."
              className="w-full h-64 px-3 py-2 border rounded-md font-mono text-sm"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setXmlContent('')
                }}
                className="px-4 py-2 border rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !xmlContent.trim()}
                className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
              >
                {importing ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetailModal && selectedCte && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Detalhes do CT-e</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-gray-500">Chave de Acesso</label>
                <p className="font-mono text-sm">{selectedCte.chaveAcesso}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Data de Emissão</label>
                <p>{formatDate(selectedCte.dataEmissao)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Transportadora</label>
                <p>{selectedCte.emitenteNome}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Tomador</label>
                <p>{selectedCte.tomadorNome || '-'}</p>
              </div>
            </div>

            <div className="border-t pt-4 mb-4">
              <h3 className="font-medium mb-2">Valores</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <label className="text-sm text-gray-500">Valor CT-e</label>
                  <p className="text-lg font-bold">{formatCurrency(selectedCte.valorTotalServico)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <label className="text-sm text-gray-500">Valor Auditado</label>
                  <p className="text-lg font-bold">{selectedCte.valorAuditado ? formatCurrency(selectedCte.valorAuditado) : '-'}</p>
                </div>
                <div className={`p-3 rounded ${selectedCte.diferencaValor && selectedCte.diferencaValor > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <label className="text-sm text-gray-500">Diferença</label>
                  <p className="text-lg font-bold">
                    {selectedCte.diferencaValor ? formatCurrency(selectedCte.diferencaValor) : '-'}
                    {selectedCte.diferencaPercent && (
                      <span className="text-sm font-normal ml-1">({selectedCte.diferencaPercent.toFixed(2)}%)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[selectedCte.status]}`}>
                {selectedCte.status}
              </span>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedCte(null)
                }}
                className="px-4 py-2 border rounded-md"
              >
                Fechar
              </button>
              {(selectedCte.status === 'DISCREPANCIA' || selectedCte.status === 'PENDENTE') && (
                <button
                  onClick={handleRelease}
                  className="px-4 py-2 bg-green-600 text-white rounded-md"
                >
                  Liberar com Diferença
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
