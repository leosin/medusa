import set from "lodash/set"
import { useCallback } from "react"
import { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form"

import { DataGridMatrix } from "../models"
import { DataGridColumnType, DataGridCoordinates } from "../types"

type UseDataGridFormHandlersOptions<TData, TFieldValues extends FieldValues> = {
  matrix: DataGridMatrix<TData, TFieldValues>
  form: UseFormReturn<TFieldValues>
  anchor: DataGridCoordinates | null
}

export const useDataGridFormHandlers = <
  TData,
  TFieldValues extends FieldValues
>({
  matrix,
  form,
  anchor,
}: UseDataGridFormHandlersOptions<TData, TFieldValues>) => {
  const { getValues, reset } = form

  const getSelectionValues = useCallback(
    (fields: string[]): PathValue<TFieldValues, Path<TFieldValues>>[] => {
      if (!fields.length) {
        return []
      }

      const allValues = getValues()
      return fields.map((field) => {
        return field.split(".").reduce((obj, key) => obj?.[key], allValues)
      }) as PathValue<TFieldValues, Path<TFieldValues>>[]
    },
    [getValues]
  )

  const setSelectionValues = useCallback(
    async (fields: string[], values: string[]) => {
      if (!fields.length || !anchor) {
        return
      }

      const type = matrix.getCellType(anchor)
      if (!type) {
        return
      }

      const convertedValues = convertArrayToPrimitive(values, type)
      const currentValues = getValues()

      fields.forEach((field, index) => {
        if (!field) {
          return
        }

        const valueIndex = index % values.length
        const value = convertedValues[valueIndex]

        set(currentValues, field, value)
      })

      reset(currentValues, {
        keepDirty: true,
        keepTouched: true,
        keepDefaultValues: true,
      })
    },
    [matrix, anchor, getValues, reset]
  )

  return {
    getSelectionValues,
    setSelectionValues,
  }
}

function convertToNumber(value: string | number): number {
  if (typeof value === "number") {
    return value
  }

  const converted = Number(value)

  if (isNaN(converted)) {
    throw new Error(`String "${value}" cannot be converted to number.`)
  }

  return converted
}

function convertToBoolean(value: string | boolean): boolean {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "undefined" || value === null) {
    return false
  }

  const lowerValue = value.toLowerCase()

  if (lowerValue === "true" || lowerValue === "false") {
    return lowerValue === "true"
  }

  throw new Error(`String "${value}" cannot be converted to boolean.`)
}

function covertToString(value: any): string {
  if (typeof value === "undefined" || value === null) {
    return ""
  }

  return String(value)
}

export function convertArrayToPrimitive(
  values: any[],
  type: DataGridColumnType
): any[] {
  switch (type) {
    case "number":
      return values.map((v) => {
        if (v === "") {
          return v
        }

        if (v == null) {
          return ""
        }

        return convertToNumber(v)
      })
    case "boolean":
      return values.map(convertToBoolean)
    case "text":
      return values.map(covertToString)
    default:
      throw new Error(`Unsupported target type "${type}".`)
  }
}
