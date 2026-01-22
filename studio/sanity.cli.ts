import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    // These will be set after you run: npx sanity login && npx sanity init
    projectId: 'YOUR_PROJECT_ID',
    dataset: 'production',
  },
  studioHost: 'nytemode-academy',
})
