import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth.middleware';
import prisma from '../config/prisma';

const router = Router();

// Listar tabelas de frete
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Token inválido ou tenant não encontrado' });
    }

    const tables = await prisma.freightTable.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { pricing: true, exceptions: true }
        }
      }
    });

    res.json(tables);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obter detalhes de uma tabela
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Token inválido ou tenant não encontrado' });
    }

    const table = await prisma.freightTable.findFirst({
      where: { id, tenantId },
      include: {
        pricing: { orderBy: { ateKg: 'asc' } },
        regions: { orderBy: { cepDe: 'asc' } },
        exceptions: { orderBy: { tipoExcecao: 'asc' } }
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Tabela não encontrada' });
    }

    res.json(table);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Criar tabela de frete
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Token inválido ou tenant não encontrado' });
    }
    const {
      name,
      transportadoraNome,
      transportadoraCnpjRoot,
      adValorem,
      gris,
      grisMinimo,
      pedagioPorFracao,
      pedagioPesoBase,
      taxaDespacho,
      taxaSefaz,
      taxaEmergencial,
      taxaEmergencialTipo,
      taxaReentrega,
      taxaDevolucao,
      taxaTevd,
      taxaRdc,
      taxaEstadia,
      taxaArmazenagem,
      taxaAndares,
      taxaNoturna,
      taxaComprovante,
      taxaProcessoIndenizatorio,
      aliquotaIcms,
      fatorCubagem,
      minima,
      pricing,
      regions,
      exceptions
    } = req.body;

    // Verificar se já existe tabela ativa para esta transportadora
    const existingTable = await prisma.freightTable.findFirst({
      where: {
        tenantId,
        transportadoraCnpjRoot,
        ativa: true
      }
    });

    if (existingTable) {
      // Desativar tabela anterior
      await prisma.freightTable.update({
        where: { id: existingTable.id },
        data: {
          ativa: false,
          dataFim: new Date()
        }
      });
    }

    const table = await prisma.freightTable.create({
      data: {
        tenantId,
        name,
        transportadoraNome,
        transportadoraCnpjRoot,
        dataInicio: new Date(),
        adValorem,
        gris,
        grisMinimo,
        pedagioPorFracao,
        pedagioPesoBase,
        taxaDespacho,
        taxaSefaz,
        taxaEmergencial,
        taxaEmergencialTipo,
        taxaReentrega,
        taxaDevolucao,
        taxaTevd,
        taxaRdc,
        taxaEstadia,
        taxaArmazenagem,
        taxaAndares,
        taxaNoturna,
        taxaComprovante,
        taxaProcessoIndenizatorio,
        aliquotaIcms,
        fatorCubagem,
        minima,
        pricing: pricing ? {
          create: pricing.map((p: any) => ({
            ateKg: p.ateKg,
            valor: p.valor,
            regiao: p.regiao || 'PADRAO'
          }))
        } : undefined,
        regions: regions ? {
          create: regions.map((r: any) => ({
            regiao: r.regiao,
            cepDe: r.cepDe,
            cepAte: r.cepAte,
            prazoDias: r.prazoDias
          }))
        } : undefined,
        exceptions: exceptions ? {
          create: exceptions.map((e: any) => ({
            tipoExcecao: e.tipoExcecao,
            tipoCadastro: e.tipoCadastro,
            referenciaInicio: e.referenciaInicio,
            referenciaFim: e.referenciaFim,
            cidade: e.cidade,
            uf: e.uf,
            regiao: e.regiao,
            valor: e.valor,
            percentual: e.percentual,
            valorMinimo: e.valorMinimo,
            descricao: e.descricao
          }))
        } : undefined
      },
      include: {
        pricing: true,
        regions: true,
        exceptions: true
      }
    });

    res.status(201).json(table);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar tabela de frete
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Token inválido ou tenant não encontrado' });
    }

    const table = await prisma.freightTable.findFirst({
      where: { id, tenantId }
    });

    if (!table) {
      return res.status(404).json({ error: 'Tabela não encontrada' });
    }

    const updatedTable = await prisma.freightTable.update({
      where: { id },
      data: req.body,
      include: {
        pricing: true,
        regions: true,
        exceptions: true
      }
    });

    res.json(updatedTable);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Excluir tabela de frete
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Token inválido ou tenant não encontrado' });
    }

    await prisma.freightTable.deleteMany({
      where: { id, tenantId }
    });

    res.json({ message: 'Tabela excluída com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
