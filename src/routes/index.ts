import { Router } from 'express';

import adminRouter from './admin';
import gatewayRouter from './gateway';
import healthRouter from './health';

const router = Router();

router.use('/health', healthRouter);
router.use('/admin', adminRouter);
router.use('/', gatewayRouter);

export default router;
