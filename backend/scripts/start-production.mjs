import { Client } from 'pg';
import { spawn } from 'node:child_process';

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(' ')} exited with code ${code} and signal ${signal}`,
        ),
      );
    });
  });
}

async function getDatabaseState() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString });

  await client.connect();

  try {
    const migrationResult = await client.query(
      `
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = '_prisma_migrations'
        ) as exists
      `,
    );
    const userTablesResult = await client.query(
      `
        select count(*)::int as count
        from information_schema.tables
        where table_schema = 'public'
          and table_type = 'BASE TABLE'
          and table_name <> '_prisma_migrations'
      `,
    );

    return {
      hasPrismaMigrationsTable: Boolean(migrationResult.rows[0]?.exists),
      userTableCount: Number(userTablesResult.rows[0]?.count ?? 0),
    };
  } finally {
    await client.end();
  }
}

async function syncDatabase() {
  const { hasPrismaMigrationsTable, userTableCount } = await getDatabaseState();

  if (hasPrismaMigrationsTable || userTableCount === 0) {
    console.log('Running Prisma migrations with migrate deploy...');
    await runCommand('npx', ['prisma', 'migrate', 'deploy']);
    return;
  }

  console.log(
    'Existing schema detected without Prisma migration history. Running prisma db push...',
  );
  await runCommand('npx', ['prisma', 'db', 'push']);
}

async function main() {
  await syncDatabase();
  await runCommand('node', ['dist/src/main.js']);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
