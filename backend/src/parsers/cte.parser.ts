import { XMLParser } from 'fast-xml-parser';

interface CteData {
  chaveAcesso: string;
  valorTotalServico: number;
  valorFretePeso: number;
  valorReceber: number;
  componentesDetalhes: Record<string, number>;
  dataEmissao: Date;
  dataProgramada?: Date;
  valorMercadoria: number;
  pesoReal: number;
  emitenteCnpj: string;
  emitenteNome: string;
  tomadorCnpj?: string;
  tomadorNome?: string;
  tomadorCidade?: string;
  tomadorUf?: string;
  tomadorCep?: string;
}

export const parseCteXml = (xmlContent: string): CteData => {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });

    const result = parser.parse(xmlContent);
    const cte = result.cteProc?.CTe?.infCte;
    
    if (!cte) {
      throw new Error('Estrutura XML CTE inválida: elemento infCte não encontrado');
    }
    
    const emit = cte?.emit;
    const dest = cte?.dest;
    const vPrest = cte?.vPrest;
    const imp = cte?.imp;
    const infCarga = cte?.infCarga;

    // Extrair componentes detalhados do XML
    const componentesDetalhes: Record<string, number> = {};
    
    if (vPrest?.Comp) {
      const comps = Array.isArray(vPrest.Comp) ? vPrest.Comp : [vPrest.Comp];
      comps.forEach((comp: any) => {
        const nome = comp?.xNome?.trim();
        const valor = parseFloat(comp?.vComp) || 0;
        if (nome && valor > 0) {
          // Normalizar nome da taxa
          const nomeNormalizado = normalizarNomeTaxa(nome);
          componentesDetalhes[nomeNormalizado] = valor;
        }
      });
    }

    // Extrair data de emissão
    const dataEmissaoStr = cte?.ide?.dEmi;
    const dataEmissao = dataEmissaoStr ? new Date(dataEmissaoStr) : new Date();

    // Extrair data programada (previsao de entrega)
    const dataProgramada = cte?.ide?.dPrev ? new Date(cte.ide.dPrev) : undefined;

    return {
      chaveAcesso: cte?.Id?.replace('CTe', '') || '',
      valorTotalServico: parseFloat(vPrest?.vTPrest) || 0,
      valorFretePeso: parseFloat(vPrest?.vFrete) || 0,
      valorReceber: parseFloat(vPrest?.vRec) || 0,
      componentesDetalhes,
      dataEmissao,
      dataProgramada,
      valorMercadoria: parseFloat(infCarga?.vCarga) || 0,
      pesoReal: parseFloat(infCarga?.pesoA) || parseFloat(infCarga?.pesoB) || 0,
      emitenteCnpj: emit?.CNPJ || emit?.CPF || '',
      emitenteNome: emit?.xNome || '',
      tomadorCnpj: dest?.CNPJ || dest?.CPF,
      tomadorNome: dest?.xNome,
      tomadorCidade: dest?.enderDest?.xMun,
      tomadorUf: dest?.enderDest?.UF,
      tomadorCep: dest?.enderDest?.CEP?.replace(/\D/g, '')
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erro ao processar XML CTE: ${error.message}`);
    }
    throw new Error('Erro desconhecido ao processar XML CTE');
  }
};

const normalizarNomeTaxa = (nome: string): string => {
  const mapping: Record<string, string> = {
    'FRETE': 'FRETE',
    'TAXA DE DESPACHO': 'TDE',
    'TAXA DESPACHO': 'TDE',
    'DESPACHO': 'TDE',
    'PEDÁGIO': 'PEDAGIO',
    'PEDAGIO': 'PEDAGIO',
    'AD VALOREM': 'ADVALOREM',
    'ADVALOREM': 'ADVALOREM',
    'SEGURO': 'SEGURO',
    'GRIS': 'GRIS',
    'TAXA DE ENTREGA': 'TDE',
    'TAXA ENTREGA': 'TDE',
    'TDE': 'TDE',
    'TDA': 'TDA',
    'TRT': 'TRT',
    'TRF': 'TRF',
    'EMEX': 'EMEX',
    'TAXA EMERGENCIAL': 'EMERGENCIAL',
    'EMERGÊNCIAL': 'EMERGENCIAL',
    'TAXA SEFAZ': 'SEFAZ',
    'SEFAZ': 'SEFAZ'
  };

  const upper = nome.toUpperCase();
  return mapping[upper] || nome.toUpperCase();
};

export const extractCnpjRoot = (cnpj: string): string => {
  // Extrai os 8 primeiros dígitos do CNPJ
  return cnpj.replace(/\D/g, '').substring(0, 8);
};
