import { zodResolver } from "@hookform/resolvers/zod"
import { HttpTypes } from "@medusajs/types"
import { Button, toast } from "@medusajs/ui"
import { useMemo, useRef } from "react"
import { DefaultValues, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { DataGrid } from "../../../../../components/data-grid"
import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useBatchInventoryItemsLocationLevels } from "../../../../../hooks/api"
import { castNumber } from "../../../../../lib/cast-number"
import { useProductStockColumns } from "../../hooks/use-product-stock-columns"
import {
  ProductStockInventoryItemSchema,
  ProductStockLocationSchema,
  ProductStockSchema,
  ProductStockVariantSchema,
} from "../../schema"
import { ProductVariantInventoryItemLink } from "../../types"
import {
  getDisabledInventoryRows,
  isProductVariantWithInventoryPivot,
} from "../../utils"

type ProductStockFormProps = {
  variants: HttpTypes.AdminProductVariant[]
  locations: HttpTypes.AdminStockLocation[]
}

export const ProductStockForm = ({
  variants,
  locations,
}: ProductStockFormProps) => {
  const { t } = useTranslation()
  const { setCloseOnEscape } = useRouteModal()
  const { handleSuccess } = useRouteModal()

  const form = useForm<ProductStockSchema>({
    defaultValues: getDefaultValue(variants as any, locations),
    resolver: zodResolver(ProductStockSchema),
  })

  const initialValues = useRef(getDefaultValue(variants as any, locations))

  const disabled = useMemo(
    () => getDisabledInventoryRows(variants as any),
    [variants]
  )
  const columns = useProductStockColumns(locations, disabled)

  const { mutateAsync, isPending } = useBatchInventoryItemsLocationLevels()

  const onSubmit = form.handleSubmit(async (data) => {
    const payload: HttpTypes.AdminBatchInventoryItemsLocationLevels = {
      create: [],
      update: [],
      delete: [],
      force: true,
    }

    for (const [variantId, variant] of Object.entries(data.variants)) {
      for (const [inventory_item_id, item] of Object.entries(
        variant.inventory_items
      )) {
        for (const [location_id, level] of Object.entries(item.locations)) {
          if (level.id) {
            const wasChecked =
              initialValues.current?.variants?.[variantId]?.inventory_items?.[
                inventory_item_id
              ]?.locations?.[location_id]?.checked

            if (wasChecked && !level.checked) {
              payload.delete.push(level.id)
            } else {
              const newQuantity =
                level.quantity !== "" ? castNumber(level.quantity) : 0
              const originalQuantity =
                initialValues.current?.variants?.[variantId]?.inventory_items?.[
                  inventory_item_id
                ]?.locations?.[location_id]?.quantity

              if (newQuantity !== originalQuantity) {
                payload.update.push({
                  inventory_item_id,
                  location_id,
                  stocked_quantity: newQuantity,
                })
              }
            }
          }

          if (!level.id && level.quantity !== "") {
            payload.create.push({
              inventory_item_id,
              location_id,
              stocked_quantity: castNumber(level.quantity),
            })
          }
        }
      }
    }

    await mutateAsync(payload, {
      onSuccess: () => {
        toast.success(t("products.stock.successToast"))
        handleSuccess()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  })

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm onSubmit={onSubmit} className="flex h-full flex-col">
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex-1">
          <DataGrid
            state={form}
            columns={columns}
            data={variants}
            getSubRows={getSubRows}
            onEditingChange={(editing) => setCloseOnEscape(!editing)}
          />
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-2">
            <RouteFocusModal.Close asChild>
              <Button variant="secondary" size="small" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button type="submit" size="small" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}

function getSubRows(
  row: HttpTypes.AdminProductVariant | ProductVariantInventoryItemLink
): ProductVariantInventoryItemLink[] | undefined {
  if (isProductVariantWithInventoryPivot(row)) {
    return row.inventory_items
  }
}

function getDefaultValue(
  variants: (HttpTypes.AdminProductVariant & {
    inventory_items: ProductVariantInventoryItemLink[]
  })[],
  locations: HttpTypes.AdminStockLocation[]
): DefaultValues<ProductStockSchema> {
  return {
    variants: variants.reduce((variantAcc, variant) => {
      const inventoryItems = variant.inventory_items.reduce((itemAcc, item) => {
        const locationsMap = locations.reduce((locationAcc, location) => {
          const level = item.inventory.location_levels?.find(
            (level) => level.location_id === location.id
          )

          locationAcc[location.id] = {
            id: level?.id,
            quantity:
              level?.stocked_quantity !== undefined
                ? level?.stocked_quantity
                : "",
            checked: !!level,
            disabledToggle:
              (level?.incoming_quantity || 0) > 0 ||
              (level?.reserved_quantity || 0) > 0,
          }
          return locationAcc
        }, {} as ProductStockLocationSchema)

        itemAcc[item.inventory_item_id] = { locations: locationsMap }
        return itemAcc
      }, {} as Record<string, ProductStockInventoryItemSchema>)

      variantAcc[variant.id] = { inventory_items: inventoryItems }
      return variantAcc
    }, {} as Record<string, ProductStockVariantSchema>),
  }
}
