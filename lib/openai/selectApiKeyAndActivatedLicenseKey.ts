import { activateLicenseKey } from '~/lib/lemon'
import { checkOpenaiApiKeys } from '~/lib/openai/checkOpenaiApiKey'
import { sample } from '~/utils/fp'

export interface ApiKeyConfig {
  apiKey: string
  apiBaseUrl?: string
}

export async function selectApiKeyAndActivatedLicenseKey(apiKey?: string, videoId?: string): Promise<ApiKeyConfig> {
  let selectedApiKey = ''
  let selectedApiBaseUrl: string | undefined = undefined

  if (apiKey) {
    if (checkOpenaiApiKeys(apiKey)) {
      const userApiKeys = apiKey
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k)
      if (userApiKeys.length === 0) {
        throw new Error('No valid API key provided')
      }
      selectedApiKey = sample(userApiKeys)
    } else {
      // user is using validated licenseKey
      const activated = await activateLicenseKey(apiKey, videoId)
      if (!activated) {
        throw new Error('licenseKey is not validated!')
      }
      selectedApiKey = apiKey
    }
  } else {
    // Use server-side API key
    const myApiKeyList = process.env.OPENAI_API_KEY
    if (!myApiKeyList) {
      throw new Error('No OPENAI_API_KEY found in environment variables and no user API key provided')
    }
    const apiKeys = myApiKeyList
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k)
    if (apiKeys.length === 0) {
      throw new Error('OPENAI_API_KEY is empty')
    }
    selectedApiKey = sample(apiKeys)
  }

  if (!selectedApiKey) {
    throw new Error('Failed to select a valid API key')
  }

  // Get API base URL from environment variable
  selectedApiBaseUrl = process.env.OPENAI_API_BASE_URL
  console.debug(
    '[selectApiKeyAndActivatedLicenseKey] selectedApiKey:',
    selectedApiKey.substring(0, 10) + '...',
    'apiBaseUrl:',
    selectedApiBaseUrl,
  )

  return {
    apiKey: selectedApiKey,
    apiBaseUrl: selectedApiBaseUrl,
  }
}
