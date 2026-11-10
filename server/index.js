import './env.js';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './database.js';
import { startScheduler } from './services/scheduler.js';

import path from 'path';

async function startServer() {
  // Initialize database first
  await initDatabase();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Serve static uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Import Routes (after DB is initialized)
  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: leadsRoutes } = await import('./routes/leads.js');
  const { default: webhooksRoutes } = await import('./routes/webhooks.js');
  const { default: empreendimentosRoutes } = await import('./routes/empreendimentos.js');
  const { default: dashboardRoutes } = await import('./routes/dashboard.js');
  const { default: rodizioRoutes } = await import('./routes/rodizio.js');
  const { default: configRoutes } = await import('./routes/config.js');
  const { default: metasRoutes } = await import('./routes/metas.js');
  const { default: usuariosRoutes } = await import('./routes/usuarios.js');
  const { default: uploadRoutes } = await import('./routes/upload.js');
  const { default: pushRoutes } = await import('./routes/push.js');

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/leads', leadsRoutes);
  app.use('/api/webhooks', webhooksRoutes);
  app.use('/api/empreendimentos', empreendimentosRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/rodizio', rodizioRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/metas', metasRoutes);
  app.use('/api/usuarios', usuariosRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/push', pushRoutes);
  app.use('/api', empreendimentosRoutes);

  const PORT = process.env.PORT || 3001;

  app.listen(PORT, () => {
    console.log(`\n🏠 CRM Sheets Park API rodando na porta ${PORT}`);
    console.log(`   http://localhost:${PORT}/api\n`);
    startScheduler();
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
