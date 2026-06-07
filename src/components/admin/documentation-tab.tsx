'use client'

import React, { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FileText, Download, Shield, Lock, BookOpen, Cpu, Users,
  Rocket, Lightbulb, ArrowLeft, Loader2, AlertTriangle,
  ChevronRight, Search,
} from 'lucide-react'
import jsPDF from 'jspdf'
import ReactMarkdown from 'react-markdown'

// ── Style constants (matching admin dashboard) ──────────────────────
const cardCls = 'border-amber-900/30 bg-stone-900/80'
const btnPrimary = 'bg-amber-600 text-stone-950 hover:bg-amber-500'
const btnOutline = 'border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400'

const authH = (t: string | null) => t ? { Authorization: `Bearer ${t}` } : {}

async function apiFetch(url: string, opts: RequestInit = {}, token?: string | null) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...authH(token), ...opts.headers } })
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`) }
  return res.json()
}

// ── Category icons and colors ───────────────────────────────────────

const categoryConfig: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  'technical': { icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-600/10', label: 'Technical' },
  'sop': { icon: Users, color: 'text-green-400', bg: 'bg-green-600/10', label: 'SOP' },
  'ai-strategy': { icon: Lightbulb, color: 'text-purple-400', bg: 'bg-purple-600/10', label: 'AI Strategy' },
  'deployment': { icon: Rocket, color: 'text-amber-400', bg: 'bg-amber-600/10', label: 'Deployment' },
  'patent': { icon: Shield, color: 'text-red-400', bg: 'bg-red-600/10', label: 'Patent' },
}

// ── PDF Generation ──────────────────────────────────────────────────

function generateDocumentationPdf(doc: {
  title: string
  content: string
  category: string
  version: string
  isConfidential: boolean
}) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // ── Brand Header ──
  pdf.setFillColor(28, 25, 23)
  pdf.rect(0, 0, pageWidth, 44, 'F')
  pdf.setFillColor(217, 119, 6)
  pdf.rect(0, 42, pageWidth, 2, 'F')

  pdf.setTextColor(251, 191, 36)
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('3BOXES LUXURY', margin, 16)

  pdf.setTextColor(168, 162, 158)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Documentation Hub — Confidential Internal Use Only', margin, 24)

  if (doc.isConfidential) {
    pdf.setTextColor(239, 68, 68)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('⚠ CONFIDENTIAL — ADMIN ACCESS ONLY — DO NOT DISTRIBUTE', margin, 32)
  }

  y = 52

  // ── Document Title ──
  pdf.setTextColor(28, 25, 23)
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  const titleLines = pdf.splitTextToSize(doc.title, contentWidth)
  pdf.text(titleLines, margin, y)
  y += titleLines.length * 8 + 4

  // ── Meta ──
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120, 113, 108)
  const categoryLabel = doc.category.charAt(0).toUpperCase() + doc.category.slice(1)
  const metaLine = `Category: ${categoryLabel}  |  Version: v${doc.version}  |  Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
  pdf.text(metaLine, margin, y)
  y += 4

  // Confidential banner
  if (doc.isConfidential) {
    y += 2
    pdf.setFillColor(254, 226, 226)
    pdf.roundedRect(margin, y - 3, contentWidth, 8, 1, 1, 'F')
    pdf.setTextColor(185, 28, 28)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.text('CONFIDENTIAL — This document contains proprietary information. Unauthorized distribution is prohibited.', margin + 3, y + 2)
    y += 10
    pdf.setFont('helvetica', 'normal')
  }

  // Separator
  pdf.setDrawColor(217, 119, 6)
  pdf.setLineWidth(0.5)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 8

  // ── Content ──
  pdf.setTextColor(28, 25, 23)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')

  const lines = doc.content.split('\n')
  const lineHeight = 5

  for (const line of lines) {
    if (y + lineHeight > pageHeight - margin - 10) {
      pdf.addPage()
      y = margin
      pdf.setTextColor(168, 162, 158)
      pdf.setFontSize(7)
      pdf.text(`${doc.title} — v${doc.version}${doc.isConfidential ? ' — CONFIDENTIAL' : ''}`, margin, y)
      pdf.setDrawColor(217, 119, 6)
      pdf.setLineWidth(0.3)
      pdf.line(margin, y + 2, pageWidth - margin, y + 2)
      y += 8
      pdf.setTextColor(28, 25, 23)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
    }

    if (line.trim() === '') {
      y += lineHeight * 0.4
      continue
    }

    if (line.startsWith('# ')) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(14)
      pdf.setTextColor(180, 83, 9)
      const headingLines = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(headingLines, margin, y)
      y += headingLines.length * 6 + 3
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('## ')) {
      y += 2
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(180, 83, 9)
      const headingLines = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(headingLines, margin, y)
      y += headingLines.length * 5.5 + 2
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('### ')) {
      y += 1
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(120, 53, 15)
      const headingLines = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(headingLines, margin, y)
      y += headingLines.length * 5 + 1
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('#### ')) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(120, 53, 15)
      const headingLines = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(headingLines, margin, y)
      y += headingLines.length * 5 + 1
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const bulletText = line.replace(/^[-*]\s*/, '')
      pdf.text('•', margin + 2, y)
      const wrappedLines = pdf.splitTextToSize(bulletText, contentWidth - 6)
      pdf.text(wrappedLines, margin + 6, y)
      y += wrappedLines.length * lineHeight
    } else if (line.startsWith('> ')) {
      pdf.setFillColor(254, 243, 199)
      const quoteText = line.replace(/^>\s*/, '')
      const wrappedLines = pdf.splitTextToSize(quoteText, contentWidth - 8)
      const quoteHeight = wrappedLines.length * lineHeight + 4
      pdf.roundedRect(margin, y - 3, contentWidth, quoteHeight, 1, 1, 'F')
      pdf.setDrawColor(217, 119, 6)
      pdf.setLineWidth(1)
      pdf.line(margin, y - 3, margin, y - 3 + quoteHeight)
      pdf.setTextColor(120, 53, 15)
      pdf.text(wrappedLines, margin + 4, y)
      y += quoteHeight + 2
      pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('```')) {
      y += 2
    } else if (line.match(/^\d+\.\s/)) {
      const numText = line.replace(/^\d+\.\s*/, '')
      const num = line.match(/^(\d+)\./)?.[1] || '1'
      pdf.text(`${num}.`, margin, y)
      const wrappedLines = pdf.splitTextToSize(numText, contentWidth - 8)
      pdf.text(wrappedLines, margin + 8, y)
      y += wrappedLines.length * lineHeight
    } else if (line.startsWith('|')) {
      // Table row - render as text
      const wrappedLines = pdf.splitTextToSize(line, contentWidth)
      pdf.setFont('courier', 'normal')
      pdf.setFontSize(8)
      pdf.text(wrappedLines, margin, y)
      y += wrappedLines.length * 4
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
    } else {
      const wrappedLines = pdf.splitTextToSize(line, contentWidth)
      pdf.text(wrappedLines, margin, y)
      y += wrappedLines.length * lineHeight
    }
  }

  // ── Footer ──
  y = pageHeight - 12
  pdf.setDrawColor(217, 119, 6)
  pdf.setLineWidth(0.3)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 4
  pdf.setTextColor(168, 162, 158)
  pdf.setFontSize(7)
  const footerText = `3Boxes Luxury — Documentation Hub  |  ${doc.category}-v${doc.version}  |  ${doc.isConfidential ? 'CONFIDENTIAL' : 'Internal Use'}  |  Generated: ${new Date().toLocaleDateString()}`
  pdf.text(footerText, margin, y)

  const fileName = `${doc.category}-documentation-v${doc.version}.pdf`
  pdf.save(fileName)
  return fileName
}

// ── Main Component ──────────────────────────────────────────────────

interface DocumentationTabProps {
  token: string | null
}

export function DocumentationTab({ token }: DocumentationTabProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch document list
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['docs-list'],
    queryFn: () => apiFetch('/api/docs', undefined, token),
  })

  // Fetch selected document content
  const { data: docData, isLoading: docLoading } = useQuery({
    queryKey: ['doc-content', selectedDocId],
    queryFn: () => apiFetch(`/api/docs/${selectedDocId}`, undefined, token),
    enabled: !!selectedDocId,
  })

  const documents = docsData?.documents || []

  const filteredDocs = documents.filter((doc: any) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDownloadPdf = useCallback(() => {
    if (!docData) return
    generateDocumentationPdf({
      title: docData.title,
      content: docData.content,
      category: docData.category,
      version: docData.version,
      isConfidential: docData.isConfidential,
    })
  }, [docData])

  // ── Document Detail View ──────────────────────────────────────
  if (selectedDocId && docData) {
    const catConfig = categoryConfig[docData.category] || categoryConfig['technical']
    const CatIcon = catConfig.icon

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className={btnOutline} onClick={() => setSelectedDocId(null)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Docs
          </Button>
          <div className="flex-1" />
          <Button className={btnPrimary} onClick={handleDownloadPdf}>
            <Download className="mr-1 h-4 w-4" /> Download PDF
          </Button>
        </div>

        {/* Doc header card */}
        <Card className={cardCls}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${catConfig.bg} shrink-0`}>
                <CatIcon className={`h-5 w-5 ${catConfig.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-amber-100">{docData.title}</h2>
                  {docData.isConfidential && (
                    <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                      <Lock className="mr-1 h-3 w-3" /> CONFIDENTIAL
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-amber-200/50 mt-1">{docData.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-amber-200/40">
                  <span>Version: v{docData.version}</span>
                  <span>•</span>
                  <span>Updated: {new Date(docData.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span>•</span>
                  <span className={catConfig.color}>{catConfig.label}</span>
                </div>
              </div>
            </div>

            {docData.isConfidential && (
              <div className="mt-3 rounded-lg border border-red-600/30 bg-red-950/20 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">
                    This document contains proprietary and confidential information of 3BOXES LUXURY.
                    Unauthorized copying, distribution, or disclosure is strictly prohibited.
                    This document must NOT be shared outside the organization or included in public repositories.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Markdown content */}
        <Card className={cardCls}>
          <CardContent className="p-6">
            <div className="prose prose-invert prose-amber max-w-none
              prose-headings:text-amber-100 prose-headings:font-bold
              prose-h1:text-2xl prose-h1:border-b prose-h1:border-amber-900/30 prose-h1:pb-2
              prose-h2:text-xl prose-h2:mt-8
              prose-h3:text-lg prose-h3:mt-6
              prose-h4:text-base prose-h4:mt-4
              prose-p:text-amber-200/70 prose-p:leading-relaxed
              prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-amber-100
              prose-code:text-amber-300 prose-code:bg-amber-900/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-stone-950 prose-pre:border prose-pre:border-amber-900/30 prose-pre:rounded-lg
              prose-li:text-amber-200/70
              prose-table:border prose-table:border-amber-900/30
              prose-th:bg-amber-900/20 prose-th:text-amber-100 prose-th:p-2 prose-th:border prose-th:border-amber-900/30
              prose-td:text-amber-200/70 prose-td:p-2 prose-td:border prose-td:border-amber-900/30
              prose-blockquote:border-amber-600 prose-blockquote:bg-amber-900/10 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4
              prose-hr:border-amber-900/30
            ">
              <ReactMarkdown>{docData.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Download button at bottom too */}
        <div className="flex justify-center py-4">
          <Button className={btnPrimary} size="lg" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-5 w-5" /> Download as PDF
          </Button>
        </div>
      </div>
    )
  }

  // ── Document Loading View ─────────────────────────────────────
  if (selectedDocId && docLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <p className="mt-3 text-sm text-amber-200/50">Loading document...</p>
      </div>
    )
  }

  // ── Document List View ────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-amber-400" />
          Documentation Hub
        </h2>
        <p className="text-sm text-amber-200/50 mt-1">
          Access technical documentation, SOPs, AI strategy guides, deployment instructions, and confidential patent documents.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
        <input
          className="w-full rounded-lg border border-amber-900/40 bg-stone-800/50 pl-9 pr-4 py-2.5 text-sm text-amber-100 placeholder:text-amber-200/30 focus:border-amber-600/50 focus:outline-none focus:ring-1 focus:ring-amber-600/30"
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Confidential notice for admins */}
      {documents.some((d: any) => d.isConfidential) && (
        <div className="rounded-lg border border-red-600/30 bg-red-950/10 p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300/80">
              Documents marked <Badge className="ml-1 bg-red-600/20 text-red-400 border-red-600/30 text-[10px] px-1.5 py-0">CONFIDENTIAL</Badge>
              are proprietary and must NOT be shared outside the organization or included in public repositories (Git).
            </p>
          </div>
        </div>
      )}

      {/* Document cards */}
      {docsLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          <p className="mt-2 text-sm text-amber-200/50">Loading documentation...</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredDocs.map((doc: any) => {
            const catConfig = categoryConfig[doc.category] || categoryConfig['technical']
            const CatIcon = catConfig.icon
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`${cardCls} cursor-pointer transition-all hover:border-amber-600/40 hover:bg-stone-900/90 ${doc.isConfidential ? 'border-red-600/30' : ''}`}
                  onClick={() => setSelectedDocId(doc.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${catConfig.bg} shrink-0`}>
                        <CatIcon className={`h-5 w-5 ${catConfig.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-amber-100">{doc.title}</h3>
                          {doc.isConfidential && (
                            <Badge className="bg-red-600/20 text-red-400 border-red-600/30 text-[10px] px-1.5 py-0">
                              <Lock className="mr-0.5 h-2.5 w-2.5" /> CONFIDENTIAL
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-amber-200/40 mt-1 line-clamp-2">{doc.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge className={`${catConfig.bg} ${catConfig.color} border-0 text-[10px]`}>
                            {catConfig.label}
                          </Badge>
                          <span className="text-[10px] text-amber-200/30">v{doc.version}</span>
                          <span className="text-[10px] text-amber-200/30">{new Date(doc.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-200/30 shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}

          {filteredDocs.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center py-12">
              <FileText className="h-10 w-10 text-amber-200/20" />
              <p className="mt-2 text-sm text-amber-200/40">No documentation found matching your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Info card */}
      <Card className="border-amber-900/20 bg-amber-900/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-200">About Documentation Hub</h4>
              <p className="text-xs text-amber-200/40 mt-1">
                All documents can be downloaded as PDF files. Non-confidential documents (Technical, SOP, AI Strategy, Deployment)
                are also available in the project's <code className="text-amber-300 bg-amber-900/20 px-1 rounded text-[11px]">docs/</code> directory on Git.
                The Patent Documentation is strictly confidential and is ONLY accessible through this admin panel — it is excluded from the Git repository.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
