import { HttpTypes } from "@medusajs/types"
import { useEffect, useState } from "react"
import { useStockLocations } from "../../../../hooks/api"
import { sdk } from "../../../../lib/client"

export const useProductInventoryData = (
  id: string,
  productVariantIds?: string[]
) => {
  const [variants, setVariants] = useState<HttpTypes.AdminProductVariant[]>([])
  const [isLoadingVariants, setIsLoadingVariants] = useState(true)

  const locationData = useStockLocations({
    limit: 9999,
    fields: "id,name",
  })

  /**
   * Loads variants in chunks of 20.
   *
   * This is to avoid loading too many variants at once, which
   * can cause OOM errors.
   */
  useEffect(() => {
    const fetchAllVariants = async () => {
      setIsLoadingVariants(true)
      try {
        const CHUNK_SIZE = 20
        let offset = 0
        let allVariants: HttpTypes.AdminProductVariant[] = []
        let totalCount = 0

        do {
          const { variants: chunk, count } =
            await sdk.admin.product.listVariants(id, {
              id: productVariantIds,
              offset,
              limit: CHUNK_SIZE,
              fields:
                "id,title,sku,inventory_items,inventory_items.*,inventory_items.inventory,inventory_items.inventory.id,inventory_items.inventory.title,inventory_items.inventory.sku,*inventory_items.inventory.location_levels,product.thumbnail",
            })

          allVariants = [...allVariants, ...chunk]
          totalCount = count
          offset += CHUNK_SIZE
        } while (allVariants.length < totalCount)

        setVariants(allVariants)
      } finally {
        setIsLoadingVariants(false)
      }
    }

    fetchAllVariants()
  }, [id, productVariantIds])

  if (locationData.isError) {
    throw locationData.error
  }

  const isLoaded =
    !isLoadingVariants &&
    !locationData.isPending &&
    !!locationData.stock_locations

  return {
    variants,
    locations: locationData.stock_locations || [],
    isLoaded,
  }
}
