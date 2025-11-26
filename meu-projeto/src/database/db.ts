import { openDatabaseSync } from 'expo-sqlite';

// Abre (ou cria) o banco usando a nova API
export const db = openDatabaseSync('produtos.db');

// Inicializa a tabela
export async function initDB() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL,
      quantidade INTEGER
    );
  `);
}

// Buscar todos os itens
export async function getItems() {
  return await db.getAllAsync(`SELECT * FROM produtos ORDER BY id DESC`);
}

// Inserir item
export async function insertItem(nome: string, preco: number, quantidade: number) {
  await db.runAsync(
    `INSERT INTO produtos (nome, preco, quantidade) VALUES (?, ?, ?)`,
    [nome, preco, quantidade]
  );
}

// Atualizar item
export async function updateItem(id: number, nome: string, preco: number, quantidade: number) {
  await db.runAsync(
    `UPDATE produtos SET nome=?, preco=?, quantidade=? WHERE id=?`,
    [nome, preco, quantidade, id]
  );
}

// Excluir item
export async function deleteItem(id: number) {
  await db.runAsync(`DELETE FROM produtos WHERE id=?`, [id]);
}
