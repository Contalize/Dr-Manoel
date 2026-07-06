import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // SECURITY: Explicitly configure CORS to prevent unauthorized cross-origin requests.
  app.enableCors({
    origin: process.env.FRONTEND_URL || [
      'http://localhost:3000',
      'http://localhost:3333',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();
