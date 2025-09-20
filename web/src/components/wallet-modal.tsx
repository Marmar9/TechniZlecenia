"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownLeft, CreditCard, DollarSign, TrendingUp } from "lucide-react"

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

const mockTransactions = [
  {
    id: "1",
    type: "earned",
    amount: 25,
    description: "Calculus II tutoring - Sarah Chen",
    date: "2 days ago",
    status: "completed",
  },
  {
    id: "2",
    type: "earned",
    amount: 35,
    description: "Python programming help - Mike Rodriguez",
    date: "1 week ago",
    status: "completed",
  },
  {
    id: "3",
    type: "withdrawal",
    amount: -50,
    description: "Withdrawal to bank account",
    date: "1 week ago",
    status: "completed",
  },
  {
    id: "4",
    type: "earned",
    amount: 20,
    description: "Statistics homework help - Emma Davis",
    date: "2 weeks ago",
    status: "completed",
  },
  {
    id: "5",
    type: "earned",
    amount: 30,
    description: "Chemistry lab report help - Alex Johnson",
    date: "3 weeks ago",
    status: "completed",
  },
]

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const currentBalance = 127.5
  const totalEarned = 847.0
  const pendingEarnings = 45.0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">Wallet & Earnings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage your earnings and payment methods
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Balance Overview */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div className="text-2xl font-bold text-card-foreground">${currentBalance}</div>
                <div className="text-sm text-muted-foreground">Available Balance</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-card-foreground">${totalEarned}</div>
                <div className="text-sm text-muted-foreground">Total Earned</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <CreditCard className="h-5 w-5 text-warning" />
                </div>
                <div className="text-2xl font-bold text-card-foreground">${pendingEarnings}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw Funds
            </Button>
            <Button variant="outline" className="flex-1 border-border bg-transparent">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment Methods
            </Button>
          </div>

          {/* Transaction History */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Recent Transactions</CardTitle>
              <CardDescription>Your latest earnings and withdrawals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        transaction.type === "earned" ? "bg-success/20" : "bg-warning/20"
                      }`}
                    >
                      {transaction.type === "earned" ? (
                        <ArrowDownLeft className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">{transaction.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${transaction.amount > 0 ? "text-success" : "text-warning"}`}>
                      {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
