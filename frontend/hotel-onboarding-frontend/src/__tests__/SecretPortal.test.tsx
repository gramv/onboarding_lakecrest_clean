import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SecretPortal from '../pages/SecretPortal';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SecretPortal', () => {
  beforeEach(() => {
    mockedAxios.post.mockClear();
  });

  test('renders secret portal form', () => {
    render(<SecretPortal />);
    
    expect(screen.getByText(/Secret HR Portal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/HR Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Secret Key/i)).toBeInTheDocument();
  });

  test('submits form with correct data', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        message: 'HR user created successfully',
        user: { email: 'test@hr.com' }
      }
    });

    render(<SecretPortal />);
    
    fireEvent.change(screen.getByLabelText(/HR Email/i), {
      target: { value: 'test@hr.com' }
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/Secret Key/i), {
      target: { value: 'hotel-admin-2025' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Create HR User/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/secret/create-hr'),
      );
    });
  });

  test('shows error message on failed submission', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: { detail: 'Invalid secret key' } }
    });

    render(<SecretPortal />);
    
    fireEvent.change(screen.getByLabelText(/HR Email/i), {
      target: { value: 'test@hr.com' }
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/Secret Key/i), {
      target: { value: 'wrong-key' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Create HR User/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid secret key/i)).toBeInTheDocument();
    });
  });
});
