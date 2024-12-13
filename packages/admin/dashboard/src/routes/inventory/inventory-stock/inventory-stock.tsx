import { useSearchParams } from "react-router-dom"
import { RouteFocusModal } from "../../../components/modals"
import { useInventoryItems, useStockLocations } from "../../../hooks/api"
import { INVENTORY_ITEM_IDS_KEY } from "../common/constants"
import { InventoryStockForm } from "./components/inventory-stock-form"

export const InventoryStock = () => {
  const [searchParams] = useSearchParams()
  const inventoryItemIds =
    searchParams.get(INVENTORY_ITEM_IDS_KEY)?.split(",") || undefined

  const { inventory_items, isPending, isError, error } = useInventoryItems({
    id: inventoryItemIds,
  })

  const {
    stock_locations,
    isPending: isPendingStockLocations,
    isError: isErrorStockLocations,
    error: errorStockLocations,
  } = useStockLocations({
    limit: 9999,
    fields: "id,name",
  })

  const ready =
    !isPending &&
    !!inventory_items &&
    !isPendingStockLocations &&
    !!stock_locations

  if (isError) {
    throw error
  }

  if (isErrorStockLocations) {
    throw errorStockLocations
  }

  return (
    <RouteFocusModal>
      {ready && (
        <InventoryStockForm
          items={inventory_items}
          locations={stock_locations}
        />
      )}
    </RouteFocusModal>
  )
}
