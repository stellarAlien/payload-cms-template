import type { CollectionConfig } from 'payload'
import { decrementVariantStock } from '@/collections/Products/hooks/decrementVariantStock'

/**
 * Orders Collection
 * Location: src/collections/Orders.ts
 *
 * Stock is decremented automatically when status transitions to 'paid'.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'status', 'totalAmount', 'createdAt'],
    description: 'Customer orders. Stock decrements automatically when status → paid.',
  },
  hooks: {
    afterChange: [decrementVariantStock],
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending',   value: 'pending' },
        { label: 'Paid',      value: 'paid' },
        { label: 'Fulfilled', value: 'fulfilled' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded',  value: 'refunded' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          // Leave empty for products without variants
          name: 'variantId',
          type: 'relationship',
          relationTo: 'product-variants',
          required: false,
        },
        {
          name: 'quantity',
          type: 'number',
          min: 1,
          required: true,
          defaultValue: 1,
        },
        {
          // Snapshot price at purchase time so it never drifts
          name: 'priceAtPurchase',
          type: 'number',
          min: 0,
          required: true,
        },
      ],
    },
    {
      name: 'totalAmount',
      type: 'number',
      min: 0,
      admin: {
        description: 'Total order value in USD.',
        position: 'sidebar',
      },
    },
    {
      // Prevents double-decrement if the order is saved again after being paid
      name: 'stockDecrementedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Set automatically when stock is decremented. Do not edit.',
      },
    },
  ],
}