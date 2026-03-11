// src/hooks/notifyWaitlist.ts
import { AfterChangeHook } from 'payload'

export const notifyWaitlist: AfterChangeHook = async ({ doc, previousDoc, req }) => {
  const { payload } = req
  
  // Logic: Only fire if stock went from 0 (or less) to > 0
  const isRestocked = (previousDoc?.inventory <= 0 || !previousDoc?.inventory) && doc.inventory > 0

  if (isRestocked) {
    const entries = await payload.find({
      collection: 'waitlist',
      where: {
        and: [
          { product: { equals: doc.id } },
          { status: { equals: 'pending' } }
        ]
      },
    })

    if (entries.docs.length > 0) {
      await Promise.all(
        entries.docs.map(async (entry: any) => {
          try {
            await payload.sendEmail({
              to: entry.email,
              subject: `RESTOCK: ${doc.title} is now available`,
              html: `
                <div style="font-family: sans-serif; text-transform: uppercase; border: 1px solid #000; padding: 20px;">
                  <h2 style="letter-spacing: 2px;">It's Back.</h2>
                  <p>${doc.title} is back in stock and ready to ship.</p>
                  <a href="${process.env.NEXT_PUBLIC_SERVER_URL}/products/${doc.slug}" 
                     style="background: black; color: white; padding: 15px 30px; text-decoration: none; display: inline-block; font-weight: bold;">
                    SHOP NOW
                  </a>
                </div>
              `,
            })

            await payload.update({
              collection: 'waitlist',
              id: entry.id,
              data: { status: 'notified' },
            })
          } catch (err) {
            payload.logger.error(`Waitlist error for ${entry.email}: ${err}`)
          }
        })
      )
    }
  }
}