import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('staff'),
  emailVerified: integer('email_verified').notNull().default(0),
  createdAt: text('created_at').notNull()
});

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: integer('user_id').notNull(),
  expiresAt: text('expires_at').notNull()
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  active: integer('active').notNull().default(1)
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: real('price').notNull(),
  stock: integer('stock').notNull(),
  categoryId: integer('category_id'),
  imageUrl: text('image_url'),
  active: integer('active').notNull().default(1),
  updatedAt: text('updated_at')
});

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey(),
  userId: integer('user_id'),
  customerName: text('customer_name'),
  total: real('total').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at')
});

export const loginAttempts = sqliteTable('login_attempts', {
  attemptKey: text('attempt_key').primaryKey(),
  attemptCount: integer('attempt_count').notNull().default(0),
  blockedUntil: text('blocked_until'),
  updatedAt: text('updated_at').notNull()
});

export const files = sqliteTable('files', {
  objectKey: text('object_key').primaryKey(),
  ownerUserId: integer('owner_user_id'),
  originalName: text('original_name').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  createdAt: text('created_at').notNull()
});

export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull(),
  productId: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull()
});

export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull(),
  userId: integer('user_id'),
  quantityChange: integer('quantity_change').notNull(),
  reason: text('reason').notNull(),
  createdAt: text('created_at').notNull()
});

export const logs = sqliteTable('logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id'),
  action: text('action').notNull(),
  description: text('description').notNull(),
  createdAt: text('created_at').notNull()
});
