import { Spinner } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { ColumnDef } from "@tanstack/react-table"
import { useTranslation } from "react-i18next"
import { useParams, useSearchParams } from "react-router-dom"
import { Skeleton } from "../../../components/common/skeleton"
import { DataGridSkeleton } from "../../../components/data-grid/components"
import { RouteFocusModal } from "../../../components/modals"
import { PRODUCT_VARIANT_IDS_KEY } from "../common/constants"
import { ProductStockForm } from "./components/product-stock-form"
import { useProductInventoryData } from "./hooks/use-product-inventory-data"

export const ProductStock = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  const productVariantIds =
    searchParams.get(PRODUCT_VARIANT_IDS_KEY)?.split(",") || undefined

  const { variants, locations, isLoaded } = useProductInventoryData(
    id!,
    productVariantIds
  )

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("products.stock.heading")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("products.stock.description")}</span>
      </RouteFocusModal.Description>
      {isLoaded ? (
        <ProductStockForm variants={variants} locations={locations} />
      ) : (
        <ProductStockSkeleton />
      )}
    </RouteFocusModal>
  )
}

const ProductStockSkeleton = () => {
  const { t } = useTranslation()

  return (
    <div className="relative flex size-full flex-col items-center justify-center divide-y">
      <div className="absolute inset-0 z-10 flex size-full flex-col items-center justify-center gap-y-2">
        <Spinner className="text-ui-fg-interactive animate-spin" />
        <Text size="small" className="text-ui-fg-muted">
          {t("products.stock.loading")}
        </Text>
      </div>
      <div className="flex size-full flex-col divide-y">
        <div className="px-4 py-2">
          <Skeleton className="h-7 w-7" />
        </div>
        <div className="flex-1 overflow-auto">
          <DataGridSkeleton
            columns={Array.from({ length: 10 }) as ColumnDef<any>[]}
          />
        </div>
        <div className="bg-ui-bg-base flex items-center justify-end gap-x-2 p-4">
          <Skeleton className="h-7 w-[59px]" />
          <Skeleton className="h-7 w-[46px]" />
        </div>
      </div>
    </div>
  )
}
