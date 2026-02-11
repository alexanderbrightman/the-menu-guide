import type { Metadata } from 'next'
import { GettingStartedPage } from '@/components/landing/GettingStartedPage'

export const metadata: Metadata = {
    title: 'Getting Started | The Menu Guide',
    description: 'Learn how to set up your restaurant\'s digital menu with The Menu Guide. Create an account, customize your profile, build your menu, and share it with a QR code.',
}

export default function GettingStarted() {
    return <GettingStartedPage />
}
