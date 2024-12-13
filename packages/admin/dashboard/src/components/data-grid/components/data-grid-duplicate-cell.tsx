import { ReactNode } from "react"
import { useWatch } from "react-hook-form"
import { useDataGridCell } from "../hooks"
import { DataGridCellProps } from "../types"

export const DataGridDuplicateCell = <TData, TValue = any>({
  context,
  children,
}: DataGridCellProps<TData, TValue> & {
  children?: ReactNode | ((props: { value: TValue }) => ReactNode)
}) => {
  const { field, control } = useDataGridCell({
    context,
  })

  const value = useWatch({ control, name: field })

  return (
    <div className="bg-ui-bg-base txt-compact-small text-ui-fg-subtle flex size-full cursor-not-allowed items-center justify-between overflow-hidden px-4 py-2.5 outline-none">
      {typeof children === "function" ? children({ value: value }) : children}
    </div>
  )
}
