import { z } from "zod"

const LocationQuantitySchema = z.object({
  levels_id: z.string().optional(),
  quantity: z.union([z.number(), z.string()]),
  checked: z.boolean(),
})

const ProductInventoryLocationsSchema = z.record(LocationQuantitySchema)

const ProductInventoryInventoryItemSchema = z.object({
  locations: ProductInventoryLocationsSchema,
})

const ProductInventoryVariantSchema = z.object({
  inventory_items: z.record(ProductInventoryInventoryItemSchema),
})

export const ProductInventorySchema = z.object({
  variants: z.record(ProductInventoryVariantSchema),
})

export type ProductVariantLocationSchema = z.infer<
  typeof ProductInventoryLocationsSchema
>
export type ProductInventoryInventoryItemSchema = z.infer<
  typeof ProductInventoryInventoryItemSchema
>
export type ProductInventoryVariantSchema = z.infer<
  typeof ProductInventoryVariantSchema
>
export type ProductInventorySchema = z.infer<typeof ProductInventorySchema>
