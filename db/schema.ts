import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  status: text("status", { enum: ["active", "paused"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["super_admin", "owner", "supervisor", "seller"] }).notNull(),
  status: text("status", { enum: ["active", "paused"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
});

export const pointsOfSale = sqliteTable("points_of_sale", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  status: text("status", { enum: ["active", "paused"] }).notNull().default("active"),
});

export const draws = sqliteTable("draws", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lottery: text("lottery").notNull(),
  drawName: text("draw_name").notNull(),
  closesAt: text("closes_at").notNull(),
  status: text("status", { enum: ["open", "closed", "settled"] }).notNull().default("open"),
  result: text("result"),
  source: text("source", { enum: ["api", "super_admin"] }).notNull().default("super_admin"),
  updatedAt: text("updated_at").notNull(),
});

export const tickets = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  pointOfSaleId: integer("point_of_sale_id").notNull().references(() => pointsOfSale.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  total: real("total").notNull(),
  status: text("status", { enum: ["valid", "winner", "loser", "cancelled"] }).notNull().default("valid"),
  createdAt: text("created_at").notNull(),
});

export const plays = sqliteTable("plays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id),
  lottery: text("lottery").notNull(),
  draw: text("draw").notNull(),
  type: text("type").notNull(),
  number: text("number").notNull(),
  amount: real("amount").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorId: integer("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: text("details"),
  createdAt: text("created_at").notNull(),
});
