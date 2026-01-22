import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'NYTEMODE Academy',

  // You'll need to replace these after running: npx sanity init
  projectId: 'YOUR_PROJECT_ID',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },

  // Custom studio theme matching NYTEMODE branding
  studio: {
    components: {
      // Custom branding can be added here
    },
  },
})
