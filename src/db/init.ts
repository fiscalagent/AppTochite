import { db } from './db'

export async function initDB() {
  const selfExists = await db.clients.where('isSelf').equals(1).count()
  if (selfExists === 0) {
    await db.clients.add({
      name: 'Я',
      isSelf: true,
      createdAt: new Date(),
    })
  }
}
