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
 * Detect if text is in Japanese
 */
export function isJapanese(text: string): boolean {
  // Check for Hiragana, Katakana, or Kanji characters
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
  return japaneseRegex.test(text)
}
