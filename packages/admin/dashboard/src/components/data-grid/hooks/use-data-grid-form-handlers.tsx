import get from "lodash/get"
import set from "lodash/set"
import { useCallback } from "react"
import { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form"

import { DataGridMatrix } from "../models"
import {
  DataGridColumnType,
  DataGridCoordinates,
  DataGridToggleableNumber,
} from "../types"

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
    async (fields: string[], values: string[], isHistory?: boolean) => {
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
        const newValue = convertedValues[valueIndex]

        setValue(currentValues, field, newValue, type, isHistory)
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

function convertToggleableNumber(value: any): {
  quantity: number
  checked: boolean
  disabledToggle: boolean
} {
  let obj = value

  if (typeof obj === "string") {
    try {
      obj = JSON.parse(obj)
    } catch (error) {
      throw new Error(`String "${value}" cannot be converted to object.`)
    }
  }

  return obj
}

function setValue<
  T extends DataGridToggleableNumber = DataGridToggleableNumber
>(
  currentValues: any,
  field: string,
  newValue: T,
  type: string,
  /**
   * If an value is being set by a history command, we should not check
   * for any conditions whether the value is allowed to be changed.
   */
  isHistory?: boolean
) {
  const currentValue = get(currentValues, field)

  if (type === "togglable-number") {
    if (isHistory) {
      set(currentValues, `${field}.quantity`, newValue.quantity)
      set(currentValues, `${field}.checked`, newValue.checked)
      return
    }

    const currentChecked = currentValue.checked
    const disabledToggle = currentValue.disabledToggle

    const newQuantityNumber =
      newValue.quantity != null && newValue.quantity !== ""
        ? Number(newValue.quantity)
        : null

    // TODO:
    // 1. Tag højde for den nye værdis checked felt.
    // 2. Hvis et felt bliver unchecked, så burde vi fjerne quantity, og istedet vise "Not available"
    // 3. Hvis du sætter quantity til "", på et felt der har disabledToggle, så bør vi rette quantity til 0.

    // Determine if checked should be updated
    let newChecked = currentChecked
    if (!disabledToggle) {
      if (
        currentChecked === false &&
        newQuantityNumber != null &&
        newQuantityNumber > 0
      ) {
        newChecked = true
      }

      if (currentChecked === true && !newQuantityNumber) {
        newChecked = false
      }
    }

    set(currentValues, field, {
      ...currentValue,
      quantity: newValue.quantity,
      checked: newChecked,
    })

    return
  }

  set(currentValues, field, newValue)
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
    case "togglable-number":
      return values.map(convertToggleableNumber)
    case "boolean":
      return values.map(convertToBoolean)
    case "text":
      return values.map(covertToString)
    default:
      throw new Error(`Unsupported target type "${type}".`)
  }
}
