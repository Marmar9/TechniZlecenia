"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin } from "lucide-react"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

const mockReviews = [
  {
    id: "1",
    reviewer: "Sarah Chen",
    comment: "Kevin helped me understand calculus concepts really well. Very patient and knowledgeable!",
    subject: "Mathematics",
    date: "2 days ago",
  },
  {
    id: "2",
    reviewer: "Mike Rodriguez",
    comment: "Excellent Python tutoring. Kevin explained complex algorithms in a simple way.",
    subject: "Computer Science",
    date: "1 week ago",
  },
  {
    id: "3",
    reviewer: "Emma Davis",
    comment: "Good help with statistics homework. Would recommend!",
    subject: "Statistics",
    date: "2 weeks ago",
  },
]

const mockCompletedJobs = [
  {
    id: "1",
    title: "Calculus II Integration Help",
    student: "Sarah Chen",
    subject: "Mathematics",
    price: 25,
    date: "2 days ago",
  },
  {
    id: "2",
    title: "Python Data Structures Tutoring",
    student: "Mike Rodriguez",
    subject: "Computer Science",
    price: 35,
    date: "1 week ago",
  },
  {
    id: "3",
    title: "Statistics Homework Help",
    student: "Emma Davis",
    subject: "Statistics",
    price: 20,
    date: "2 weeks ago",
  },
]

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
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="/diverse-student-profiles.png" alt="Kevin Student" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">K</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-popover-foreground">Kevin Student</h2>
                  <p className="text-muted-foreground">Computer Science Major</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>University Campus</span>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <Badge variant="secondary">Computer Science</Badge>
                <Badge variant="secondary">Mathematics</Badge>
                <Badge variant="secondary">Statistics</Badge>
              </div>
            </div>
          </div>


          {/* Tabs */}
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="history">Job History</TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="space-y-4">
              {mockReviews.map((review) => (
                <Card key={review.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-card-foreground">{review.reviewer}</h4>
                        <Badge variant="outline" className="text-xs">
                          {review.subject}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground ml-1">{review.date}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {mockCompletedJobs.map((job) => (
                <Card key={job.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-card-foreground">{job.title}</h4>
                        <p className="text-sm text-muted-foreground">with {job.student}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {job.subject}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{job.date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-card-foreground">${job.price}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
