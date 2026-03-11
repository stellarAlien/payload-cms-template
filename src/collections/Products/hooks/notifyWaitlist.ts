import { AfterChangeHook } from 'payload'

export const notifyWaitlist: AfterChangeHook = async ({ doc, previousDoc, req }) => {
  const { payload } = req

  // --- Case 1: Product without variants ---
  // Watch product-level inventory directly
  const productRestocked = !doc.enableVariants &&
    previousDoc?.inventory <= 0 &&
    doc?.inventory > 0

  if (productRestocked) {
    await notifyEntries({
      payload,
      productId: doc.id,
      variantId: null,
      title: doc.title,
    })
  }

  // --- Case 2: Product with variants ---
  // Compare each variant's inventory between previousDoc and doc
  if (doc.enableVariants) {
    const currentVariants: any[] = doc.variants?.docs || []
    const previousVariants: any[] = previousDoc?.variants?.docs || []

    for (const variant of currentVariants) {
      if (typeof variant !== 'object' || !variant?.id) continue

      const previousVariant = previousVariants.find(
        (v: any) => typeof v === 'object' && String(v.id) === String(variant.id),
      )

      const variantRestocked =
        (previousVariant?.inventory ?? 0) <= 0 && (variant?.inventory ?? 0) > 0

      if (variantRestocked) {
        await notifyEntries({
          payload,
          productId: doc.id,
          variantId: variant.id,
          title: `${doc.title} — ${variant.title || variant.id}`,
        })
      }
    }
  }
}

// Shared helper: find pending waitlist entries and fire emails
async function notifyEntries({
  payload,
  productId,
  variantId,
  title,
}: {
  payload: any
  productId: string | number
  variantId: string | number | null
  title: string
}) {
  const where: any = {
    and: [
      { product: { equals: productId } },
      { status: { equals: 'pending' } },
    ],
  }

  // If variant-specific, only notify people who signed up for this variant.
  // Also notify people who signed up without specifying a variant (legacy entries).
  if (variantId) {
    where.and.push({
      or: [
        { variant: { equals: String(variantId) } },
        { variant: { exists: false } },
      ],
    })
  }

  const entries = await payload.find({
    collection: 'waitlist',
    where,
  })

  if (entries.totalDocs === 0) return

  await Promise.all(
    entries.docs.map(async (entry: any) => {
      await payload.sendEmail({
        to: entry.email,
        subject: `${title} is back in stock!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${title} is back!</h2>
            <p>Good news — the item you were waiting for is now available.</p>
            <p>Grab it before it sells out again.</p>
          </div>
        `,
      })

      await payload.update({
        collection: 'waitlist',
        id: entry.id,
        data: { status: 'notified' },
      })
    }),
  )
}