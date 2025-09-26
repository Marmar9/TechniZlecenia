"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            View and manage your academic marketplace profile
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Profile data not available</p>
            <p className="text-sm text-muted-foreground mt-2">Backend connection required</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
