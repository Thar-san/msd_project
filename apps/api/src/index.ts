import { createApp } from './app';
import { connectDatabase } from './config/db';
import { config } from './config';

const startServer = async () => {
  try {
    await connectDatabase();

    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`=========================================`);
      console.log(`Comp!lo Learn API Server Live`);
      console.log(`Port: ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`CORS Origin: ${config.frontendUrl}`);
      console.log(`Go Binary: ${config.go.binaryPath}`);
      console.log(`=========================================`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[API Error] Port ${config.port} is already in use by another process.`);
      } else {
        console.error('[API Error]:', err);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

startServer();
