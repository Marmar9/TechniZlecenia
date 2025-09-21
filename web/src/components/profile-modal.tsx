"use client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Star, MapPin, Calendar, Edit } from "lucide-react"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

const mockReviews = [
  {
    id: "1",
    reviewer: "Sarah Chen",
    rating: 5,
    comment: "Kevin helped me understand calculus concepts really well. Very patient and knowledgeable!",
    subject: "Mathematics",
    date: "2 days ago",
  },
  {
    id: "2",
    reviewer: "Mike Rodriguez",
    rating: 5,
    comment: "Excellent Python tutoring. Kevin explained complex algorithms in a simple way.",
    subject: "Computer Science",
    date: "1 week ago",
  },
  {
    id: "3",
    reviewer: "Emma Davis",
    rating: 4,
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
    rating: 5,
    date: "2 days ago",
  },
  {
    id: "2",
    title: "Python Data Structures Tutoring",
    student: "Mike Rodriguez",
    subject: "Computer Science",
    price: 35,
    rating: 5,
    date: "1 week ago",
  },
  {
    id: "3",
    title: "Statistics Homework Help",
    student: "Emma Davis",
    subject: "Statistics",
    price: 20,
    rating: 4,
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
                <Button variant="outline" size="sm" className="border-border bg-transparent">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="font-medium">4.9</span>
                  <span className="text-muted-foreground">(23 reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>University Campus</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined Dec 2023</span>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <Badge variant="secondary">Computer Science</Badge>
                <Badge variant="secondary">Mathematics</Badge>
                <Badge variant="secondary">Statistics</Badge>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-card-foreground">15</div>
                <div className="text-sm text-muted-foreground">Jobs Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-card-foreground">$847</div>
                <div className="text-sm text-muted-foreground">Total Earned</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-card-foreground">98%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </CardContent>
            </Card>
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
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={`star-${review.id}-${i}`}
                            className={`h-3 w-3 ${
                              i < review.rating ? "fill-warning text-warning" : "text-muted-foreground"
                            }`}
                          />
                        ))}
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
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          <span className="text-xs">{job.rating}</span>
                        </div>
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
