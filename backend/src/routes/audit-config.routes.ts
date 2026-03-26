import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth.middleware';
import prisma from '../config/prisma';

const router = Router();

// Obter configuração de auditoria do usuário
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const config = await prisma.auditConfig.findUnique({
      where: {
        tenantId_userId: { tenantId, userId }
      }
    });

    res.json(config || {
      toleranciaPercent: 5,
      toleranciaFixo: 10,
      valorLimiteAuditoria: 1000,
      podeAprovarDiscrepancia: false
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar configuração de auditoria
router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;
    const { toleranciaPercent, toleranciaFixo, valorLimiteAuditoria, podeAprovarDiscrepancia } = req.body;

    const config = await prisma.auditConfig.upsert({
      where: {
        tenantId_userId: { tenantId, userId }
      },
      update: {
        toleranciaPercent,
        toleranciaFixo,
        valorLimiteAuditoria,
        podeAprovarDiscrepancia
      },
      create: {
        userId,
        tenantId,
        toleranciaPercent,
        toleranciaFixo,
        valorLimiteAuditoria,
        podeAprovarDiscrepancia
      }
    });

    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
