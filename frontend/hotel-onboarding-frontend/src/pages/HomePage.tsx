import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Code, FileText, TestTube } from 'lucide-react'

export default function HomePage() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-heading-primary text-gray-900 mb-4">
          Hotel Employee Onboarding System
        </h1>
        <p className="text-body-large text-gray-600 mb-8">
          Streamlined hiring and onboarding for hotel properties
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card className="card-transition">
          <CardHeader>
            <CardTitle>HR Portal</CardTitle>
            <CardDescription>
              Manage properties, assign managers, and oversee all operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login?role=hr">
              <Button className="w-full">HR Login</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="card-transition">
          <CardHeader>
            <CardTitle>Manager Portal</CardTitle>
            <CardDescription>
              Review applications, manage employees, and approve documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login?role=manager">
              <Button className="w-full">Manager Login</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="card-transition">
          <CardHeader>
            <CardTitle>Apply for Jobs</CardTitle>
            <CardDescription>
              Scan QR code at property or use direct link to apply
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/apply/demo">
              <Button variant="outline" className="w-full">Demo Application</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <h2 className="text-heading-secondary mb-4">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-4 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <h3 className="text-body-default font-semibold">Scan QR Code</h3>
            <p className="text-body-small text-gray-600">Candidates scan QR code at property</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 font-bold">2</span>
            </div>
            <h3 className="text-body-default font-semibold">Submit Application</h3>
            <p className="text-body-small text-gray-600">Fill out mobile-friendly application form</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 font-bold">3</span>
            </div>
            <h3 className="text-body-default font-semibold">Manager Review</h3>
            <p className="text-body-small text-gray-600">Manager reviews and approves applications</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 font-bold">4</span>
            </div>
            <h3 className="text-body-default font-semibold">Complete Onboarding</h3>
            <p className="text-body-small text-gray-600">Employee completes documents with OCR assistance</p>
          </div>
        </div>
      </div>

      {/* Development Tools Section */}
      {isDevelopment && (
        <div className="mt-16 border-t pt-8">
          <h2 className="text-heading-secondary mb-4 text-center text-gray-700">Development Tools</h2>
          <div className="grid md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            <Card className="border-dashed border-2 border-blue-300 bg-blue-50/50 card-transition">
              <CardHeader className="pb-3">
                <CardTitle className="text-body-default flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Enhanced UI Test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/test-enhanced-ui">
                  <Button variant="outline" size="sm" className="w-full">
                    Test New Components
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 border-purple-300 bg-purple-50/50 card-transition">
              <CardHeader className="pb-3">
                <CardTitle className="text-body-default flex items-center gap-2">
                  <TestTube className="h-4 w-4 text-purple-600" />
                  Component Test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/test-components">
                  <Button variant="outline" size="sm" className="w-full">
                    Test Components
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 border-green-300 bg-green-50/50 card-transition">
              <CardHeader className="pb-3">
                <CardTitle className="text-body-default flex items-center gap-2">
                  <Code className="h-4 w-4 text-green-600" />
                  Flow Test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/onboard-flow-test">
                  <Button variant="outline" size="sm" className="w-full">
                    Test Onboarding Flow
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 border-orange-300 bg-orange-50/50 card-transition">
              <CardHeader className="pb-3">
                <CardTitle className="text-body-default flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  I-9 Field Tool
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/extract-i9-fields">
                  <Button variant="outline" size="sm" className="w-full">
                    Extract I-9 Fields
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
