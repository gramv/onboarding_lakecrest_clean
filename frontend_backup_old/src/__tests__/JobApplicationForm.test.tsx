import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import JobApplicationForm from '../pages/JobApplicationForm';

jest.mock('axios');

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('JobApplicationForm', () => {
  beforeEach(() => {
    jest.doMock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => ({ propertyId: 'test-property-id' }),
    }));
  });

  test('renders job application form', () => {
    renderWithRouter(<JobApplicationForm />);
    
    expect(screen.getByText(/Job Application/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  test('shows department and position dropdowns', () => {
    renderWithRouter(<JobApplicationForm />);
    
    expect(screen.getByLabelText(/Department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Position/i)).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    renderWithRouter(<JobApplicationForm />);
    
    const submitButton = screen.getByRole('button', { name: /Submit Application/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all required fields/i)).toBeInTheDocument();
    });
  });

  test('updates position options when department changes', async () => {
    renderWithRouter(<JobApplicationForm />);
    
    const departmentSelect = screen.getByLabelText(/Department/i);
    fireEvent.change(departmentSelect, { target: { value: 'Housekeeping' } });

    await waitFor(() => {
      const positionSelect = screen.getByLabelText(/Position/i);
      expect(positionSelect).toBeInTheDocument();
    });
  });
});
