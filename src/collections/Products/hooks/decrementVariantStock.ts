import type { CollectionAfterChangeHook } from 'payload'

/**
 * decrementVariantStock
 * Location: src/collections/Products/hooks/decrementVariantStock.ts
 *
 * Fired after an Order document changes.
 * Decrements per-variant stock exactly once when status first becomes 'paid'.
 * The inStock flag is kept in sync automatically by the beforeChange hook
 * on ProductVariants — this hook only touches `stock`.
 */
export const decrementVariantStock: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  const isPaid = doc.status === 'paid'
  const wasAlreadyPaid = previousDoc?.status === 'paid'
  const alreadyDecremented = Boolean(doc.stockDecrementedAt)

  // Guard: only run once, on the transition to 'paid'
  if (!isPaid || wasAlreadyPaid || alreadyDecremented) return

  const errors: string[] = []

  for (const item of doc.items ?? []) {
    if (!item.variantId) continue // skip items without a variant

    // Unwrap populated relationship object or use raw ID string
    const variantId =
      typeof item.variantId === 'object' && item.variantId !== null
        ? item.variantId.id
        : item.variantId

    try {
      const variant = await req.payload.findByID({
        collection: 'product-variants',
        id: variantId,
        req, // preserves transaction context
      })

      const newStock = Math.max(0, (variant.stock ?? 0) - (item.quantity ?? 1))

      await req.payload.update({
        collection: 'product-variants',
        id: variantId,
        data: {
          stock: newStock,
          // ✅ Do NOT set inStock here — the beforeChange hook on
          // ProductVariants handles that automatically based on stock.
        },
        req,
      })
    } catch (err) {
      // Collect errors so one bad variant doesn't abort the whole loop
      errors.push(
        `Failed to decrement stock for variant ${variantId}: ${(err as Error).message}`,
      )
    }
  }

  if (errors.length > 0) {
    req.payload.logger.error({ errors }, `Stock decrement errors on order ${doc.id}`)
  }

  // Stamp the decrement timestamp to prevent double-runs on future saves
  await req.payload.update({
    collection: 'orders',
    id: doc.id,
    data: { stockDecrementedAt: new Date().toISOString() },
    req,
  })
}