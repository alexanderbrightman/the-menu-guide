'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Check, Copy, Download, X } from 'lucide-react'

interface QrCodeDialogProps {
    qrCodeUrl: string | null
    menuLink: string
    profileUsername: string
    isDarkBackground: boolean
    contrastColor: string
    outlineButtonClass: string
    onDownload: () => void
    children: React.ReactNode
    backgroundColor?: string
    borderColorClass?: string
}

export function QrCodeDialog({
    qrCodeUrl,
    menuLink,
    profileUsername,
    isDarkBackground,
    contrastColor,
    outlineButtonClass,
    onDownload,
    children,
    backgroundColor,
    borderColorClass,
}: QrCodeDialogProps) {
    const [copied, setCopied] = useState(false)
    const [open, setOpen] = useState(false)

    const borderClass = borderColorClass || (isDarkBackground ? 'border-white/10' : 'border-black/8')
    const bgColor = backgroundColor || (isDarkBackground ? '#1a1a2e' : '#ffffff')
    const primaryTextClass = isDarkBackground ? 'text-white' : 'text-gray-900'

    const handleCopy = () => {
        navigator.clipboard.writeText(menuLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent
                className={`w-full max-w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-xl border-0 sm:border ${borderClass} p-0 gap-0 sm:rounded-xl overflow-hidden [&>button]:hidden flex flex-col`}
                style={{
                    backgroundColor: bgColor,
                    color: contrastColor,
                }}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${borderClass}`}>
                    <div />
                    <DialogTitle className={`text-base sm:text-lg font-semibold ${primaryTextClass}`}>
                        Menu QR Code
                    </DialogTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpen(false)}
                        className="h-8 w-8 hover:bg-transparent"
                        style={{ color: contrastColor }}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="flex flex-col items-center gap-5">
                        {/* QR Code */}
                        {qrCodeUrl ? (
                            <div className="relative w-48 h-48 bg-white rounded-xl overflow-hidden shadow-lg p-3">
                                <Image
                                    src={qrCodeUrl}
                                    alt="Menu QR Code"
                                    fill
                                    className="object-contain p-2"
                                    unoptimized
                                    priority
                                />
                            </div>
                        ) : (
                            <div
                                className="w-48 h-48 rounded-xl flex items-center justify-center"
                                style={{
                                    backgroundColor: isDarkBackground ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    border: `1px solid ${isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                                }}
                            >
                                <p className="text-sm opacity-50">Generating...</p>
                            </div>
                        )}

                        <p className={`text-sm text-center ${isDarkBackground ? 'text-white/60' : 'text-gray-500'}`}>
                            Scan to view your digital menu instantly.
                        </p>

                        {/* Link Box */}
                        <div
                            className={`w-full flex items-center gap-2 p-3 rounded-lg border ${borderClass}`}
                            style={{
                                backgroundColor: isDarkBackground ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                            }}
                        >
                            <code className="text-xs flex-1 min-w-0 truncate block font-mono opacity-75">
                                {menuLink}
                            </code>
                            <Button
                                size="icon"
                                variant="ghost"
                                className={`h-7 w-7 flex-shrink-0 ${isDarkBackground ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                                onClick={handleCopy}
                                style={{ color: contrastColor }}
                            >
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 w-full">
                            <Button
                                size="sm"
                                variant="outline"
                                className={`flex-1 h-10 gap-2 ${outlineButtonClass}`}
                                onClick={onDownload}
                                disabled={!qrCodeUrl}
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className={`flex-1 h-10 gap-2 ${outlineButtonClass}`}
                                onClick={handleCopy}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? 'Copied!' : 'Copy Link'}
                            </Button>
                        </div>
                    </div>

                    <div className="pb-10 sm:pb-0" />
                </div>
            </DialogContent>
        </Dialog>
    )
}
