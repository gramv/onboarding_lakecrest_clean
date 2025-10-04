/**
 * Manager Review Employee Page (New)
 * Wrapper for the new ManagerReviewInterface component
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ManagerReviewInterface } from '@/components/manager/ManagerReviewInterface';
import { useToast } from '@/hooks/use-toast';
import { reviewDataService } from '@/services/managerReviewService';

export default function ManagerReviewEmployeeNew() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [employeeName, setEmployeeName] = useState<string>('Employee');
  const [managerEmail, setManagerEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployeeInfo();
  }, [employeeId]);

  const loadEmployeeInfo = async () => {
    try {
      setLoading(true);
      
      // Get manager email from localStorage or auth context
      const email = localStorage.getItem('userEmail') || '';
      setManagerEmail(email);
      
      // Get employee name from API
      if (employeeId) {
        const response = await fetch(`/api/manager/review/employees/${employeeId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const personalInfo = data.employee_info?.personal_info || {};
          const firstName = personalInfo.firstName || personalInfo.first_name || '';
          const lastName = personalInfo.lastName || personalInfo.last_name || '';
          setEmployeeName(`${firstName} ${lastName}`.trim() || 'Employee');
        }
      }
    } catch (err) {
      console.error('Error loading employee info:', err);
      toast({
        title: 'Error',
        description: 'Failed to load employee information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!employeeId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Not Found</h2>
          <p className="text-gray-600 mb-4">Invalid employee ID</p>
          <button
            onClick={() => navigate('/manager')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ManagerReviewInterface
      employeeId={employeeId}
      employeeName={employeeName}
      managerEmail={managerEmail}
    />
  );
}

