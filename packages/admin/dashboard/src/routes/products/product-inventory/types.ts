import { HttpTypes } from "@medusajs/types"

// TODO: Create a type in the types package
export interface ProductVariantInventoryItemLink {
  id: string
  variant_id: string
  inventory_item_id: string
  inventory: HttpTypes.AdminInventoryItem
}
