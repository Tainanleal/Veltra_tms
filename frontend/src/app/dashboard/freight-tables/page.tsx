'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'

interface FreightTable {
  id: string
  name: string
  transportadoraNome: string
  transportadoraCnpjRoot: string
  ativa: boolean
  versao: number
  createdAt: string
}

export default function FreightTablesPage() {
  const [tables, setTables] = useState<FreightTable[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    transportadoraNome: '',
    transportadoraCnpjRoot: '',
    adValorem: 0,
    gris: 0,
    grisMinimo: 0,
    pedagioPorFracao: 0,
    taxaDespacho: 0,
    taxaSefaz: 0,
    taxaEmergencial: 0,
    taxaReentrega: 0,
    taxaDevolucao: 0,
    taxaTevd: 0,
    taxaRdc: 0,
    taxaEstadia: 0,
    taxaArmazenagem: 0,
    taxaAndares: 0,
    taxaNoturna: 0,
    taxaComprovante: 0,
    taxaProcessoIndenizatorio: 0,
    aliquotaIcms: 0,
    fatorCubagem: 300,
    minima: 0,
    pricing: [] as { ateKg: number; valor: number; regiao: string }[]
  })

  const fetchTables = async () => {
    setLoading(true)
    try {
      const response = await api.get('/freight-tables')
      setTables(response.data || [])
    } catch (error) {
      console.error('Error fetching tables:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTables()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/freight-tables', formData)
      setShowForm(false)
      setFormData({
        name: '',
        transportadoraNome: '',
        transportadoraCnpjRoot: '',
        adValorem: 0,
        gris: 0,
        grisMinimo: 0,
        pedagioPorFracao: 0,
        taxaDespacho: 0,
        taxaSefaz: 0,
        taxaEmergencial: 0,
        taxaReentrega: 0,
        taxaDevolucao: 0,
        taxaTevd: 0,
        taxaRdc: 0,
        taxaEstadia: 0,
        taxaArmazenagem: 0,
        taxaAndares: 0,
        taxaNoturna: 0,
        taxaComprovante: 0,
        taxaProcessoIndenizatorio: 0,
        aliquotaIcms: 0,
        fatorCubagem: 300,
        minima: 0,
        pricing: []
      })
      fetchTables()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao criar tabela')
    }
  }

  const addPricingRow = () => {
    setFormData({
      ...formData,
      pricing: [...formData.pricing, { ateKg: 0, valor: 0, regiao: 'PADRAO' }]
    })
  }

  const updatePricingRow = (index: number, field: string, value: any) => {
    const newPricing = [...formData.pricing]
    newPricing[index] = { ...newPricing[index], [field]: value }
    setFormData({ ...formData, pricing: newPricing })
  }

  const removePricingRow = (index: number) => {
    const newPricing = formData.pricing.filter((_, i) => i !== index)
    setFormData({ ...formData, pricing: newPricing })
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tabelas de Frete</h1>
          <p className="mt-1 text-sm text-gray-600">Gerencie as tabelas de frete por transportadora</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          + Nova Tabela
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Nenhuma tabela cadastrada. Crie uma nova tabela para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <div key={table.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{table.name}</h3>
                <span className={`px-2 py-1 text-xs rounded ${table.ativa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {table.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{table.transportadoraNome}</p>
              <p className="text-xs text-gray-500">CNPJ: {table.transportadoraCnpjRoot}</p>
              <p className="text-xs text-gray-500 mt-2">Versão: {table.versao}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h2 className="text-xl font-bold mb-4">Nova Tabela de Frete</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome da Tabela</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border rounded-md"
                    placeholder="Ex: Top Floripa 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CNPJ Raiz Transportadora</label>
                  <input
                    type="text"
                    required
                    value={formData.transportadoraCnpjRoot}
                    onChange={(e) => setFormData({ ...formData, transportadoraCnpjRoot: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border rounded-md"
                    placeholder="12345678"
                    maxLength={8}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nome da Transportadora</label>
                <input
                  type="text"
                  required
                  value={formData.transportadoraNome}
                  onChange={(e) => setFormData({ ...formData, transportadoraNome: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border rounded-md"
                />
              </div>

              {/* Taxas */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Taxas e Configurações</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500">Ad Valorem (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.adValorem}
                      onChange={(e) => setFormData({ ...formData, adValorem: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">GRIS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.gris}
                      onChange={(e) => setFormData({ ...formData, gris: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">GRIS Mínimo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.grisMinimo}
                      onChange={(e) => setFormData({ ...formData, grisMinimo: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Pedágio/100kg (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.pedagioPorFracao}
                      onChange={(e) => setFormData({ ...formData, pedagioPorFracao: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Taxa Despacho (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxaDespacho}
                      onChange={(e) => setFormData({ ...formData, taxaDespacho: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Taxa Sefaz (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxaSefaz}
                      onChange={(e) => setFormData({ ...formData, taxaSefaz: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Alíquota ICMS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.aliquotaIcms}
                      onChange={(e) => setFormData({ ...formData, aliquotaIcms: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Frete Mínimo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minima}
                      onChange={(e) => setFormData({ ...formData, minima: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Fator Cubagem</label>
                    <input
                      type="number"
                      value={formData.fatorCubagem}
                      onChange={(e) => setFormData({ ...formData, fatorCubagem: parseInt(e.target.value) || 300 })}
                      className="mt-1 block w-full px-2 py-1 border rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Tabela de Preços */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Tabela de Preços por Peso</h3>
                  <button type="button" onClick={addPricingRow} className="text-sm text-primary">
                    + Adicionar faixa
                  </button>
                </div>
                {formData.pricing.map((row, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="number"
                      placeholder="Até (kg)"
                      value={row.ateKg}
                      onChange={(e) => updatePricingRow(index, 'ateKg', parseFloat(e.target.value) || 0)}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Valor (R$)"
                      value={row.valor}
                      onChange={(e) => updatePricingRow(index, 'valor', parseFloat(e.target.value) || 0)}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                    <input
                      type="text"
                      placeholder="Região"
                      value={row.regiao}
                      onChange={(e) => updatePricingRow(index, 'regiao', e.target.value)}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                    <button type="button" onClick={() => removePricingRow(index)} className="text-red-500">
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
