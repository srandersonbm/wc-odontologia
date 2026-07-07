import bcrypt from 'bcryptjs';
import { db, initDb } from './db';
import { defaultTaskCategories } from './defaults';

const tips = [
  'Escove os dentes por pelo menos 2 minutos, três vezes ao dia.',
  'Troque a escova de dentes a cada 3 meses ou quando as cerdas estiverem gastas.',
  'Use fio dental diariamente para remover placa entre os dentes.',
  'Evite escovar os dentes logo após consumir alimentos ácidos — espere ao menos 30 minutos.',
  'Reduza o consumo de açúcar e refrigerantes para prevenir cáries.',
  'Visite o dentista a cada 6 meses, mesmo sem sentir dor.',
  'Use enxaguante bucal sem álcool para complementar a higiene.',
  'Escove também a língua para eliminar bactérias causadoras de mau hálito.',
  'Beba bastante água durante o dia para estimular a produção de saliva.',
  'Evite roer unhas ou usar os dentes para abrir embalagens.',
];

async function seed() {
  await initDb();

  const tipCount = (await db.get<any>('SELECT COUNT(*) as c FROM oral_health_tips')).c;
  if (tipCount === 0) {
    for (const t of tips) await db.run('INSERT INTO oral_health_tips (text) VALUES (?)', [t]);
    console.log(`Seed: ${tips.length} dicas de saúde bucal inseridas.`);
  }

  const demoEmail = 'dentista@wcodontologia.com';
  const existingDemo = await db.get('SELECT id FROM users WHERE email = ?', [demoEmail]);
  if (!existingDemo) {
    const hash = bcrypt.hashSync('demo1234', 10);
    const info = await db.run('INSERT INTO users (role, name, email, password_hash) VALUES (?, ?, ?, ?)', [
      'DENTIST',
      'Dra. Ana Souza',
      demoEmail,
      hash,
    ]);
    const tenantId = info.lastInsertRowid;
    await db.run('UPDATE users SET tenant_id = ? WHERE id = ?', [tenantId, tenantId]);
    await db.run('INSERT INTO dentists (user_id, specialty, color) VALUES (?, ?, ?)', [
      tenantId,
      'Clínico Geral',
      '#c9a24b',
    ]);
    for (const c of defaultTaskCategories) {
      await db.run('INSERT INTO task_categories (tenant_id, name, color) VALUES (?, ?, ?)', [
        tenantId,
        c.name,
        c.color,
      ]);
    }
    console.log(`Seed: dentista de demonstração criado (${demoEmail} / demo1234).`);
  }

  console.log('Seed concluído.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
