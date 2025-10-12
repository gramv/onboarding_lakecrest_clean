/**
 * Employee Details View
 * Comprehensive employee information display with tabs for personal info, employment details, emergency contacts, and documents
 */

import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, Users, FileText, Loader2, MapPin, Phone, Mail, Calendar, DollarSign, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DocumentVerificationService from '@/services/documentVerificationService';
import { DocumentsViewer } from './DocumentsViewer';

interface EmployeeDetailsViewProps {
  employeeId: string;
  onClose: () => void;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
}

interface EmployeeDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  ssn: string;
  address: string;
  employeeNumber: string;
  position: string;
  department: string;
  hireDate: string;
  startDate: string;
  employmentStatus: string;
  onboardingStatus: string;
  payRate: number;
  payFrequency: string;
  employmentType: string;
  emergencyContacts: EmergencyContact[];
  propertyId: string;
  propertyName: string;
}

export function EmployeeDetailsView({ employeeId, onClose }: EmployeeDetailsViewProps) {
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchEmployeeDetails();
  }, [employeeId]);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await DocumentVerificationService.getEmployeeDetails(employeeId);
      
      if (response.success && response.employee) {
        setEmployee(response.employee);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching employee details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'active': { variant: 'default', label: 'Active' },
      'inactive': { variant: 'secondary', label: 'Inactive' },
      'terminated': { variant: 'destructive', label: 'Terminated' },
      'completed': { variant: 'default', label: 'Completed' },
      'pending': { variant: 'outline', label: 'Pending' }
    };

    const config = statusConfig[status?.toLowerCase()] || { variant: 'outline', label: status || 'Unknown' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading employee details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-red-600">
              <X className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Error Loading Details</h3>
            <p className="text-gray-600 text-center">{error || 'Employee not found'}</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 overflow-y-auto">
      <div className="min-h-screen p-4 flex items-start justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {employee.firstName} {employee.lastName}
                </h2>
                <p className="text-blue-100 mt-1">
                  {employee.position} • {employee.department}
                </p>
                <p className="text-blue-200 text-sm mt-1">
                  Employee #{employee.employeeNumber}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-blue-700 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex items-center space-x-4 mt-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">{employee.propertyName}</span>
              </div>
              {getStatusBadge(employee.employmentStatus)}
              {getStatusBadge(employee.onboardingStatus)}
            </div>
          </div>

          {/* Tabs */}
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">
                  <User className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="employment">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Employment
                </TabsTrigger>
                <TabsTrigger value="emergency">
                  <Users className="h-4 w-4 mr-2" />
                  Emergency Contacts
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{employee.email || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">{employee.phone || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Date of Birth</p>
                          <p className="font-medium">{formatDate(employee.dateOfBirth)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <User className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">SSN</p>
                          <p className="font-medium font-mono">{employee.ssn || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">{employee.address || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Employment Tab */}
              <TabsContent value="employment" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Employment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Position</p>
                        <p className="font-medium">{employee.position || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Department</p>
                        <p className="font-medium">{employee.department || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Employment Type</p>
                        <p className="font-medium">{employee.employmentType || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Hire Date</p>
                        <p className="font-medium">{formatDate(employee.hireDate)}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Pay Rate</p>
                          <p className="font-medium">{formatCurrency(employee.payRate)}/hour</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pay Frequency</p>
                        <p className="font-medium">{employee.payFrequency || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Start Date</p>
                        <p className="font-medium">{formatDate(employee.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Property</p>
                        <p className="font-medium">{employee.propertyName || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Emergency Contacts Tab */}
              <TabsContent value="emergency" className="space-y-4 mt-6">
                {employee.emergencyContacts && employee.emergencyContacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {employee.emergencyContacts.map((contact, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <span>{contact.name || 'Unnamed Contact'}</span>
                          </CardTitle>
                          {contact.relationship && (
                            <p className="text-sm text-gray-500">{contact.relationship}</p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {contact.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{contact.phone}</span>
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{contact.email}</span>
                            </div>
                          )}
                          {contact.address && (
                            <div className="flex items-start space-x-2">
                              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                              <span className="text-sm">{contact.address}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600">No emergency contacts on file</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Emergency contact information will appear here when available
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Employee Documents</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      All onboarding documents are encrypted and securely stored
                    </p>
                  </CardHeader>
                  <CardContent>
                    <DocumentsViewer employeeId={employeeId} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeDetailsView;

