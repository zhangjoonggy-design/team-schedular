'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'

interface PdfButtonProps {
  filename?: string
  contentId: string
  onBeforeExport?: () => Promise<void> | void
}

export function PdfButton({ filename = 'export', contentId, onBeforeExport }: PdfButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      // 더보기 등 모든 섹션 펼치기
      if (onBeforeExport) await onBeforeExport()

      // DOM 업데이트 대기
      await new Promise((r) => setTimeout(r, 500))

      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const element = document.getElementById(contentId)
      if (!element) return

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let y = 0
      while (y < imgHeight) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -y, imgWidth, imgHeight)
        y += pageHeight
      }

      pdf.save(`${filename}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      title="PDF로 저장"
    >
      <FileDown className="w-4 h-4" />
      {loading ? '변환 중...' : 'PDF 저장'}
    </button>
  )
}
