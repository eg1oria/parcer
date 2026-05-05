import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp, NEST_APP_FACTORY_OPTIONS } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, NEST_APP_FACTORY_OPTIONS);
  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Test Prep Platform API')
    .setDescription('Backend MVP for importing and passing test questions.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
