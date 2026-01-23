import type { NextApiRequest, NextApiResponse } from 'next'

interface NotionRequest {
  token: string
  databaseId: string
  title: string
  content: string
  videoUrl: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { token, databaseId, title, content, videoUrl }: NotionRequest = req.body

    if (!token || !databaseId || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // 调用 Notion API 创建页面
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId,
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: content,
                  },
                },
              ],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: `原视频：${videoUrl}`,
                  },
                },
              ],
            },
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        error: errorData.message || 'Failed to create Notion page',
        details: errorData,
      })
    }

    const data = await response.json()
    return res.status(200).json({ success: true, pageId: data.id })
  } catch (error: any) {
    console.error('Notion API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
