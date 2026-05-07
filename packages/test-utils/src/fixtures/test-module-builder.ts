import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgresTestContainer } from '../containers/postgres-container';
import { RabbitMQTestContainer } from '../containers/rabbitmq-container';

export interface TestModuleConfig {
  entities: any[];
  providers?: any[];
  imports?: any[];
  usePostgres?: boolean;
  useRabbitMQ?: boolean;
  databaseName?: string;
  dropSchema?: boolean;
}

export class TestModuleBuilder {
  static async build(config: TestModuleConfig): Promise<TestingModule> {
    const {
      entities,
      providers = [],
      imports = [],
      usePostgres = true,
      useRabbitMQ = true,
      databaseName,
      dropSchema = true,
    } = config;

    const moduleImports = [...imports];
    const moduleProviders = [...providers];

    if (usePostgres) {
      let dbUrl = await PostgresTestContainer.start();

      if (databaseName) {
        await PostgresTestContainer.createDatabase(databaseName);
        dbUrl = dbUrl.replace(/\/[^/]*$/, `/${databaseName}`);
      }

      moduleImports.push(
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: dbUrl,
          entities,
          synchronize: true,
          dropSchema,
        })
      );
    }

    if (useRabbitMQ) {
      const rabbitUrl = await RabbitMQTestContainer.start();

      moduleProviders.push({
        provide: 'RABBITMQ_CONNECTION',
        useFactory: () => ({
          url: rabbitUrl,
          exchange: 'test-exchange',
          async connect() {
            const amqplib = await import('amqplib');
            return amqplib.connect(this.url);
          },
        }),
      });
    }

    return Test.createTestingModule({
      imports: moduleImports,
      providers: moduleProviders,
    }).compile();
  }

  static async buildForRepositories(
    config: Omit<TestModuleConfig, 'useRabbitMQ' | 'usePostgres'>
  ): Promise<TestingModule> {
    return this.build({
      ...config,
      usePostgres: true,
      useRabbitMQ: false,
    });
  }

  static async buildForConsumers(config: TestModuleConfig): Promise<TestingModule> {
    return this.build({
      ...config,
      usePostgres: true,
      useRabbitMQ: true,
    });
  }

  static async buildForUseCases(config: {
    providers?: any[];
    imports?: any[];
  }): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: config.imports || [],
      providers: config.providers || [],
    }).compile();
  }
}
