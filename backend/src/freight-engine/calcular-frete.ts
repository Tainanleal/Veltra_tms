import {
  TaxRule,
  TaxType,
  TaxCalculationType,
  TaxBaseType,
  ShipmentData,
  FreightCalculationResult,
  AppliedTax,
  FreightConfig,
  FreightTableRow,
  TaxCondition,
  CepRange
} from './types';

// ============================================
// UTILITÁRIOS
// ============================================

const cleanAndParseFloat = (value: any): number => {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/[.\s]/g, '').replace(',', '.'));
  }
  return parseFloat(value) || 0;
};

const cleanCEP = (cep: string): string => {
  return (cep || '').replace(/\D/g, '');
};

const normalizeString = (str: string): string => {
  return (str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const cepToNumber = (cep: string): number | null => {
  const cleaned = cleanCEP(cep);
  if (cleaned.length !== 8) return null;
  return parseInt(cleaned, 10);
};

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

export const encontrarRegiaoPorCep = (
  cep: string,
  prazoRegiao?: { regiao: string; cepDe: string; cepAte: string }[]
): string => {
  if (!cep || !prazoRegiao || prazoRegiao.length === 0) {
    return 'PADRAO';
  }

  const cepNum = cepToNumber(cep);
  if (cepNum === null) return 'PADRAO';

  const rule = prazoRegiao.find(r => {
    const cepDe = cepToNumber(r.cepDe);
    const cepAte = cepToNumber(r.cepAte);
    if (cepDe === null || cepAte === null) return false;
    return cepNum >= cepDe && cepNum <= cepAte;
  });

  return rule ? rule.regiao : 'PADRAO';
};

export const calcularFreteBase = (
  peso: number,
  regiao: string,
  config: FreightConfig
): { valor: number; pesoTaxavel: number; regiao: string } => {
  const { freightPeso, fatorCubagem = 300, minima = 0, dimensoes } = config;
  
  const pesoCubado = dimensoes 
    ? (dimensoes.comprimento * dimensoes.largura * dimensoes.altura) / fatorCubagem
    : 0;
  
  const pesoTaxavel = Math.max(peso, pesoCubado);
  
  const tabela = Array.isArray(freightPeso) ? freightPeso : [];
  
  const regrasPorRegiao = tabela.filter(r => r.regiao === regiao);
  const regrasPadrao = tabela.filter(r => r.regiao === 'PADRAO');
  
  const regras = regrasPorRegiao.length > 0 ? regrasPorRegiao : regrasPadrao;
  
  if (!regras || regras.length === 0) {
    return { valor: minima || 0, pesoTaxavel, regiao };
  }

  const regrasOrdenadas = [...regras].sort((a, b) => a.ateKg - b.ateKg);
  
  let valorFrete = 0;
  
  if (pesoTaxavel <= regrasOrdenadas[0].ateKg) {
    valorFrete = regrasOrdenadas[0].valor;
  } else {
    valorFrete = regrasOrdenadas[0].valor;
    let lastAteKg = regrasOrdenadas[0].ateKg;

    for (let i = 1; i < regrasOrdenadas.length; i++) {
      const rule = regrasOrdenadas[i];
      const pesoNaFaixa = Math.min(pesoTaxavel, rule.ateKg) - lastAteKg;
      
      if (pesoNaFaixa > 0) {
        valorFrete += pesoNaFaixa * rule.valor;
      }

      if (pesoTaxavel <= rule.ateKg) {
        break;
      }
      lastAteKg = rule.ateKg;
    }
  }

  valorFrete = Math.max(valorFrete, minima || 0);

  return { valor: valorFrete, pesoTaxavel, regiao };
};

// ============================================
// VALIDAÇÃO DE TAXAS
// ============================================

const cepEmIntervalo = (cep: string, intervalo: CepRange | { inicio: string; fim: string }): boolean => {
  const cepNum = cepToNumber(cep);
  const inicio = cepToNumber(intervalo.inicio);
  const fim = cepToNumber(intervalo.fim);
  
  if (cepNum === null || inicio === null || fim === null) return false;
  return cepNum >= inicio && cepNum <= fim;
};

const validarCondicao = (condicao: TaxCondition, dados: ShipmentData, regiao?: string): boolean => {
  const { tipo, valor } = condicao;
  
  if (valor === '*') {
    return true;
  }
  
  switch (tipo) {
    case 'cep': {
      const cepCliente = cleanCEP(dados.cep);
      
      if (typeof valor === 'string') {
        if (valor.includes('-') || valor.includes('.')) {
          const partes = valor.split(/ a |-/);
          if (partes.length === 2) {
            return cepEmIntervalo(dados.cep, { inicio: partes[0].trim(), fim: partes[1].trim() });
          }
        }
        return cleanCEP(valor) === cepCliente;
      }
      
      if (typeof valor === 'object' && 'inicio' in valor && 'fim' in valor) {
        return cepEmIntervalo(dados.cep, valor as CepRange);
      }
      
      if (Array.isArray(valor)) {
        return valor.some(v => {
          if (typeof v === 'object' && 'inicio' in v && 'fim' in v) {
            return cepEmIntervalo(dados.cep, v as CepRange);
          }
          if (typeof v === 'string') {
            if (v.includes('-') || v.includes('.')) {
              const partes = v.split(/ a |-/);
              if (partes.length === 2) {
                return cepEmIntervalo(dados.cep, { inicio: partes[0].trim(), fim: partes[1].trim() });
              }
            }
            return cleanCEP(v) === cepCliente;
          }
          return false;
        });
      }
      
      return false;
    }
    
    case 'cnpj': {
      const cnpjCliente = cleanCEP(dados.cnpj || '');
      
      if (typeof valor === 'string') {
        return cnpjCliente === cleanCEP(valor);
      }
      
      if (Array.isArray(valor)) {
        return valor.some(v => {
          if (typeof v === 'string') {
            return cnpjCliente === cleanCEP(v);
          }
          return false;
        });
      }
      return false;
    }
    
    case 'cidade': {
      const cidadeCliente = normalizeString(dados.cidade);
      
      if (typeof valor === 'string') {
        return cidadeCliente.includes(normalizeString(valor));
      }
      
      if (Array.isArray(valor)) {
        return valor.some(v => {
          if (typeof v === 'string') {
            return cidadeCliente.includes(normalizeString(v));
          }
          return false;
        });
      }
      return false;
    }
    
    case 'uf': {
      const ufCliente = normalizeString(dados.uf);
      
      if (typeof valor === 'string') {
        return ufCliente === normalizeString(valor);
      }
      
      if (Array.isArray(valor)) {
        return valor.some(v => {
          if (typeof v === 'string') {
            return ufCliente === normalizeString(v);
          }
          return false;
        });
      }
      return false;
    }
    
    case 'regiao': {
      if (!regiao) return false;
      const regiaoCliente = normalizeString(regiao);
      
      if (typeof valor === 'string') {
        return regiaoCliente === normalizeString(valor);
      }
      
      if (Array.isArray(valor)) {
        return valor.some(v => {
          if (typeof v === 'string') {
            return regiaoCliente === normalizeString(v);
          }
          return false;
        });
      }
      return false;
    }
    
    default:
      return false;
  }
};

export const validarTaxa = (taxa: TaxRule, dados: ShipmentData, regiao?: string): boolean => {
  if (taxa.ativo === false) {
    return false;
  }
  
  return validarCondicao(taxa.condicao, dados, regiao);
};

// ============================================
// APLICAÇÃO DE TAXAS
// ============================================

const aplicarTaxaFixa = (taxa: TaxRule): number => {
  return taxa.valor;
};

const aplicarTaxaPercentual = (
  taxa: TaxRule,
  freteBase: number,
  valorTotalFrete: number,
  valorNota: number
): number => {
  const baseCalculo = taxa.base_calculo || 'frete';
  let valorCalculado: number;
  
  switch (baseCalculo) {
    case 'frete':
      valorCalculado = (freteBase * taxa.valor) / 100;
      break;
    
    case 'subtotal':
    case 'total':
      valorCalculado = (valorTotalFrete * taxa.valor) / 100;
      break;
    
    case 'valor_nota':
      if (valorNota <= 0) {
        return 0;
      }
      valorCalculado = (valorNota * taxa.valor) / 100;
      break;
    
    default:
      valorCalculado = (freteBase * taxa.valor) / 100;
  }
  
  valorCalculado = Math.max(valorCalculado, 0);
  
  return valorCalculado;
};

export const aplicarTaxa = (
  taxa: TaxRule,
  freteBase: number,
  valorTotalFrete: number,
  valorNota: number
): AppliedTax => {
  let valorCalculado: number;
  
  if (taxa.tipo_calculo === 'fixo') {
    valorCalculado = aplicarTaxaFixa(taxa);
  } else {
    valorCalculado = aplicarTaxaPercentual(taxa, freteBase, valorTotalFrete, valorNota);
  }
  
  if (taxa.valor_minimo !== undefined && taxa.valor_minimo > 0) {
    valorCalculado = Math.max(valorCalculado, taxa.valor_minimo);
  }
  
  if (taxa.nome === 'GRIS' && taxa.gris_minimo !== undefined && taxa.gris_minimo > 0 && valorNota > 0) {
    const grisPercentual = taxa.valor;
    const grisCalculado = (valorNota * grisPercentual) / 100;
    valorCalculado = Math.max(grisCalculado, taxa.gris_minimo);
  }
  
  return {
    nome: taxa.nome,
    valor: valorCalculado,
    descricao: taxa.descricao,
    tipo_calculo: taxa.tipo_calculo,
    base_calculo: taxa.base_calculo
  };
};

// ============================================
// MOTOR PRINCIPAL DE CÁLCULO
// ============================================

export const calcularFreteComTaxasAcumulativas = (
  dados: ShipmentData,
  config: FreightConfig
): FreightCalculationResult => {
  const { cep, peso, valor_nota = 0 } = dados;
  
  const regiao = encontrarRegiaoPorCep(cep, config.prazoRegiao);
  const { valor: freteBase, pesoTaxavel } = calcularFreteBase(peso, regiao, config);
  
  const taxas = config.taxas || [];
  const taxasOrdenadas = [...taxas].sort((a, b) => (a.prioridade || 100) - (b.prioridade || 100));
  
  const todasTaxasAplicadas: AppliedTax[] = [];
  let valorTotalParcial = freteBase;
  
  const debugLog: string[] = [`Frete base: R$ ${freteBase.toFixed(2)} (regiao: ${regiao})`];
  
  taxasOrdenadas.forEach(taxa => {
    if (validarTaxa(taxa, dados, regiao)) {
      const taxaAplicada = aplicarTaxa(
        taxa,
        freteBase,
        valorTotalParcial,
        valor_nota
      );
      
      valorTotalParcial += taxaAplicada.valor;
      todasTaxasAplicadas.push(taxaAplicada);
      
      debugLog.push(`${taxa.nome} aplicado: +R$ ${taxaAplicada.valor.toFixed(2)} (total parcial: R$ ${valorTotalParcial.toFixed(2)})`);
    }
  });
  
  const taxaDespacho = config.taxaDespacho || 0;
  const taxaSefaz = config.taxaSefaz || 0;
  
  if (taxaDespacho > 0) {
    todasTaxasAplicadas.push({
      nome: 'TDE',
      valor: taxaDespacho,
      descricao: 'Taxa de Despacho',
      tipo_calculo: 'fixo'
    });
    valorTotalParcial += taxaDespacho;
  }
  
  if (taxaSefaz > 0) {
    todasTaxasAplicadas.push({
      nome: 'TDE',
      valor: taxaSefaz,
      descricao: 'Taxa Sefaz',
      tipo_calculo: 'fixo'
    });
    valorTotalParcial += taxaSefaz;
  }
  
  // ========================================
  // PASSO 6: Calcular Pedágio
  // ========================================
  const pedagioPorFracao = config.pedagioPorFracao || 0;
  const pedagioPesoBase = config.pedagioPesoBase || 100;
  let pedagio = 0;

  if (pedagioPorFracao > 0 && pesoTaxavel > 0) {
    const numeroFaixas = Math.ceil(pesoTaxavel / pedagioPesoBase);
    pedagio = numeroFaixas * pedagioPorFracao;
    debugLog.push(`Pedágio: ${numeroFaixas} faixas x R$ ${pedagioPorFracao.toFixed(2)} = R$ ${pedagio.toFixed(2)}`);

    todasTaxasAplicadas.push({
      nome: 'PEDAGIO',
      valor: pedagio,
      descricao: 'Valor do pedágio',
      tipo_calculo: 'fixo'
    });
  }

  // ========================================
  // PASSO 7: Calcular Taxa Emergencial
  // ========================================
  const taxaEmergencial = config.taxaEmergencial || 0;
  const taxaEmergencialTipo = config.taxaEmergencialTipo || 'percentual';
  let valorTaxaEmergencial = 0;

  const subtotalParcial = valorTotalParcial + pedagio;

  if (taxaEmergencial > 0) {
    if (taxaEmergencialTipo === 'fixo') {
      valorTaxaEmergencial = taxaEmergencial;
    } else {
      valorTaxaEmergencial = (subtotalParcial * taxaEmergencial) / 100;
    }
    debugLog.push(`Taxa Emergencial: ${taxaEmergencial}${taxaEmergencialTipo === 'fixo' ? '' : '%'} → R$ ${valorTaxaEmergencial.toFixed(2)}`);

    todasTaxasAplicadas.push({
      nome: 'EMERGENCIAL',
      valor: valorTaxaEmergencial,
      descricao: `Taxa Emergencial ${taxaEmergencialTipo === 'fixo' ? '(R$)' : '(%)'}`,
      tipo_calculo: taxaEmergencialTipo
    });
  }

  // ========================================
  // PASSO 8: Calcular ICMS
  // ========================================
  const subtotalSemImposto = subtotalParcial + valorTaxaEmergencial;

  const aliquotaIcms = config.aliquotaIcms || 0;
  let imposto: { nome: string; valor: number; aliquota: number; base_calculo: number } | undefined = undefined;
  let valorTotalGeral = subtotalSemImposto;

  if (aliquotaIcms > 0) {
    const baseCalculoIcms = subtotalSemImposto / (1 - aliquotaIcms / 100);
    const valorIcms = baseCalculoIcms * (aliquotaIcms / 100);

    valorTotalGeral = baseCalculoIcms;

    imposto = {
      nome: 'ICMS',
      valor: valorIcms,
      aliquota: aliquotaIcms,
      base_calculo: baseCalculoIcms
    };
    debugLog.push(`ICMS: R$ ${valorIcms.toFixed(2)} (base: R$ ${baseCalculoIcms.toFixed(2)})`);
  }

  debugLog.push(`VALOR TOTAL GERAL: R$ ${valorTotalGeral.toFixed(2)}`);

  const totalTaxasComPedagio = (todasTaxasAplicadas.reduce((sum, t) => sum + t.valor, 0)) + pedagio;

  return {
    frete_base: freteBase,
    taxas_aplicadas: todasTaxasAplicadas,
    total_taxas: totalTaxasComPedagio,
    valor_total_frete: valorTotalGeral,
    peso_taxavel: pesoTaxavel,
    regiao,
    pedagio: pedagio,
    imposto: imposto,
    valor_total_geral: valorTotalGeral,
    debug: {
      etapas: debugLog
    }
  };
};

export default calcularFreteComTaxasAcumulativas;
