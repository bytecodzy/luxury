import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/try-on/analyze-selfie
 *
 * Uses VLM (Vision Language Model) to analyze a selfie image and detect
 * the person's face/body position. Returns keypoints that the client-side
 * canvas can use to overlay the product at the correct position.
 *
 * This is the "smart" positioning layer — when VLM is available, it provides
 * accurate face/body landmarks. When it's not available, the client falls back
 * to heuristic positioning.
 */

interface SelfieAnalysis {
  faceCenter: { x: number; y: number }
  faceWidth: number
  neckCenter: { x: number; y: number }
  chestCenter: { x: number; y: number }
  leftWrist: { x: number; y: number }
  rightWrist: { x: number; y: number }
  torsoCenter: { x: number; y: number }
  shoulderWidth: number
  personDetected: boolean
  pose: string
  source?: string
}

function getCategoryContext(categorySlug: string): string {
  const contexts: Record<string, string> = {
    'jewelry': 'The user wants to try on JEWELRY (necklace, pendant, earrings). Focus on detecting the NECK and CHEST area precisely.',
    'watches': 'The user wants to try on a WATCH. Focus on detecting the WRISTS precisely.',
    'mens-shirts': 'The user wants to try on a SHIRT. Focus on detecting the TORSO and SHOULDERS precisely.',
    'women-sarees': 'The user wants to try on a SAREE. Focus on detecting the full upper body precisely.',
    'women-fashion': 'The user wants to try on FASHION clothing. Focus on detecting the TORSO precisely.',
    'fragrances': 'The user wants to try on a FRAGRANCE. Focus on detecting the CHEST/NECK area where fragrance would be applied.',
    'leather-goods': 'The user wants to try on a BAG. Focus on detecting the SHOULDER and ARM area.',
    'couple-friendly': 'The user wants to try on a couple product. Focus on detecting the persons in the frame.',
  }
  return contexts[categorySlug] || 'The user wants to virtually try on a product. Detect the face and body position precisely.'
}

function getHeuristicAnalysis(): SelfieAnalysis {
  return {
    faceCenter: { x: 0.5, y: 0.3 },
    faceWidth: 0.25,
    neckCenter: { x: 0.5, y: 0.42 },
    chestCenter: { x: 0.5, y: 0.52 },
    leftWrist: { x: 0.3, y: 0.65 },
    rightWrist: { x: 0.7, y: 0.65 },
    torsoCenter: { x: 0.5, y: 0.55 },
    shoulderWidth: 0.5,
    personDetected: true,
    pose: 'facing_camera',
    source: 'heuristic',
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { selfieData, categorySlug } = body

    if (!selfieData) {
      return NextResponse.json({ error: 'Selfie image is required' }, { status: 400 })
    }

    // Try to use VLM for face/body analysis
    let analysisResult: SelfieAnalysis | null = null

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const categoryContext = getCategoryContext(categorySlug || '')

      const vlmResponse = await zai.chat.completions.createVision({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this selfie photo for a virtual try-on feature. I need precise positioning data.

${categoryContext}

Please respond ONLY with a JSON object (no markdown, no explanation, just the JSON):
{
  "faceCenter": { "x": 0.5, "y": 0.3 },
  "faceWidth": 0.25,
  "neckCenter": { "x": 0.5, "y": 0.42 },
  "chestCenter": { "x": 0.5, "y": 0.52 },
  "leftWrist": { "x": 0.3, "y": 0.65 },
  "rightWrist": { "x": 0.7, "y": 0.65 },
  "torsoCenter": { "x": 0.5, "y": 0.55 },
  "shoulderWidth": 0.5,
  "personDetected": true,
  "pose": "facing_camera"
}

All coordinates are normalized (0.0 to 1.0) relative to the image dimensions.`
              },
              {
                type: 'image_url',
                image_url: { url: selfieData }
              }
            ]
          }
        ],
        thinking: { type: 'disabled' }
      })

      const content = vlmResponse.choices?.[0]?.message?.content || ''
      
      // Parse the VLM response - extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.personDetected) {
          analysisResult = {
            faceCenter: parsed.faceCenter || { x: 0.5, y: 0.3 },
            faceWidth: parsed.faceWidth || 0.25,
            neckCenter: parsed.neckCenter || { x: 0.5, y: 0.42 },
            chestCenter: parsed.chestCenter || { x: 0.5, y: 0.52 },
            leftWrist: parsed.leftWrist || { x: 0.3, y: 0.65 },
            rightWrist: parsed.rightWrist || { x: 0.7, y: 0.65 },
            torsoCenter: parsed.torsoCenter || { x: 0.5, y: 0.55 },
            shoulderWidth: parsed.shoulderWidth || 0.5,
            personDetected: true,
            pose: parsed.pose || 'facing_camera',
            source: 'vlm',
          }
        }
      }
    } catch (vlmError) {
      console.warn('[try-on/analyze-selfie] VLM analysis failed:', vlmError instanceof Error ? vlmError.message : String(vlmError))
    }

    if (!analysisResult) {
      analysisResult = getHeuristicAnalysis()
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    })
  } catch (error) {
    console.error('[try-on/analyze-selfie] Error:', error)
    return NextResponse.json({
      success: true,
      analysis: getHeuristicAnalysis(),
      source: 'heuristic_fallback',
    })
  }
}
