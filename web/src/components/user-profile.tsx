"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { User, Settings, LogOut, Wallet, Star, MessageSquare } from "lucide-react"
import { useState } from "react"
import { ProfileModal } from "@/components/profile-modal"
import { WalletModal } from "@/components/wallet-modal"
import Link from "next/link"

export function UserProfile() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isWalletOpen, setIsWalletOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src="/diverse-student-profiles.png" alt="Profile" />
              <AvatarFallback className="bg-primary text-primary-foreground">K</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-success rounded-full border-2 border-background" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 bg-popover border-border" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/diverse-student-profiles.png" alt="Profile" />
                  <AvatarFallback className="bg-primary text-primary-foreground">K</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none text-popover-foreground">Kevin Student</p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">kevin@university.edu</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="text-xs text-muted-foreground">4.9</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Computer Science
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-2">
                <span>Balance: $127.50</span>
                <span>15 completed jobs</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem asChild className="text-popover-foreground hover:bg-accent cursor-pointer">
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              View Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-popover-foreground hover:bg-accent cursor-pointer"
            onClick={() => setIsWalletOpen(true)}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Wallet & Earnings
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="text-popover-foreground hover:bg-accent cursor-pointer">
            <Link href="/profile">
              <MessageSquare className="mr-2 h-4 w-4" />
              My Posts
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-popover-foreground hover:bg-accent cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem className="text-popover-foreground hover:bg-accent cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </>
  )
}
