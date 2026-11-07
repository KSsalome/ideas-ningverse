import {sqliteTable,text,integer,real,primaryKey,index} from 'drizzle-orm/sqlite-core';
export const settings=sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
export const projects=sqliteTable('projects',{id:text('id').primaryKey(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()});
export const avatars=sqliteTable('avatars',{userId:text('user_id').primaryKey(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()});
export const messages=sqliteTable('messages',{id:text('id').primaryKey(),actor:text('actor').notNull(),name:text('name').notNull(),message:text('message').notNull(),color:text('color').notNull(),createdAt:text('created_at').notNull(),visible:integer('visible').notNull().default(1)});
export const diaries=sqliteTable('diaries',{id:text('id').primaryKey(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()});
export const assets=sqliteTable('assets',{id:text('id').primaryKey(),key:text('object_key').notNull(),scope:text('scope').notNull(),mime:text('mime').notNull(),filename:text('filename').notNull(),size:integer('size').notNull(),createdAt:text('created_at').notNull()});
export const limits=sqliteTable('limits',{key:text('key').primaryKey(),count:integer('count').notNull(),until:integer('until').notNull()});

export const libraryBooks=sqliteTable('library_books',{id:text('id').primaryKey(),libraryId:text('library_id').notNull(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('library_books_library_idx').on(t.libraryId)]);
export const tarotDraws=sqliteTable('tarot_draws',{actor:text('actor').notNull(),day:text('day').notNull(),data:text('data').notNull()},t=>[primaryKey({columns:[t.actor,t.day]})]);
export const explorers=sqliteTable('explorers',{actor:text('actor').primaryKey(),nextSpawnAt:integer('next_spawn_at').notNull()});
export const bottles=sqliteTable('bottles',{id:text('id').primaryKey(),actor:text('actor').notNull(),x:real('x').notNull(),z:real('z').notNull(),spawnedAt:integer('spawned_at').notNull(),expiresAt:integer('expires_at').notNull(),rewardId:text('reward_id').notNull(),claimedAt:integer('claimed_at')},t=>[index('bottles_actor_idx').on(t.actor,t.expiresAt)]);
export const inventory=sqliteTable('inventory',{actor:text('actor').notNull(),itemId:text('item_id').notNull(),acquiredAt:integer('acquired_at').notNull()},t=>[primaryKey({columns:[t.actor,t.itemId]})]);
export const wardrobes=sqliteTable('wardrobes',{actor:text('actor').primaryKey(),data:text('data').notNull()});

export const artworks=sqliteTable('artworks',{id:text('id').primaryKey(),galleryId:text('gallery_id').notNull(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('artworks_gallery_idx').on(t.galleryId)]);
export const petFeathers=sqliteTable('pet_feathers',{actor:text('actor').notNull(),day:text('day').notNull(),acquiredAt:integer('acquired_at').notNull()},t=>[primaryKey({columns:[t.actor,t.day]})]);
export const rewardCatalog=sqliteTable('reward_catalog',{id:text('id').primaryKey(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()});

// Google OAuth 的單次驗證資料，十分鐘後過期。
export const authRequests = sqliteTable('auth_requests', {
 stateHash: text('state_hash').primaryKey(), verifier: text('verifier').notNull(),
 nonce: text('nonce').notNull(), returnTo: text('return_to').notNull(),
 origin: text('origin').notNull(), ipHash: text('ip_hash').notNull(),
 expiresAt: integer('expires_at').notNull(),
}, t => [index('auth_requests_expiry_idx').on(t.expiresAt), index('auth_requests_ip_idx').on(t.ipHash)]);
// 伺服器端工作階段，僅保存 cookie 憑證的雜湊，支援立即登出。
export const authSessions = sqliteTable('auth_sessions', {
 tokenHash: text('token_hash').primaryKey(), userId: text('user_id').notNull(),
 name: text('name').notNull(), email: text('email').notNull(), expiresAt: integer('expires_at').notNull(),
}, t => [index('auth_sessions_expiry_idx').on(t.expiresAt)]);
