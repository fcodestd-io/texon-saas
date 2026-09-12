import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
  decimal,
} from "drizzle-orm/pg-core";

// ==========================================
// ENUMS
// ==========================================
export const userRoleEnum = pgEnum("user_role", [
  "superadmin",
  "owner",
  "admin",
  "spv_production",
  "spv_warehouse",
  "spv_global",
]);

export const employeeTypeEnum = pgEnum("employee_type", [
  "sewing",
  "cutting",
  "overdeck",
  "finishing",
  "packing",
]);

export const materialCategoryEnum = pgEnum("material_category", [
  "fabric",
  "thread",
  "accessory",
]);

export const poStatusEnum = pgEnum("po_status", [
  "pending",
  "delivered",
  "canceled",
]);

export const poCategoryEnum = pgEnum("po_category", [
  "fabric",
  "thread",
  "accessory",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "in",
  "out",
  "adjustment",
  "return",
]);

export const cuttingTargetStatusEnum = pgEnum("cutting_target_status", [
  "started",
  "finished",
  "canceled",
]);

export const productionProcessCategoryEnum = pgEnum(
  "production_process_category",
  ["cutting", "sewing", "overdeck", "finishing"],
);

// ==========================================
// MASTER TABLES
// ==========================================
export const vendors = pgTable("vendors", {
  id: text("id").primaryKey(),
  brandName: text("brand_name").notNull(),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id").references(() => vendors.id, {
      onDelete: "cascade",
    }),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
    index("users_vendor_id_idx").on(table.vendorId),
  ],
);

export const units = pgTable(
  "units",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("units_vendor_name_unique").on(table.vendorId, table.name),
  ],
);

export const colors = pgTable(
  "colors",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("colors_vendor_name_unique").on(table.vendorId, table.name),
  ],
);

export const sizes = pgTable(
  "sizes",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("sizes_vendor_name_unique").on(table.vendorId, table.name),
  ],
);

// ==========================================
// MATERIAL TABLES
// ==========================================
export const materials = pgTable(
  "materials",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: materialCategoryEnum("category").notNull(),
    baseUnitId: text("base_unit_id")
      .notNull()
      .references(() => units.id),
    purchaseUnitId: text("purchase_unit_id")
      .notNull()
      .references(() => units.id),
    conversionValue: numeric("conversion_value", {
      precision: 18,
      scale: 6,
    }).notNull(),
    purchasePrice: numeric("purchase_price", {
      precision: 18,
      scale: 2,
    }).notNull(),
    stock: numeric("stock", { precision: 18, scale: 6 }).default("0").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("materials_vendor_id_idx").on(table.vendorId),
    uniqueIndex("materials_vendor_name_unique").on(table.vendorId, table.name),
  ],
);

export const materialColors = pgTable(
  "material_colors",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    colorId: text("color_id")
      .notNull()
      .references(() => colors.id, { onDelete: "cascade" }),
    stock: numeric("stock", { precision: 18, scale: 6 }).default("0").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("material_colors_vendor_id_idx").on(table.vendorId),
    index("material_colors_material_id_idx").on(table.materialId),
    index("material_colors_color_id_idx").on(table.colorId),
    uniqueIndex("material_colors_material_color_unique").on(
      table.materialId,
      table.colorId,
    ),
  ],
);

// Tabel Log Mutasi Stok Material (dengan stockBefore & stockAfter)
export const materialStockMovements = pgTable(
  "material_stock_movements",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    materialColorId: text("material_color_id").references(
      () => materialColors.id,
      { onDelete: "set null" },
    ),
    type: stockMovementTypeEnum("type").notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 6 }).notNull(),
    stockBefore: decimal("stock_before", { precision: 18, scale: 6 }).notNull(),
    stockAfter: decimal("stock_after", { precision: 18, scale: 6 }).notNull(),
    referenceType: text("reference_type").notNull(), // 'PURCHASE_ORDER', 'STOCK_ADJUSTMENT', 'PRODUCTION_USAGE'
    referenceId: text("reference_id").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stock_movements_vendor_idx").on(table.vendorId),
    index("stock_movements_material_idx").on(table.materialId),
    index("stock_movements_ref_idx").on(table.referenceId),
  ],
);

// Header Opname / Penyesuaian Stok Bahan Baku
export const materialStockAdjustments = pgTable(
  "material_stock_adjustments",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("mat_stock_adj_vendor_idx").on(table.vendorId)],
);

// Detail Item Opname / Penyesuaian Stok Bahan Baku
export const materialStockAdjustmentItems = pgTable(
  "material_stock_adjustment_items",
  {
    id: text("id").primaryKey(),
    materialStockAdjustmentId: text("material_stock_adjustment_id")
      .notNull()
      .references(() => materialStockAdjustments.id, { onDelete: "cascade" }),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    materialColorId: text("material_color_id").references(
      () => materialColors.id,
      { onDelete: "set null" },
    ),
    systemStock: decimal("system_stock", { precision: 18, scale: 6 }).notNull(),
    actualStock: decimal("actual_stock", { precision: 18, scale: 6 }).notNull(),
    difference: decimal("difference", { precision: 18, scale: 6 }).notNull(),
  },
  (table) => [
    index("mat_stock_adj_item_header_idx").on(table.materialStockAdjustmentId),
    index("mat_stock_adj_item_material_idx").on(table.materialId),
  ],
);

// ==========================================
// PRODUCT & BOM TABLES
// ==========================================
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("products_vendor_id_idx").on(table.vendorId),
    uniqueIndex("products_vendor_name_unique").on(table.vendorId, table.name),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    sizeId: text("size_id")
      .notNull()
      .references(() => sizes.id),
    colorId: text("color_id")
      .notNull()
      .references(() => colors.id),
    barcode: text("barcode"),
    price: numeric("price", { precision: 18, scale: 2 }).default("0").notNull(),
    finishingPrice: numeric("finishing_price", { precision: 18, scale: 2 })
      .default("0")
      .notNull(), // Tarif Finishing per Size/Varian
    stock: numeric("stock", { precision: 18, scale: 6 }).default("0").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("product_variants_vendor_sku_unique").on(
      table.vendorId,
      table.sku,
    ),
    uniqueIndex("product_variants_vendor_barcode_unique").on(
      table.vendorId,
      table.barcode,
    ),
    index("product_variants_product_id_idx").on(table.productId),
    index("product_variants_vendor_id_idx").on(table.vendorId),
  ],
);

export const productParts = pgTable(
  "product_parts",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    productVariantId: text("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sequence: integer("sequence").default(1).notNull(),
    cuttingPrice: numeric("cutting_price", { precision: 18, scale: 2 })
      .default("0")
      .notNull(),
    sewingPrice: numeric("sewing_price", { precision: 18, scale: 2 })
      .default("0")
      .notNull(),
    overdeckPrice: numeric("overdeck_price", { precision: 18, scale: 2 })
      .default("0")
      .notNull(),
    listPrice: numeric("list_price", { precision: 18, scale: 2 })
      .default("0")
      .notNull(),

    // ==========================================
    // TAMBAHKAN DUA KOLOM INI:
    // ==========================================
    colorMode: text("color_mode").default("matching_sku").notNull(), // "matching_sku" ATAU "fixed_color"
    fixedColorId: text("fixed_color_id").references(() => colors.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("product_parts_vendor_id_idx").on(table.vendorId),
    index("product_parts_variant_id_idx").on(table.productVariantId),
    index("product_parts_fixed_color_id_idx").on(table.fixedColorId), // Optional index untuk mempercepat JOIN warna fixed
  ],
);

export const productPartMaterials = pgTable(
  "product_part_materials",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    productPartId: text("product_part_id")
      .notNull()
      .references(() => productParts.id, { onDelete: "cascade" }),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    materialColorId: text("material_color_id").references(
      () => materialColors.id,
      { onDelete: "set null" },
    ),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    consumptionUnitId: text("consumption_unit_id")
      .notNull()
      .references(() => units.id),
    wastePercentage: numeric("waste_percentage", { precision: 8, scale: 4 })
      .default("0")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("product_part_materials_vendor_id_idx").on(table.vendorId),
    index("product_part_materials_product_part_id_idx").on(table.productPartId),
    index("product_part_materials_material_id_idx").on(table.materialId),
    index("product_part_materials_material_color_id_idx").on(
      table.materialColorId,
    ),
  ],
);

// ==========================================
// INTEGRATIONS & EMPLOYEES
// ==========================================
export const marketplaces = pgTable(
  "marketplaces",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    adminFeePercentage: numeric("admin_fee_percentage", {
      precision: 5,
      scale: 2,
    })
      .default("0")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("marketplaces_vendor_id_idx").on(table.vendorId),
    uniqueIndex("marketplaces_vendor_name_unique").on(
      table.vendorId,
      table.name,
    ),
  ],
);

export const employees = pgTable(
  "employees",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: employeeTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("employees_vendor_id_idx").on(table.vendorId)],
);

// ==========================================
// PURCHASE ORDERS
// ==========================================
export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    poNumber: text("po_number").notNull(),
    category: poCategoryEnum("category").notNull(),
    status: poStatusEnum("status").notNull().default("pending"),
    totalEstimatedAmount: decimal("total_estimated_amount", {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalActualAmount: decimal("total_actual_amount", {
      precision: 18,
      scale: 2,
    }),
    amountVariance: decimal("amount_variance", { precision: 18, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("po_vendor_number_unique").on(table.vendorId, table.poNumber),
    index("po_vendor_idx").on(table.vendorId),
    index("po_status_idx").on(table.status),
    index("po_user_idx").on(table.userId),
  ],
);

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: text("id").primaryKey(),
    purchaseOrderId: text("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    materialColorId: text("material_color_id").references(
      () => materialColors.id,
      { onDelete: "set null" },
    ),
    unitId: text("unit_id")
      .notNull()
      .references(() => units.id),
    itemNameSnapshot: text("item_name_snapshot").notNull(),
    estimatedQty: decimal("estimated_qty", {
      precision: 18,
      scale: 6,
    }).notNull(),
    actualQty: decimal("actual_qty", { precision: 18, scale: 6 }),
    unitPrice: decimal("unit_price", { precision: 18, scale: 2 }).notNull(),
    estimatedSubtotal: decimal("estimated_subtotal", {
      precision: 18,
      scale: 2,
    }).notNull(),
    actualSubtotal: decimal("actual_subtotal", { precision: 18, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("po_item_header_idx").on(table.purchaseOrderId),
    index("po_item_material_idx").on(table.materialId),
    index("po_item_unit_idx").on(table.unitId),
  ],
);

// ==========================================
// PRODUCTION TRACKING
// ==========================================
export const cuttingTargets = pgTable(
  "cutting_targets",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    targetDate: text("target_date").notNull(),
    title: text("title").notNull(),
    status: cuttingTargetStatusEnum("status").notNull().default("started"),
    notes: text("notes"),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("cutting_targets_vendor_date_idx").on(
      table.vendorId,
      table.targetDate,
    ),
    index("cutting_targets_status_idx").on(table.status),
  ],
);

export const cuttingTargetItems = pgTable(
  "cutting_target_items",
  {
    id: text("id").primaryKey(),
    cuttingTargetId: text("cutting_target_id")
      .notNull()
      .references(() => cuttingTargets.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    productVariantId: text("product_variant_id")
      .notNull()
      .references(() => productVariants.id),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    sizeSnapshot: text("size_snapshot").notNull(),
    colorSnapshot: text("color_snapshot").notNull(),
    skuSnapshot: text("sku_snapshot").notNull(),
    targetQty: decimal("target_qty", { precision: 18, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("cutting_target_items_target_idx").on(table.cuttingTargetId),
    index("cutting_target_items_variant_idx").on(table.productVariantId),
  ],
);

export const cuttingTargetItemParts = pgTable(
  "cutting_target_item_parts",
  {
    id: text("id").primaryKey(),
    cuttingTargetItemId: text("cutting_target_item_id")
      .notNull()
      .references(() => cuttingTargetItems.id, { onDelete: "cascade" }),
    partName: text("part_name").notNull(),
    partTargetQty: decimal("part_target_qty", {
      precision: 18,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("cutting_target_item_parts_item_idx").on(table.cuttingTargetItemId),
  ],
);

export const productionLogs = pgTable(
  "production_logs",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    cuttingTargetId: text("cutting_target_id")
      .notNull()
      .references(() => cuttingTargets.id, { onDelete: "cascade" }),
    category: productionProcessCategoryEnum("category").notNull(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id),
    nextEmployeeId: text("next_employee_id").references(() => employees.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("prod_logs_vendor_target_idx").on(
      table.vendorId,
      table.cuttingTargetId,
    ),
    index("prod_logs_employee_idx").on(table.employeeId),
  ],
);

export const productionLogParts = pgTable(
  "production_log_parts",
  {
    id: text("id").primaryKey(),
    productionLogId: text("production_log_id")
      .notNull()
      .references(() => productionLogs.id, { onDelete: "cascade" }),
    cuttingTargetItemId: text("cutting_target_item_id")
      .notNull()
      .references(() => cuttingTargetItems.id),
    cuttingTargetItemPartId: text("cutting_target_item_part_id")
      .notNull()
      .references(() => cuttingTargetItemParts.id),
    productPartId: text("product_part_id").references(() => productParts.id),
    qty: decimal("qty", { precision: 18, scale: 2 }).notNull(),
    defectQty: decimal("defect_qty", { precision: 18, scale: 2 })
      .default("0.00")
      .notNull(),
    defectNotes: text("defect_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("prod_log_parts_log_idx").on(table.productionLogId),
    index("prod_log_parts_part_idx").on(table.cuttingTargetItemPartId),
  ],
);

export const productionLogFinishingItems = pgTable(
  "production_log_finishing_items",
  {
    id: text("id").primaryKey(),
    productionLogId: text("production_log_id")
      .notNull()
      .references(() => productionLogs.id, { onDelete: "cascade" }),
    cuttingTargetItemId: text("cutting_target_item_id")
      .notNull()
      .references(() => cuttingTargetItems.id),
    productVariantId: text("product_variant_id")
      .notNull()
      .references(() => productVariants.id),
    completedQty: decimal("completed_qty", {
      precision: 18,
      scale: 2,
    }).notNull(),
    defectQty: decimal("defect_qty", {
      precision: 18,
      scale: 2,
    })
      .default("0.00")
      .notNull(),
    defectNotes: text("defect_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("prod_log_finish_log_idx").on(table.productionLogId),
    index("prod_log_finish_item_idx").on(table.cuttingTargetItemId),
  ],
);

// ==========================================
// WAREHOUSE & PRODUCT STOCK
// ==========================================
export const productStockMovements = pgTable(
  "product_stock_movements",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    productVariantId: text("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    type: stockMovementTypeEnum("type").notNull(),
    quantity: decimal("quantity", { precision: 18, scale: 2 }).notNull(),
    stockBefore: decimal("stock_before", { precision: 18, scale: 2 }).notNull(),
    stockAfter: decimal("stock_after", { precision: 18, scale: 2 }).notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("prod_stock_mov_variant_idx").on(table.productVariantId),
    index("prod_stock_mov_vendor_idx").on(table.vendorId),
  ],
);

export const stockAdjustments = pgTable(
  "stock_adjustments",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("stock_adj_vendor_idx").on(table.vendorId)],
);

export const stockAdjustmentItems = pgTable(
  "stock_adjustment_items",
  {
    id: text("id").primaryKey(),
    stockAdjustmentId: text("stock_adjustment_id")
      .notNull()
      .references(() => stockAdjustments.id, { onDelete: "cascade" }),
    productVariantId: text("product_variant_id")
      .notNull()
      .references(() => productVariants.id),
    systemStock: decimal("system_stock", { precision: 18, scale: 2 }).notNull(),
    actualStock: decimal("actual_stock", { precision: 18, scale: 2 }).notNull(),
    difference: decimal("difference", { precision: 18, scale: 2 }).notNull(),
  },
  (table) => [index("stock_adj_item_adj_idx").on(table.stockAdjustmentId)],
);

export const warehouseIncomings = pgTable(
  "warehouse_incomings",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    cuttingTargetId: text("cutting_target_id")
      .notNull()
      .references(() => cuttingTargets.id, { onDelete: "cascade" }),
    referenceNumber: text("reference_number").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("wh_inc_vendor_idx").on(table.vendorId),
    index("wh_inc_target_idx").on(table.cuttingTargetId),
  ],
);

export const warehouseIncomingItems = pgTable(
  "warehouse_incoming_items",
  {
    id: text("id").primaryKey(),
    warehouseIncomingId: text("warehouse_incoming_id")
      .notNull()
      .references(() => warehouseIncomings.id, { onDelete: "cascade" }),
    productVariantId: text("product_variant_id")
      .notNull()
      .references(() => productVariants.id),
    quantity: decimal("quantity", { precision: 18, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("wh_inc_item_header_idx").on(table.warehouseIncomingId),
    index("wh_inc_item_variant_idx").on(table.productVariantId),
  ],
);

export const warehouseOutgoings = pgTable(
  "warehouse_outgoings",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    marketplaceId: text("marketplace_id").references(() => marketplaces.id, {
      onDelete: "set null",
    }),
    referenceNumber: text("reference_number").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("wh_out_vendor_idx").on(table.vendorId),
    index("wh_out_mkt_idx").on(table.marketplaceId),
  ],
);

export const warehouseOutgoingItems = pgTable(
  "warehouse_outgoing_items",
  {
    id: text("id").primaryKey(),
    warehouseOutgoingId: text("warehouse_outgoing_id")
      .notNull()
      .references(() => warehouseOutgoings.id, { onDelete: "cascade" }),
    productVariantId: text("product_variant_id")
      .notNull()
      .references(() => productVariants.id),
    quantity: decimal("quantity", { precision: 18, scale: 2 }).notNull(),
    stockBefore: decimal("stock_before", { precision: 18, scale: 2 }).notNull(),
    stockAfter: decimal("stock_after", { precision: 18, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("wh_out_item_header_idx").on(table.warehouseOutgoingId),
    index("wh_out_item_variant_idx").on(table.productVariantId),
  ],
);

export const warehouseReturns = pgTable(
  "warehouse_returns",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    marketplaceId: text("marketplace_id").references(() => marketplaces.id, {
      onDelete: "set null",
    }),
    referenceNumber: text("reference_number").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("wh_ret_vendor_idx").on(table.vendorId),
    index("wh_ret_mkt_idx").on(table.marketplaceId),
  ],
);

export const warehouseReturnItems = pgTable(
  "warehouse_return_items",
  {
    id: text("id").primaryKey(),
    warehouseReturnId: text("warehouse_return_id")
      .notNull()
      .references(() => warehouseReturns.id, { onDelete: "cascade" }),
    productVariantId: text("product_variant_id")
      .notNull()
      .references(() => productVariants.id),
    returnType: text("return_type").notNull(), // "RESTOCK" atau "DEFECTIVE"
    quantity: decimal("quantity", { precision: 18, scale: 2 }).notNull(),
    stockBefore: decimal("stock_before", { precision: 18, scale: 2 }).notNull(),
    stockAfter: decimal("stock_after", { precision: 18, scale: 2 }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("wh_ret_item_header_idx").on(table.warehouseReturnId),
    index("wh_ret_item_variant_idx").on(table.productVariantId),
  ],
);

// ==========================================
// PAYROLL & CASHFLOW VALIDATION
// ==========================================
export const employeePayrolls = pgTable(
  "employee_payrolls",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id), // Owner/Admin yang memvalidasi
    periodStartDate: text("period_start_date").notNull(), // Format: "YYYY-MM-DD" (Senin)
    periodEndDate: text("period_end_date").notNull(), // Format: "YYYY-MM-DD" (Minggu)
    totalSalary: decimal("total_salary", { precision: 18, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("emp_payrolls_vendor_idx").on(table.vendorId),
    index("emp_payrolls_emp_idx").on(table.employeeId),
    uniqueIndex("emp_payrolls_emp_period_unique").on(
      table.vendorId,
      table.employeeId,
      table.periodStartDate,
    ),
  ],
);
