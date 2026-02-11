import { Plus, Scan, Edit, Settings, FolderPlus, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsDialog } from '@/components/profile/SettingsDialog'
import { Profile } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useMenuTheme } from '@/hooks/useMenuTheme'

interface MenuHeaderProps {
    profile: Profile | null
    user: User | null
    onNewCategory: () => void
    onNewItem: () => void
    message: string
    theme: ReturnType<typeof useMenuTheme>
}

export function MenuHeader({
    profile,
    user,
    onNewCategory,
    onNewItem,
    message,
    theme,
}: MenuHeaderProps) {
    const {
        menuFontFamily,
        primaryTextClass,
        outlineButtonClass,
        getBorderColor,
        isDarkBackground,
        menuBackgroundColor,
    } = theme

    const handleScanMenu = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-scan-menu'))
        }
    }

    const handleEditProfile = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-edit-profile'))
        }
    }

    const btnClass = `${outlineButtonClass} flex items-center gap-1.5 border ${getBorderColor()} rounded-lg px-4 py-2 text-sm whitespace-nowrap flex-shrink-0`

    return (
        <header className="space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                    {/* Header content moved to Dashboard frame */}
                </div>

                {/* Mobile action toolbar - fixed to bottom of viewport for easy reach */}
                <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden overflow-x-auto scrollbar-hide border-t" style={{ borderColor: getBorderColor(), paddingBottom: 'env(safe-area-inset-bottom)', backgroundColor: menuBackgroundColor }}>
                    <div className="flex items-center gap-2 sm:gap-3 w-max px-4 py-3">
                        <Button
                            variant="outline"
                            className={btnClass}
                            onClick={onNewItem}
                        >
                            <Plus className="h-4 w-4" />
                            Add Item
                        </Button>
                        <Button
                            variant="outline"
                            className={btnClass}
                            onClick={onNewCategory}
                        >
                            <FolderPlus className="h-4 w-4" />
                            Add Category
                        </Button>
                        <Button
                            variant="outline"
                            className={btnClass}
                            onClick={handleScanMenu}
                        >
                            <Scan className="h-4 w-4" />
                            Scan Menu
                        </Button>
                        <Button
                            variant="outline"
                            className={btnClass}
                            onClick={handleEditProfile}
                        >
                            <Edit className="h-4 w-4" />
                            Edit Profile
                        </Button>
                        <SettingsDialog>
                            <Button
                                variant="outline"
                                className={btnClass}
                            >
                                <Settings className="h-4 w-4" />
                                Settings
                            </Button>
                        </SettingsDialog>
                        <Button
                            variant="outline"
                            className={btnClass}
                            onClick={() => window.dispatchEvent(new CustomEvent('open-qr-code'))}
                        >
                            <QrCode className="h-4 w-4" />
                            QR Code
                        </Button>
                    </div>
                </div>

                {message && (
                    <div
                        className={`max-w-2xl border px-4 py-3 text-sm sm:text-base font-medium rounded-lg shadow-sm ${getBorderColor()} ${message.toLowerCase().includes('error')
                            ? isDarkBackground
                                ? 'bg-red-900/30 text-red-100'
                                : 'bg-red-50 text-red-800'
                            : isDarkBackground
                                ? 'bg-emerald-900/30 text-emerald-100'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                        role="status"
                        aria-live="polite"
                    >
                        {message}
                    </div>
                )}
            </div>
        </header>
    )
}
