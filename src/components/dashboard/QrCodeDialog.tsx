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
                className="sm:max-w-md border-0"
                style={{
                    backgroundColor: isDarkBackground ? '#1a1a2e' : '#ffffff',
                    color: contrastColor,
                }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold" style={{ color: contrastColor }}>
                        <QrCode className="h-5 w-5" />
                        Menu QR Code
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-5 py-4">
                    {/* QR Code Image */}
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

                    <p className="text-sm text-center opacity-60">
                        Scan to view your digital menu instantly.
                    </p>

                    {/* Link Box */}
                    <div
                        className="w-full flex items-center gap-2 p-3 rounded-lg border"
                        style={{
                            backgroundColor: isDarkBackground ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                            borderColor: isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        }}
                    >
                        <code className="text-xs flex-1 truncate font-mono opacity-75">
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
            </DialogContent>
        </Dialog>
    )
}
