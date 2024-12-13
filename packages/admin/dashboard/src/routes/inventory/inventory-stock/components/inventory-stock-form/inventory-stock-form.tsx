import { zodResolver } from "@hookform/resolvers/zod"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { DefaultValues, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { DataGrid } from "../../../../../components/data-grid"
import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useInventoryStockColumns } from "../../hooks/use-inventory-stock-columns"
import {
  InventoryItemSchema,
  InventoryLocationsSchema,
  InventoryStockSchema,
} from "../../schema"

type InventoryStockFormProps = {
  items: HttpTypes.AdminInventoryItem[]
  locations: HttpTypes.AdminStockLocation[]
}

export const InventoryStockForm = ({
  items,
  locations,
}: InventoryStockFormProps) => {
  const { t } = useTranslation()
  const { setCloseOnEscape } = useRouteModal()

  const form = useForm<InventoryStockSchema>({
    defaultValues: getDefaultValues(items, locations),
    resolver: zodResolver(InventoryStockSchema),
  })

  const columns = useInventoryStockColumns(locations)

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm className="flex size-full flex-col">
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="size-full flex-1 overflow-y-auto">
          <DataGrid
            columns={columns}
            data={items}
            state={form}
            onEditingChange={(editing) => {
              setCloseOnEscape(!editing)
            }}
          />
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-2">
            <RouteFocusModal.Close asChild>
              <Button variant="secondary" size="small" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button type="submit" size="small">
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}

function getDefaultValues(
  items: HttpTypes.AdminInventoryItem[],
  locations: HttpTypes.AdminStockLocation[]
): DefaultValues<InventoryStockSchema> {
  return {
    inventory_items: items.reduce((acc, item) => {
      const locationsMap = locations.reduce((locationAcc, location) => {
        const level = item.location_levels?.find(
          (level) => level.location_id === location.id
        )

        locationAcc[location.id] = {
          id: level?.id,
          quantity: level?.stocked_quantity ?? "",
          checked: !!level,
        }
        return locationAcc
      }, {} as InventoryLocationsSchema)

      acc[item.id] = { locations: locationsMap }
      return acc
    }, {} as Record<string, InventoryItemSchema>),
  }
}
