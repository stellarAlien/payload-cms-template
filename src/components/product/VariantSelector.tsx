'use client'

import { Button } from '@/components/ui/button'
import type { Product } from '@/payload-types'

import { createUrl } from '@/utilities/createUrl'
import clsx from 'clsx'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React from 'react'

export function VariantSelector({ product }: { product: Product }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const variants = product.variants?.docs
  const variantTypes = product.variantTypes
  const hasVariants = Boolean(product.enableVariants && variants?.length && variantTypes?.length)

  if (!hasVariants) {
    return null
  }

  return variantTypes?.map((type) => {
    if (!type || typeof type !== 'object') return <></>

    const options = type.options?.docs
    if (!options || !Array.isArray(options) || !options.length) return <></>

    return (
      <dl key={type.id}>
        <dt className="mb-4 text-sm">{type.label}</dt>
        <dd className="flex flex-wrap gap-3">
          <React.Fragment>
            {options?.map((option) => {
              if (!option || typeof option !== 'object') return <></>

              const optionID = option.id
              const optionKeyLowerCase = type.name

              const optionSearchParams = new URLSearchParams(searchParams.toString())
              optionSearchParams.delete('variant')
              optionSearchParams.delete('image')
              optionSearchParams.set(optionKeyLowerCase, String(optionID))

              const currentOptions = Array.from(optionSearchParams.values())

              let isAvailableForSale = true

              if (variants) {
                const matchingVariant = variants
                  .filter((variant) => typeof variant === 'object')
                  .find((variant) => {
                    if (!variant.options || !Array.isArray(variant.options)) return false
                    return variant.options.every((variantOption) => {
                      if (typeof variantOption !== 'object')
                        return currentOptions.includes(String(variantOption))
                      return currentOptions.includes(String(variantOption.id))
                    })
                  })

                if (matchingVariant) {
                  optionSearchParams.set('variant', String(matchingVariant.id))
                  // Mark as unavailable but still allow selection so the
                  // waitlist form can appear via StockIndicator
                  isAvailableForSale = (matchingVariant.inventory ?? 0) > 0
                }
              }

              const optionUrl = createUrl(pathname, optionSearchParams)

              // Active if this option is currently selected in URL
              // (decoupled from isAvailableForSale so OOS options can be active)
              const isActive = searchParams.get(optionKeyLowerCase) === String(optionID)

              return (
                <Button
                  variant="ghost"
                  key={option.id}
                  // Allow clicking even when OOS — StockIndicator handles the UX
                  disabled={false}
                  aria-disabled={!isAvailableForSale}
                  className={clsx('px-2 relative', {
                    'bg-primary/5 text-primary ring-1 ring-primary': isActive,
                    // Strikethrough style for OOS options
                    'opacity-40 line-through': !isAvailableForSale,
                  })}
                  onClick={() => {
                    router.replace(optionUrl, { scroll: false })
                  }}
                  title={`${option.label}${!isAvailableForSale ? ' (Out of Stock)' : ''}`}
                >
                  {option.label}
                </Button>
              )
            })}
          </React.Fragment>
        </dd>
      </dl>
    )
  })
}