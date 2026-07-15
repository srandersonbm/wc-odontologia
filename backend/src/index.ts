import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db';

import authRoutes from './routes/auth';
import dentistRoutes from './routes/dentists';
import patientRoutes from './routes/patients';
import procedureTypeRoutes from './routes/procedureTypes';
import treatmentPlanRoutes from './routes/treatmentPlans';
import appointmentRoutes from './routes/appointments';
import dashboardRoutes from './routes/dashboard';
import tipsRoutes from './routes/tips';
import documentRoutes from './routes/documents';
import odontogramaRoutes from './routes/odontograma';
import perioRoutes from './routes/perio';

dotenv.config();

async function main() {
  await initDb();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/dentists', dentistRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/procedure-types', procedureTypeRoutes);
  app.use('/api/treatment-plans', treatmentPlanRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/tips', tipsRoutes);
  app.use('/api/patients', documentRoutes);
  app.use('/api/patients', odontogramaRoutes);
  app.use('/api/patients', perioRoutes);

  const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
  app.listen(PORT, () => {
    console.log(`WC Odontologia API rodando em http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
