'use client'
import type { Product, Variant } from '@/payload-types'

import { RichText } from '@/components/RichText'
import { AddToCart } from '@/components/Cart/AddToCart'
import { Price } from '@/components/Price'
import React, { Suspense, useMemo } from 'react'

import { VariantSelector } from './VariantSelector'
import { useCurrency } from '@payloadcms/plugin-ecommerce/client/react'
import { StockIndicator } from '@/components/product/StockIndicator'
import { useSearchParams } from 'next/navigation'

export function ProductDescription({ product }: { product: Product }) {
  const { currency } = useCurrency()
  const searchParams = useSearchParams()

  let amount = 0,
    lowestAmount = 0,
    highestAmount = 0

  const priceField = `priceIn${currency.code}` as keyof Product
  const hasVariants = product.enableVariants && Boolean(product.variants?.docs?.length)

  if (hasVariants) {
    const priceField = `priceIn${currency.code}` as keyof Variant
    const variantsOrderedByPrice = product.variants?.docs
      ?.filter((variant) => variant && typeof variant === 'object')
      .sort((a, b) => {
        if (
          typeof a === 'object' &&
          typeof b === 'object' &&
          priceField in a &&
          priceField in b &&
          typeof a[priceField] === 'number' &&
          typeof b[priceField] === 'number'
        ) {
          return a[priceField] - b[priceField]
        }
        return 0
      }) as Variant[]

    const lowestVariant = variantsOrderedByPrice[0][priceField]
    const highestVariant = variantsOrderedByPrice[variantsOrderedByPrice.length - 1][priceField]
    if (
      variantsOrderedByPrice &&
      typeof lowestVariant === 'number' &&
      typeof highestVariant === 'number'
    ) {
      lowestAmount = lowestVariant
      highestAmount = highestVariant
    }
  } else if (product[priceField] && typeof product[priceField] === 'number') {
    amount = product[priceField]
  }

  // ── Stock check (mirrors StockIndicator logic) ─────────────────────────────
  // We compute this here so we can gate <AddToCart> without prop-drilling
  // into StockIndicator or lifting state.
  const stockQuantity = useMemo(() => {
    if (hasVariants) {
      const variantId = searchParams.get('variant')
      const variants = (product.variants?.docs || []).filter(
        (v): v is Variant => typeof v === 'object' && v !== null,
      )
      const selected = variants.find((v) => String(v.id) === variantId)
      return selected?.inventory ?? 0
    }
    return product.inventory ?? 0
  }, [hasVariants, product.variants?.docs, product.inventory, searchParams])

  const inStock = stockQuantity > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-medium">{product.title}</h1>
        <div className="uppercase font-mono">
          {hasVariants ? (
            <Price highestAmount={highestAmount} lowestAmount={lowestAmount} />
          ) : (
            <Price amount={amount} />
          )}
        </div>
      </div>

      {product.description ? (
        <RichText className="" data={product.description} enableGutter={false} />
      ) : null}

      <hr />

      {hasVariants && (
        <>
          <Suspense fallback={null}>
            <VariantSelector product={product} />
          </Suspense>
          <hr />
        </>
      )}

      {/* StockIndicator: shows low-stock warning OR out-of-stock waitlist form */}
      <div className="flex items-center justify-between">
        <Suspense fallback={null}>
          <StockIndicator product={product} />
        </Suspense>
      </div>

      {/* AddToCart: only shown when in stock */}
      {inStock && (
        <div className="flex items-center justify-between">
          <Suspense fallback={null}>
            <AddToCart product={product} />
          </Suspense>
        </div>
      )}
    </div>
  )
}