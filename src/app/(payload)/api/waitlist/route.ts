import { getPayload } from 'payload'
import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, product } = await req.json()

    if (!email || !product) {
      return NextResponse.json({ error: 'Email and product are required.' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Prevent duplicate signups for the same product
    const existing = await payload.find({
      collection: 'waitlist',
      where: {
        and: [
          { email: { equals: email } },
          { product: { equals: product } },
          { status: { equals: 'pending' } },
        ],
      },
    })

    if (existing.totalDocs > 0) {
      // Return success silently — don't expose that this email is already listed
      return NextResponse.json({ success: true }, { status: 200 })
    }

    await payload.create({
      collection: 'waitlist',
      data: { email, product, status: 'pending' },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[Waitlist API Error]', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}