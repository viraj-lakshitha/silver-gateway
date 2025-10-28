import { Router } from 'express';

import adminRouter from '@routes/admin';
import gatewayRouter from '@routes/gateway';
import healthRouter from '@routes/health';

const router = Router();

router.use('/health', healthRouter);
router.use('/admin', adminRouter);
router.use('/', gatewayRouter);

export default router;
