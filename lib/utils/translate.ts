/**
 * Translate text using MyMemory Translation API (Free)
 * Free tier: 1000 words/day
 */
export async function translateJapaneseToVietnamese(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text
  }

  try {
    const encodedText = encodeURIComponent(text)
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=ja|vi`

    const response = await fetch(url)
    const data = await response.json()

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText
    }

    // If translation fails, return original text
    return text
  } catch (error) {
    console.error('Translation error:', error)
    // Return original text if translation fails
    return text
  }
}

/**
 * Translate text from Vietnamese to Japanese using MyMemory Translation API (Free)
 * Free tier: 1000 words/day
 */
export async function translateVietnameseToJapanese(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text
  }

  try {
    const encodedText = encodeURIComponent(text)
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=vi|ja`

    const response = await fetch(url)
    const data = await response.json()

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText
    }

    // If translation fails, return original text
    return text
  } catch (error) {
    console.error('Translation error:', error)
    // Return original text if translation fails
    return text
  }
}

/**
 * Batch translate multiple texts from Vietnamese to Japanese
 * Returns a map of original text to translated text
 */
export async function batchTranslateVietnameseToJapanese(texts: string[]): Promise<Map<string, string>> {
  const translationMap = new Map<string, string>()

  // Filter out empty texts and duplicates
  const uniqueTexts = [...new Set(texts.filter(t => t && t.trim().length > 0))]

  // Translate in parallel with a concurrency limit to avoid rate limiting
  const BATCH_SIZE = 5
  for (let i = 0; i < uniqueTexts.length; i += BATCH_SIZE) {
    const batch = uniqueTexts.slice(i, i + BATCH_SIZE)
    const translations = await Promise.all(
      batch.map(text => translateVietnameseToJapanese(text))
    )

    batch.forEach((text, index) => {
      translationMap.set(text, translations[index])
    })
  }

  return translationMap
}

/**
 * Detect if text is in Japanese
 */
export function isJapanese(text: string): boolean {
  // Check for Hiragana, Katakana, or Kanji characters
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
  return japaneseRegex.test(text)
}
