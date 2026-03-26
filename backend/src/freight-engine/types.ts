// Tipos para o Motor de Cálculo de Frete

export type TaxType = 'TDE' | 'TDA' | 'TRT' | 'TRF' | 'TDC' | 'EMEX' | 
  'ADVALOREM' | 'GRIS' | 'PEDAGIO' | 'REENTREGA' | 'DEVOLUCAO' |
  'CUBAGEM_EXCEDENTE' | 'TEVD' | 'TAXA_RDC' | 'ESTADIA' | 
  'ARMAZENAGEM' | 'ANDARES' | 'NOTURNO' | 'COMPROVANTE_ENTREGA' |
  'PROCESSO_INDENIZATORIO' | 'EMERGENCIAL';

export type TaxCalculationType = 'percentual' | 'fixo';
export type TaxBaseType = 'frete' | 'subtotal' | 'valor_nota' | 'total';

export interface TaxCondition {
  tipo: 'cep' | 'cnpj' | 'cidade' | 'uf' | 'regiao';
  valor: string | string[] | { inicio: string; fim: string } | { inicio: string; fim: string }[];
}

export interface CepRange {
  inicio: string;
  fim: string;
}

export interface TaxRule {
  nome: TaxType;
  tipo_calculo: TaxCalculationType;
  valor: number;
  base_calculo?: TaxBaseType;
  condicao: TaxCondition;
  descricao?: string;
  prioridade?: number;
  ativo?: boolean;
  valor_minimo?: number;
  gris_minimo?: number;
}

export interface FreightTableRow {
  regiao: string;
  ateKg: number;
  valor: number;
}

export interface FreightConfig {
  fatorCubagem?: number;
  minima?: number;
  freightPeso: FreightTableRow[];
  prazoRegiao?: { regiao: string; cepDe: string; cepAte: string }[];
  taxas?: TaxRule[];
  dimensoes?: { comprimento: number; largura: number; altura: number };
  taxaDespacho?: number;
  taxaSefaz?: number;
  taxaEmergencial?: number;
  taxaEmergencialTipo?: 'percentual' | 'fixo';
  taxaReentrega?: number;
  taxaDevolucao?: number;
  taxaCubagemExcedenteTipo?: 'percentual' | 'fixo';
  taxaTevd?: number;
  taxaRdc?: number;
  taxaEstadia?: number;
  taxaArmazenagem?: number;
  taxaAndares?: number;
  taxaNoturna?: number;
  taxaComprovante?: number;
  taxaProcessoIndenizatorio?: number;
  pedagioPorFracao?: number;
  pedagioPesoBase?: number;
  aliquotaIcms?: number;
  grisMinimo?: number;
  adValorem?: number;
  gris?: number;
}

export interface ShipmentData {
  tipoOperacao?: 'normal' | 'complementar' | 'devolucao';
  cep: string;
  cnpj?: string;
  cidade: string;
  uf: string;
  peso: number;
  valor_nota: number;
  dimensoes?: { comprimento: number; largura: number; altura: number };
  reentrega?: boolean;
  devolucao?: boolean;
  cubagemExcedente?: number;
  tevd?: boolean;
  taxaRdc?: boolean;
  horasEstadia?: number;
  diasArmazenagem?: number;
  andares?: number;
  entregaNoturna?: boolean;
  comprovanteEntrega?: boolean;
  processoIndenizatorio?: boolean;
}

export interface AppliedTax {
  nome: TaxType;
  valor: number;
  descricao?: string;
  tipo_calculo: TaxCalculationType;
  base_calculo?: TaxBaseType;
}

export interface FreightCalculationResult {
  frete_base: number;
  taxas_aplicadas: AppliedTax[];
  total_taxas: number;
  valor_total_frete: number;
  peso_taxavel: number;
  regiao: string;
  pedagio: number;
  imposto?: { nome: string; valor: number; aliquota: number; base_calculo: number };
  valor_total_geral: number;
  debug?: { etapas: string[] };
}
