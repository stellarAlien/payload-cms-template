'use client'

import { Product, Variant } from '@/payload-types'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

type Props = {
  product: Product
}

export const StockIndicator: React.FC<Props> = ({ product }) => {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Fix #2: guard against docs being IDs instead of expanded objects
  const variants = useMemo(() => {
    return (product.variants?.docs || []).filter(
      (v): v is Variant => typeof v === 'object' && v !== null,
    )
  }, [product.variants?.docs])

  const selectedVariant = useMemo<Variant | undefined>(() => {
    if (product.enableVariants && variants.length) {
      // Fix #1: URL param is always a string, variant.id may be number or string
      const variantId = searchParams.get('variant')
      return variants.find((variant) => String(variant.id) === variantId)
    }
    return undefined
  }, [product.enableVariants, searchParams, variants])

  const stockQuantity = useMemo(() => {
    if (product.enableVariants) {
      return selectedVariant?.inventory || 0
    }
    return product.inventory || 0
  }, [product.enableVariants, selectedVariant, product.inventory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          product: product.id,
          // Fix #3: include specific variant so notification is relevant
          ...(selectedVariant?.id ? { variant: selectedVariant.id } : {}),
        }),
      })

      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  // Wait for variant selection before rendering anything
  if (product.enableVariants && !selectedVariant) {
    return null
  }

  // In stock — show low stock warning if applicable
  if (stockQuantity > 0) {
    return (
      <div className="uppercase font-mono text-sm font-medium text-gray-500">
        {stockQuantity < 10 && <p>Only {stockQuantity} left in stock</p>}
      </div>
    )
  }

  // Out of stock — show waitlist form
  return (
    <div className="flex flex-col gap-3">
      <p className="uppercase font-mono text-sm font-medium text-gray-500">Out of stock</p>

      {status === 'success' ? (
        <p className="text-sm text-green-600 font-medium">
          ✓ You&apos;re on the list! We&apos;ll email you when it&apos;s back.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <p className="text-xs text-gray-500">Notify me when this becomes available:</p>
          <input
            type="email"
            placeholder="your@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 px-3 py-2 text-sm focus:border-black outline-none"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-black text-white py-2 px-4 text-xs font-bold uppercase disabled:bg-gray-400 transition-colors"
          >
            {status === 'loading' ? 'Joining...' : 'Notify Me'}
          </button>
          {status === 'error' && (
            <p className="text-red-500 text-xs">Something went wrong. Please try again.</p>
          )}
        </form>
      )}
    </div>
  )
}