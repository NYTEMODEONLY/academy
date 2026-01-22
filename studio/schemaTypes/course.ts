import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'course',
  title: 'Courses',
  type: 'document',
  icon: () => '📚',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'thumbnail',
      title: 'Thumbnail',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          {title: 'AI', value: 'AI'},
          {title: 'Marketing', value: 'Marketing'},
          {title: 'Web3', value: 'Web3'},
          {title: 'Creative', value: 'Creative'},
          {title: 'Tech', value: 'Tech'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'premium',
      title: 'Premium Only',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      initialValue: 1,
    }),
    defineField({
      name: 'whatYouWillLearn',
      title: "What You'll Learn",
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'prerequisites',
      title: 'Prerequisites',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'whoIsThisFor',
      title: 'Who Is This For',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    }),
    defineField({
      name: 'content',
      title: 'Course Overview Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'H4', value: 'h4'},
            {title: 'Quote', value: 'blockquote'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
              {title: 'Code', value: 'code'},
            ],
          },
        },
        {
          type: 'image',
          options: {hotspot: true},
        },
        {
          type: 'code',
          options: {
            language: 'javascript',
            languageAlternatives: [
              {title: 'JavaScript', value: 'javascript'},
              {title: 'TypeScript', value: 'typescript'},
              {title: 'Python', value: 'python'},
              {title: 'HTML', value: 'html'},
              {title: 'CSS', value: 'css'},
              {title: 'Bash', value: 'bash'},
            ],
          },
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      media: 'thumbnail',
    },
    prepare(selection) {
      const {title, category, media} = selection
      return {
        title: title,
        subtitle: category,
        media: media,
      }
    },
  },
})
