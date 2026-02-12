'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { QrCode, Check, Copy, Download, X } from 'lucide-react'

interface QrCodeDialogProps {
    qrCodeUrl: string | null
    menuLink: string
    profileUsername: string
    isDarkBackground: boolean
    contrastColor: string
    outlineButtonClass: string
    onDownload: () => void
    children: React.ReactNode
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
}: QrCodeDialogProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(menuLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent
                className="sm:max-w-md border-0 overflow-hidden max-w-[calc(100vw-2rem)] p-4 sm:p-6"
                style={{
                    backgroundColor: isDarkBackground ? '#1a1a2e' : '#ffffff',
                    color: contrastColor,
                }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold" style={{ color: contrastColor }}>
                        <QrCode className="h-5 w-5 flex-shrink-0" />
                        Menu QR Code
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-3 sm:gap-5 py-2 sm:py-4 w-full min-w-0 overflow-hidden box-border">
                    {/* QR Code Image - responsive sizing */}
                    {qrCodeUrl ? (
                        <div className="relative w-[55%] max-w-[200px] aspect-square bg-white rounded-xl overflow-hidden shadow-lg p-2 sm:p-3">
                            <Image
                                src={qrCodeUrl}
                                alt="Menu QR Code"
                                fill
                                className="object-contain p-1 sm:p-2"
                                unoptimized
                                priority
                            />
                        </div>
                    ) : (
                        <div
                            className="w-[55%] max-w-[200px] aspect-square rounded-xl flex items-center justify-center"
                            style={{
                                backgroundColor: isDarkBackground ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                border: `1px solid ${isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                            }}
                        >
                            <p className="text-sm opacity-50">Generating...</p>
                        </div>
                    )}

                    <p className="text-xs sm:text-sm text-center opacity-60">
                        Scan to view your digital menu instantly.
                    </p>

                    {/* Link Box */}
                    <div
                        className="w-full flex items-center gap-2 p-2 sm:p-3 rounded-lg border min-w-0 overflow-hidden box-border"
                        style={{
                            backgroundColor: isDarkBackground ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                            borderColor: isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        }}
                    >
                        <code className="text-[11px] sm:text-xs flex-1 min-w-0 truncate block font-mono opacity-75">
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
                    <div className="flex gap-2 sm:gap-3 w-full">
                        <Button
                            size="sm"
                            variant="outline"
                            className={`flex-1 h-9 sm:h-10 gap-1.5 sm:gap-2 text-xs sm:text-sm ${outlineButtonClass}`}
                            onClick={onDownload}
                            disabled={!qrCodeUrl}
                        >
                            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Download
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className={`flex-1 h-9 sm:h-10 gap-1.5 sm:gap-2 text-xs sm:text-sm ${outlineButtonClass}`}
                            onClick={handleCopy}
                        >
                            {copied ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                            {copied ? 'Copied!' : 'Copy Link'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
