import { Router, Request, Response } from 'express';
import { authenticateUser, registerUser } from '../services/auth.service';

const router = Router();

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const result = await authenticateUser(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { tenantId, name, email, password, role } = req.body;

    if (!tenantId || !name || !email || !password) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const user = await registerUser(tenantId, name, email, password, role);
    res.status(201).json({ user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
