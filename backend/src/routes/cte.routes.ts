import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { parseCteXml, extractCnpjRoot } from '../parsers/cte.parser';
import calcularFreteComTaxasAcumulativas from '../freight-engine/calcular-frete';
import { FreightConfig } from '../freight-engine/types';

const router = Router();

// Listar CTEs
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, dataInicial, dataFinal, busca, page = 1, limit = 20 } = req.query;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Token inválido ou tenant não encontrado' });
    }

    const where: any = { tenantId };

    if (status && status !== 'TODOS') {
      where.status = status;
    }

    if (dataInicial || dataFinal) {
      where.dataEmissao = {};
      if (dataInicial) {
        where.dataEmissao.gte = new Date(dataInicial as string);
      }
      if (dataFinal) {
        where.dataEmissao.lte = new Date(dataFinal as string);
      }
    }

    if (busca) {
      where.OR = [
        { chaveAcesso: { contains: busca as string, mode: 'insensitive' } },
        { emitenteNome: { contains: busca as string, mode: 'insensitive' } },
        { tomadorNome: { contains: busca as string, mode: 'insensitive' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [ctes, total] = await Promise.all([
      prisma.cte.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          audit: true
        }
      }),
      prisma.cte.count({ where })
    ]);

    res.json({
      data: ctes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Importar XMLs de CTE
router.post('/import', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Neste caso, o XML vem no body da requisição
    const { xml } = req.body;
    
    if (!xml) {
      return res.status(400).json({ error: 'XML não fornecido' });
    }

    const cteData = parseCteXml(xml);
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Token inválido ou tenant não encontrado' });
    }
    const cnpjRoot = extractCnpjRoot(cteData.emitenteCnpj);

    // Buscar tabela de frete ativa para esta transportadora
    const freightTable = await prisma.freightTable.findFirst({
      where: {
        tenantId,
        transportadoraCnpjRoot: cnpjRoot,
        ativa: true
      },
      include: {
        pricing: true,
        regions: true,
        exceptions: true
      }
    });

    // Converter tabela para FreightConfig
    let config: FreightConfig | null = null;
    let valorAuditado: number | null = null;
    let diferencaValor: number | null = null;
    let diferencaPercent: number | null = null;
    let status = 'PENDENTE';

    if (freightTable) {
      config = {
        fatorCubagem: freightTable.fatorCubagem || 300,
        minima: freightTable.minima ? Number(freightTable.minima) : undefined,
        freightPeso: freightTable.pricing.map((p: any) => ({
          regiao: p.regiao,
          ateKg: Number(p.ateKg),
          valor: Number(p.valor)
        })),
        prazoRegiao: freightTable.regions.map((r: any) => ({
          regiao: r.regiao,
          cepDe: r.cepDe,
          cepAte: r.cepAte
        })),
        adValorem: freightTable.adValorem ? Number(freightTable.adValorem) : undefined,
        gris: freightTable.gris ? Number(freightTable.gris) : undefined,
        grisMinimo: freightTable.grisMinimo ? Number(freightTable.grisMinimo) : undefined,
        pedagioPorFracao: freightTable.pedagioPorFracao ? Number(freightTable.pedagioPorFracao) : undefined,
        pedagioPesoBase: freightTable.pedagioPesoBase,
        taxaDespacho: freightTable.taxaDespacho ? Number(freightTable.taxaDespacho) : undefined,
        taxaSefaz: freightTable.taxaSefaz ? Number(freightTable.taxaSefaz) : undefined,
        taxaEmergencial: freightTable.taxaEmergencial ? Number(freightTable.taxaEmergencial) : undefined,
        taxaEmergencialTipo: freightTable.taxaEmergencialTipo?.toLowerCase() as 'percentual' | 'fixo',
        taxaReentrega: freightTable.taxaReentrega ? Number(freightTable.taxaReentrega) : undefined,
        taxaDevolucao: freightTable.taxaDevolucao ? Number(freightTable.taxaDevolucao) : undefined,
        taxaTevd: freightTable.taxaTevd ? Number(freightTable.taxaTevd) : undefined,
        taxaRdc: freightTable.taxaRdc ? Number(freightTable.taxaRdc) : undefined,
        taxaEstadia: freightTable.taxaEstadia ? Number(freightTable.taxaEstadia) : undefined,
        taxaArmazenagem: freightTable.taxaArmazenagem ? Number(freightTable.taxaArmazenagem) : undefined,
        taxaAndares: freightTable.taxaAndares ? Number(freightTable.taxaAndares) : undefined,
        taxaNoturna: freightTable.taxaNoturna ? Number(freightTable.taxaNoturna) : undefined,
        taxaComprovante: freightTable.taxaComprovante ? Number(freightTable.taxaComprovante) : undefined,
        taxaProcessoIndenizatorio: freightTable.taxaProcessoIndenizatorio ? Number(freightTable.taxaProcessoIndenizatorio) : undefined,
        aliquotaIcms: freightTable.aliquotaIcms ? Number(freightTable.aliquotaIcms) : undefined,
        taxas: freightTable.exceptions.map((e: any) => ({
          nome: e.tipoExcecao as any,
          tipo_calculo: e.tipoCadastro === 'CEP' ? 'percentual' : 'fixo',
          valor: e.valor ? Number(e.valor) : (e.percentual ? Number(e.percentual) : 0),
          base_calculo: 'frete',
          condicao: {
            tipo: e.tipoCadastro.toLowerCase() as any,
            valor: e.referenciaInicio && e.referenciaFim 
              ? { inicio: e.referenciaInicio, fim: e.referenciaFim }
              : e.cidade || e.uf || '*'
          },
          descricao: e.descricao,
          prioridade: 10,
          ativo: true
        }))
      };

      // Calcular frete
      const shipmentData = {
        cep: cteData.tomadorCep || '',
        cnpj: cteData.tomadorCnpj,
        cidade: cteData.tomadorCidade || '',
        uf: cteData.tomadorUf || '',
        peso: Number(cteData.pesoReal),
        valor_nota: Number(cteData.valorMercadoria)
      };

      const resultado = config ? calcularFreteComTaxasAcumulativas(shipmentData, config) : null;
      
      if (resultado) {
        valorAuditado = resultado.valor_total_geral;
        diferencaValor = Number(cteData.valorTotalServico) - valorAuditado;
        
        // Evitar divisão por zero
        if (valorAuditado && valorAuditado > 0) {
          diferencaPercent = (diferencaValor / valorAuditado) * 100;
        } else {
          diferencaPercent = diferencaValor !== 0 ? 100 : 0;
        }

        // Determinar status baseado na diferença
        const toleranciaPercent = 5; // 5% de tolerância
        const toleranciaFixo = 10; // R$ 10,00 de tolerância

        if (Math.abs(diferencaPercent) <= toleranciaPercent || Math.abs(diferencaValor) <= toleranciaFixo) {
          status = 'CORRETO';
        } else {
          status = 'DISCREPANCIA';
        }
      }
    } else {
      status = 'PENDENTE';
    }

    // Salvar CTE
    const cte = await prisma.cte.create({
      data: {
        tenantId,
        chaveAcesso: cteData.chaveAcesso,
        xmlOriginal: xml,
        valorTotalServico: cteData.valorTotalServico,
        valorFretePeso: cteData.valorFretePeso,
        valorReceber: cteData.valorReceber,
        componentesDetalhes: cteData.componentesDetalhes,
        dataEmissao: cteData.dataEmissao,
        dataProgramada: cteData.dataProgramada,
        valorMercadoria: cteData.valorMercadoria,
        pesoReal: cteData.pesoReal,
        emitenteCnpj: cteData.emitenteCnpj,
        emitenteNome: cteData.emitenteNome,
        tomadorCnpj: cteData.tomadorCnpj,
        tomadorNome: cteData.tomadorNome,
        tomadorCidade: cteData.tomadorCidade,
        tomadorUf: cteData.tomadorUf,
        tomadorCep: cteData.tomadorCep,
        status: status as any,
        valorAuditado,
        diferencaValor,
        diferencaPercent
      }
    });

    res.status(201).json({ cte, tabelaEncontrada: !!freightTable });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obter detalhes de um CTE
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Token inválido ou tenant não encontrado' });
    }

    const cte = await prisma.cte.findFirst({
      where: { id, tenantId },
      include: {
        audit: {
          include: {
            auditor: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        taxItems: true
      }
    });

    if (!cte) {
      return res.status(404).json({ error: 'CTE não encontrado' });
    }

    res.json(cte);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Liberar CTE com justificativa
router.post('/:id/release', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { justificativa } = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Token inválido ou dados do usuário não encontrados' });
    }

    if (!justificativa) {
      return res.status(400).json({ error: 'Justificativa obrigatória' });
    }

    const cte = await prisma.cte.findFirst({
      where: { id, tenantId }
    });

    if (!cte) {
      return res.status(404).json({ error: 'CTE não encontrado' });
    }

    // Criar registro de auditoria
    const audit = await prisma.cteAudit.create({
      data: {
        cteId: id,
        auditorId: userId,
        valorApurado: cte.valorAuditado || 0,
        diferencaValor: cte.diferencaValor,
        diferencaPercent: cte.diferencaPercent,
        status: 'LIBERADO',
        justificativa,
        toleranciaUsada: true
      }
    });

    // Atualizar CTE
    await prisma.cte.update({
      where: { id },
      data: {
        status: 'LIBERADO',
        auditId: audit.id
      }
    });

    res.json({ message: 'CTE liberado com sucesso', audit });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
