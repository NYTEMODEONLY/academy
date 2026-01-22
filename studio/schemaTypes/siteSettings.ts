import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  icon: () => '⚙️',
  fields: [
    defineField({
      name: 'heroHeadline',
      title: 'Hero Headline',
      type: 'string',
      initialValue: 'ACADEMY',
    }),
    defineField({
      name: 'heroSubhead',
      title: 'Hero Subhead',
      type: 'string',
    }),
    defineField({
      name: 'stats',
      title: 'Homepage Stats',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'number', type: 'string', title: 'Number'},
            {name: 'label', type: 'string', title: 'Label'},
          ],
          preview: {
            select: {
              number: 'number',
              label: 'label',
            },
            prepare({number, label}) {
              return {
                title: `${number} ${label}`,
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'membershipPrice',
      title: 'Membership Price',
      type: 'string',
      description: 'e.g., $9/month',
    }),
    defineField({
      name: 'membershipFeatures',
      title: 'Membership Features',
      type: 'array',
      of: [{type: 'string'}],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Site Settings',
      }
    },
  },
})
