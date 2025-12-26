// Helper function to get presigned URL from file path
export async function getPresignedUrl(filePath: string): Promise<string> {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(
            `${backendUrl}/api/minio/file-info?fileName=${encodeURIComponent(filePath)}`
        )

        if (!response.ok) {
            console.error('Failed to get presigned URL:', response.statusText)
            return filePath // Fallback to original path
        }

        const data = await response.json()
        return data.publicUrl || filePath
    } catch (error) {
        console.error('Error getting presigned URL:', error)
        return filePath // Fallback to original path
    }
}
