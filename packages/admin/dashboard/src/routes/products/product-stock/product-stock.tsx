import { useTranslation } from "react-i18next"
import { useParams, useSearchParams } from "react-router-dom"
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
      {isLoaded && (
        <ProductStockForm variants={variants} locations={locations} />
      )}
    </RouteFocusModal>
  )
}
