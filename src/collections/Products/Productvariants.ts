import type { CollectionConfig } from 'payload'

/**
 *
 * Each document = one SKU combination (e.g. Red / Large).
 * Stock is tracked per-variant; inStock is auto-managed via beforeChange hook.
 */
export const ProductVariants: CollectionConfig = {
  slug: 'product-variants',
  admin: {
    useAsTitle: 'variantSku',
    defaultColumns: ['variantSku', 'product', 'stock', 'inStock', 'price'],
    description: 'Individual variant SKUs with their own stock and pricing.',
    // ✅ FIX: Match the exact group the ecommerce plugin uses so this appears
    // alongside Products/Carts/Orders rather than hijacking the sidebar.
    group: 'Ecommerce',
    // ✅ Hidden from the sidebar — manage variants via the join field
    // inside each Product document instead. Keeps the nav clean.
    hidden: true,
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'variantSku',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique identifier for this variant (e.g. SHIRT-RED-L)',
      },
    },
    {
      name: 'variantOptions',
      type: 'array',
      required: true,
      admin: {
        description: 'Attribute key-value pairs (e.g. name: color, value: Red)',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          admin: { placeholder: 'e.g. color (lowercase, no spaces)' },
        },
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: { placeholder: 'e.g. Red' },
        },
      ],
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
      admin: {
        description: 'Override price for this variant. Leave blank to use base product price.',
      },
    },
    {
      name: 'stock',
      type: 'number',
      min: 0,
      defaultValue: 0,
      required: true,
      admin: {
        description: 'Current inventory count for this variant.',
      },
    },
    {
      name: 'inStock',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Auto-managed — driven by stock count. Do not edit manually.',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ data, siblingData }) => {
            const stockCount = data?.stock ?? siblingData?.stock
            return (stockCount ?? 0) > 0
          },
        ],
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional variant-specific image (e.g. colour swatch photo).',
      },
    },
  ],
}