import { relations, sql } from 'drizzle-orm'
import {
  bigint, boolean, check, customType, date, index, integer, jsonb, numeric,
  pgEnum, pgTable, primaryKey, text, time, timestamp, unique, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' })
const id = (name: string) => bigint(name, { mode: 'number' }).generatedAlwaysAsIdentity()

export const maintenanceType = pgEnum('maintenance_type_enum', ['preventive', 'corrective'])
export const maintenanceStatus = pgEnum('maintenance_status_enum', ['pending', 'approved', 'rejected'])

export const machineTypes = pgTable('machine_types', {
  typeCode: text('type_code').primaryKey(), name: text('name').notNull(), description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const machinery = pgTable('machinery', {
  machineryId: id('machinery_id').primaryKey(),
  externalCode: text('external_code').notNull(), machineryFullName: text('machinery_full_name').notNull(),
  machineryName: text('machinery_name'), machineryModel: text('machinery_model'),
  machinerySerialCode: text('machinery_serial_code'), observations: text('observations'),
  isRented: boolean('is_rented').default(false),
  machineType: text('machine_type').default('machine').references(() => machineTypes.typeCode),
  expectedConsumptionRate: numeric('expected_consumption_rate', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  unique('unique_external_code').on(table.externalCode),
  unique('unique_machine_identity').on(table.machineryName, table.machineryModel, table.machinerySerialCode),
])

export const projects = pgTable('projects', {
  projectId: id('project_id').primaryKey(), projectName: text('project_name').notNull().unique('unique_project_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const machineryLogs = pgTable('machinery_logs', {
  machineryLogId: id('machinery_log_id').primaryKey(),
  machineId: bigint('machine_id', { mode: 'number' }).notNull().references(() => machinery.machineryId),
  projectId: bigint('project_id', { mode: 'number' }).notNull().references(() => projects.projectId),
  date: date('date', { mode: 'string' }).defaultNow().notNull(), operatorName: text('operator_name').notNull(),
  startTime: time('start_time'), endTime: time('end_time'),
  fuelLiters: numeric('fuel_liters', { precision: 10, scale: 2 }).notNull(),
  fuelPrice: numeric('fuel_price', { precision: 10, scale: 2 }), effectiveHours: numeric('effective_hours', { precision: 10, scale: 2 }),
  observations: text('observations'), isCompleted: boolean('is_completed').default(false).notNull(),
  isCorrected: boolean('is_corrected').default(false).notNull(), hashId: text('hash_id').notNull().unique(),
  status: text('status').default('started').notNull(), pauseEvents: jsonb('pause_events').default([]).notNull(),
  totalPausedMinutes: integer('total_paused_minutes').default(0).notNull(), autoClosed: boolean('auto_closed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  check('machinery_logs_status_check', sql`${table.status} in ('started','paused','completed')`),
  uniqueIndex('unique_active_shift_per_machine').on(table.machineId).where(sql`${table.isCompleted} = false`),
])

export const maintenanceRequests = pgTable('maintenance_requests', {
  maintenanceRequestId: id('maintenance_request_id').primaryKey(),
  machineId: bigint('machine_id', { mode: 'number' }).notNull().references(() => machinery.machineryId),
  projectId: bigint('project_id', { mode: 'number' }).references(() => projects.projectId),
  maintenanceType: maintenanceType('maintenance_type').notNull(), type: maintenanceType('type').notNull(),
  date: date('date', { mode: 'string' }).defaultNow().notNull(), lastMaintenanceDate: date('last_maintenance_date', { mode: 'string' }),
  nextMaintenanceDate: date('next_maintenance_date', { mode: 'string' }), description: text('description').notNull(),
  spareParts: jsonb('spare_parts').default([]), status: maintenanceStatus('status').default('pending').notNull(),
  isExternal: boolean('is_external').default(false), cost: numeric('cost', { precision: 12, scale: 2 }).default('0'),
  workedTime: numeric('worked_time', { precision: 10, scale: 2 }).default('0'), downtime: numeric('downtime', { precision: 10, scale: 2 }).default('0'),
  observations: text('observations'), hashId: text('hash_id').notNull().unique(),
  approvalTokenHash: text('approval_token_hash'), approvalTokenExpiresAt: timestamp('approval_token_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [index('idx_maintenance_requests_hash_id').on(table.hashId)])

export const machineryDepreciation = pgTable('machinery_depreciation', {
  machineryId: bigint('machinery_id', { mode: 'number' }).notNull().references(() => machinery.machineryId, { onDelete: 'cascade' }),
  optimalFuelConsumption: numeric('optimal_fuel_consumption', { precision: 10, scale: 2 }), serviceLife: integer('service_life'),
  purchaseValue: numeric('purchase_value', { precision: 15, scale: 2 }), rescueValue: numeric('rescue_value', { precision: 5, scale: 4 }),
  estimatedDepreciationRate: numeric('estimated_depreciation_rate', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [primaryKey({ columns: [table.machineryId] })])

export const files = pgTable('files', {
  fileId: uuid('file_id').defaultRandom().primaryKey(), ownerUserId: text('owner_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  maintenanceRequestId: bigint('maintenance_request_id', { mode: 'number' }).references(() => maintenanceRequests.maintenanceRequestId, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(), originalFilename: text('original_filename').notNull(), mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(), content: bytea('content').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('files_purpose_check', sql`${table.purpose} in ('avatar','maintenance_attachment')`),
  check('files_size_check', sql`${table.sizeBytes} > 0`),
  index('files_owner_idx').on(table.ownerUserId), index('files_maintenance_idx').on(table.maintenanceRequestId),
  uniqueIndex('one_avatar_per_user').on(table.ownerUserId).where(sql`${table.purpose} = 'avatar'`),
])

export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  avatarFileId: uuid('avatar_file_id').references(() => files.fileId, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const machineryRelations = relations(machinery, ({ many, one }) => ({
  logs: many(machineryLogs), maintenanceRequests: many(maintenanceRequests), depreciation: one(machineryDepreciation),
}))
export const projectsRelations = relations(projects, ({ many }) => ({ logs: many(machineryLogs), maintenanceRequests: many(maintenanceRequests) }))
export const logsRelations = relations(machineryLogs, ({ one }) => ({
  machinery: one(machinery, { fields: [machineryLogs.machineId], references: [machinery.machineryId] }),
  project: one(projects, { fields: [machineryLogs.projectId], references: [projects.projectId] }),
}))
export const maintenanceRelations = relations(maintenanceRequests, ({ one, many }) => ({
  machinery: one(machinery, { fields: [maintenanceRequests.machineId], references: [machinery.machineryId] }),
  project: one(projects, { fields: [maintenanceRequests.projectId], references: [projects.projectId] }), files: many(files),
}))
