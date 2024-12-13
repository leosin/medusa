import { useParams, useSearchParams } from "react-router-dom"
import { RouteFocusModal } from "../../../components/modals"
import { PRODUCT_VARIANT_IDS_KEY } from "../common/constants"
import { ProductInventoryForm } from "./components/product-inventory-form"
import { useProductInventoryData } from "./hooks/use-product-inventory-data"

export const ProductInventory = () => {
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
      {isLoaded && (
        <ProductInventoryForm variants={variants} locations={locations} />
      )}
    </RouteFocusModal>
  )
}
