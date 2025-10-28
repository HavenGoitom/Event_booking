import express from 'express';
import { authenticateToken} from '../middlewares/authMiddleware.js';
import { arifpayWebhookHandler } from '../controllers/webhookController.js';


const webhookRouter = express.Router();
webhookRouter.use(authenticateToken);


// raw parser for this route — do NOT use express.json() before this for this route
webhookRouter.post('/notify', express.raw({ type: 'application/json' }), arifpayWebhookHandler);

export default webhookRouter;
