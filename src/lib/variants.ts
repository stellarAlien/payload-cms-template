/**
 * src/lib/variants.ts
 * Pure helper functions — no Payload imports.
 * Safe to use in both server and client components.
 */

export interface VariantOption {
  name: string
  value: string
}

export interface ProductVariant {
  id: string
  variantSku: string
  variantOptions: VariantOption[]
  price?: number
  stock?: number
  inStock: boolean
  image?: { url: string; alt?: string }
}

export interface VariantAttribute {
  name: string
  label: string
  values: string[]
}

export interface VariantSelection {
  [attributeName: string]: string | undefined
}

export function getVariantAttributes(variants: ProductVariant[]): VariantAttribute[] {
  const map = new Map<string, Set<string>>()
  variants.forEach((v) => {
    v.variantOptions?.forEach((opt) => {
      if (opt.name && opt.value?.trim()) {
        if (!map.has(opt.name)) map.set(opt.name, new Set())
        map.get(opt.name)!.add(opt.value.trim())
      }
    })
  })
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, valuesSet]) => ({
      name,
      label: name.charAt(0).toUpperCase() + name.slice(1),
      values: Array.from(valuesSet).sort(),
    }))
}

function getAttributeValue(variant: ProductVariant, name: string): string | null {
  return variant.variantOptions?.find((o) => o.name === name)?.value ?? null
}

export function findVariantBySelection(
  variants: ProductVariant[],
  selection: VariantSelection,
  attributes: VariantAttribute[],
): ProductVariant | null {
  if (!attributes.every((a) => Boolean(selection[a.name]))) return null
  return (
    variants.find((v) =>
      Object.entries(selection).every(([key, val]) => {
        if (!val) return true
        return getAttributeValue(v, key) === val
      }),
    ) ?? null
  )
}

export function isValueAvailable(
  variants: ProductVariant[],
  currentSelection: VariantSelection,
  attributeName: string,
  value: string,
): boolean {
  const testSelection = { ...currentSelection, [attributeName]: value }
  return variants.some((v) =>
    Object.entries(testSelection).every(([key, val]) => {
      if (!val) return true
      return getAttributeValue(v, key) === val
    }),
  )
}

export function buildVariantQueryString(selection: VariantSelection): string {
  const params = new URLSearchParams()
  Object.entries(selection).forEach(([k, v]) => { if (v) params.set(k, v) })
  return params.toString()
}

export function parseVariantSelectionFromSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  availableAttributes: VariantAttribute[],
): VariantSelection {
  if (!searchParams) return {}
  const selection: VariantSelection = {}
  availableAttributes.forEach((attr) => {
    const raw = searchParams[attr.name]
    if (raw) selection[attr.name] = Array.isArray(raw) ? raw[0] : raw
  })
  return selection
}