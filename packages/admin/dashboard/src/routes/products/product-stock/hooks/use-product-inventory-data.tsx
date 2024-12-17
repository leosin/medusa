import { useProductVariants, useStockLocations } from "../../../../hooks/api"

export const useProductInventoryData = (
  id: string,
  productVariantIds?: string[]
) => {
  const variantData = useProductVariants(id, {
    id: productVariantIds,
    limit: !productVariantIds ? 9999 : undefined,
    fields:
      "id,title,sku,inventory_items,inventory_items.*,inventory_items.inventory,inventory_items.inventory.id,inventory_items.inventory.title,inventory_items.inventory.sku,*inventory_items.inventory.location_levels,product.thumbnail",
  })

  const locationData = useStockLocations({
    limit: 9999,
    fields: "id,name",
  })

  const isLoaded =
    !variantData.isPending &&
    !locationData.isPending &&
    !!variantData.variants &&
    !!locationData.stock_locations

  if (variantData.isError) {
    throw variantData.error
  }

  if (locationData.isError) {
    throw locationData.error
  }

  return {
    variants: variantData.variants || [],
    locations: locationData.stock_locations || [],
    isLoaded,
  }
}
