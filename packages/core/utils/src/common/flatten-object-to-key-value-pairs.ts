type NestedObject = {
  [key: string]: any
}

export function flattenObjectToKeyValuePairs(obj: NestedObject): NestedObject {
  const result: NestedObject = {}

  // Find all paths that contain arrays of objects
  function findArrayPaths(
    obj: unknown,
    currentPath: string[] = []
  ): string[][] {
    const paths: string[][] = []

    if (!obj || typeof obj !== "object") {
      return paths
    }

    // If it's an array of objects, add this path
    if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
      paths.push(currentPath)
    }

    // Check all properties
    if (typeof obj === "object") {
      Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
        const newPath = [...currentPath, key]
        paths.push(...findArrayPaths(value, newPath))
      })
    }

    return paths
  }

  // Extract array values at a specific path
  function getArrayValues(obj: unknown, path: string[]): unknown[] {
    const arrayObj = path.reduce((acc: unknown, key: string) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[key]
      }
      return undefined
    }, obj)

    if (!Array.isArray(arrayObj)) return []

    return arrayObj
  }

  // Process non-array paths
  function processRegularPaths(obj: unknown, prefix = ""): void {
    if (!obj || typeof obj !== "object") {
      result[prefix] = obj
      return
    }

    if (Array.isArray(obj)) return

    Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
      const newPrefix = prefix ? `${prefix}.${key}` : key
      if (value && typeof value === "object" && !Array.isArray(value)) {
        processRegularPaths(value, newPrefix)
      } else if (!Array.isArray(value)) {
        result[newPrefix] = value
      }
    })
  }

  // Process the object
  processRegularPaths(obj)

  // Find and process array paths
  const arrayPaths = findArrayPaths(obj)
  arrayPaths.forEach((path) => {
    const pathStr = path.join(".")
    const arrayObjects = getArrayValues(obj, path)

    if (Array.isArray(arrayObjects) && arrayObjects.length > 0) {
      // Get all possible keys from the array objects
      const keys = new Set<string>()
      arrayObjects.forEach((item) => {
        if (item && typeof item === "object") {
          Object.keys(item as object).forEach((k) => keys.add(k))
        }
      })

      // Process each key
      keys.forEach((key) => {
        const values = arrayObjects
          .map((item) => {
            if (item && typeof item === "object") {
              return (item as Record<string, unknown>)[key]
            }
            return undefined
          })
          .filter((v) => v !== undefined)

        if (values.length > 0) {
          const newPath = `${pathStr}.${key}`
          if (values.every((v) => typeof v === "object" && !Array.isArray(v))) {
            // If these are all objects, recursively process them
            const subObj = { [key]: values }
            const subResult = flattenObjectToKeyValuePairs(subObj)
            Object.entries(subResult).forEach(([k, v]) => {
              const finalPath = `${pathStr}.${k}`
              result[finalPath] = v
            })
          } else {
            result[newPath] = values
          }
        }
      })
    }
  })

  return result
}
