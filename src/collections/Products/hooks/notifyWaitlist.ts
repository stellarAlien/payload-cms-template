import { AfterChangeHook } from 'payload'

export const notifyWaitlist: AfterChangeHook = async ({ doc, previousDoc, req }) => {
  const { payload } = req
  
  // Checking if stock went from 0 (or less) to greater than 0
  const backInStock = previousDoc?.inventory <= 0 && doc?.inventory > 0

  if (backInStock) {
    const entries = await payload.find({
      collection: 'waitlist',
      where: {
        and: [
          { product: { equals: doc.id } },
          { status: { equals: 'pending' } }
        ],
      },
    })

    await Promise.all(
      entries.docs.map(async (entry: any) => {
        await payload.sendEmail({
          to: entry.email,
          subject: `Restock Alert: ${doc.title}`,
          html: `<div style="font-family:sans-serif;"><h2>${doc.title} is back!</h2><p>Items are now available. Get yours before they sell out again.</p></div>`,
        })

        await payload.update({
          collection: 'waitlist',
          id: entry.id,
          data: { status: 'notified' },
        })
      })
    )
  }
}