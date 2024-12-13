export interface AdminCreateInventoryItem {
  /**
   * The inventory item's SKU.
   */
  sku?: string
  /**
   * The inventory item's HS code.
   */
  hs_code?: string
  /**
   * The inventory item's weight.
   */
  weight?: number
  /**
   * The inventory item's length.
   */
  length?: number
  /**
   * The inventory item's height.
   */
  height?: number
  /**
   * The inventory item's width.
   */
  width?: number
  /**
   * The inventory item's origin country.
   */
  origin_country?: string
  /**
   * The inventory item's MID code.
   */
  mid_code?: string
  /**
   * The inventory item's material.
   */
  material?: string
  /**
   * The inventory item's title.
   */
  title?: string
  /**
   * The inventory item's description.
   */
  description?: string
  /**
   * Whether the inventory item requires shipping.
   */
  requires_shipping?: boolean
  /**
   * The inventory item's thumbnail URL.
   */
  thumbnail?: string
  /**
   * Key-value pairs of custom data.
   */
  metadata?: Record<string, unknown>
}

export interface AdminUpdateInventoryItem extends AdminCreateInventoryItem {}

export interface AdminBatchInventoryItemLevel {
  location_id: string
  inventory_item_id: string
  stocked_quantity?: number
  incoming_quantity?: number
}

export interface AdminBatchInventoryItemLevels {
  create: AdminBatchInventoryItemLevel[]
  update: AdminBatchInventoryItemLevel[]
  delete: string[]
}
