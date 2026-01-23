import type { NextApiRequest, NextApiResponse } from 'next'

interface EmailRequest {
  to: string
  subject?: string
  content: string
  videoUrl: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { to, subject, content, videoUrl }: EmailRequest = req.body

    if (!to || !content) {
      return res.status(400).json({ error: 'Missing required fields: to and content' })
    }

    // 检查是否配置了邮件服务
    const emailService = process.env.EMAIL_SERVICE || 'smtp'
    const emailConfig = {
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || '587',
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
      },
      resend: {
        apiKey: process.env.RESEND_API_KEY,
      },
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
      },
    }

    // 使用 Resend（推荐）
    if (emailService === 'resend' && emailConfig.resend.apiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${emailConfig.resend.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'BibiGPT <noreply@bibigpt.com>',
          to: [to],
          subject: subject || 'BibiGPT 视频总结',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">视频总结</h2>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <pre style="white-space: pre-wrap; font-family: inherit;">${content.replace(/\n/g, '<br>')}</pre>
              </div>
              <p style="color: #666; font-size: 14px;">
                <strong>原视频链接：</strong> <a href="${videoUrl}" style="color: #0066cc;">${videoUrl}</a>
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                由 BibiGPT 自动生成
              </p>
            </div>
          `,
          text: `${content}\n\n原视频：${videoUrl}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return res.status(response.status).json({
          error: errorData.message || 'Failed to send email via Resend',
        })
      }

      const data = await response.json()
      return res.status(200).json({ success: true, messageId: data.id })
    }

    // 使用 SendGrid
    if (emailService === 'sendgrid' && emailConfig.sendgrid.apiKey) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${emailConfig.sendgrid.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: to }],
              subject: subject || 'BibiGPT 视频总结',
            },
          ],
          from: {
            email: process.env.EMAIL_FROM || 'noreply@bibigpt.com',
            name: 'BibiGPT',
          },
          content: [
            {
              type: 'text/html',
              value: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">视频总结</h2>
                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <pre style="white-space: pre-wrap; font-family: inherit;">${content.replace(/\n/g, '<br>')}</pre>
                  </div>
                  <p style="color: #666; font-size: 14px;">
                    <strong>原视频链接：</strong> <a href="${videoUrl}" style="color: #0066cc;">${videoUrl}</a>
                  </p>
                  <p style="color: #999; font-size: 12px; margin-top: 20px;">
                    由 BibiGPT 自动生成
                  </p>
                </div>
              `,
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return res.status(response.status).json({
          error: 'Failed to send email via SendGrid',
          details: errorText,
        })
      }

      return res.status(200).json({ success: true })
    }

    // 使用 SMTP（需要 nodemailer，这里提供接口但需要安装依赖）
    if (emailService === 'smtp' && emailConfig.smtp.host) {
      // 注意：需要在项目中安装 nodemailer
      // npm install nodemailer @types/nodemailer
      return res.status(501).json({
        error: 'SMTP support requires nodemailer package. Please use Resend or SendGrid instead.',
      })
    }

    return res.status(400).json({
      error: 'No email service configured. Please set EMAIL_SERVICE and corresponding API keys.',
    })
  } catch (error: any) {
    console.error('Email API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
