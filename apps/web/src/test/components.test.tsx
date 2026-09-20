import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LoginPage } from '../pages/LoginPage';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('LoginPage', () => {
  it('loginformulier werkt', async () => {
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/e-mailadres/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/wachtwoord/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inloggen/i })).toBeInTheDocument();
  });
});

describe('Calendar rendering', () => {
  it('kalender rendert dagcellen met diagonaal voor oma/mama', async () => {
    const { DayCell } = await import('../components/DayCell');
    render(
      <DayCell
        day={4}
        entry={{
          id: '1',
          householdId: 'h1',
          date: '2026-08-04',
          daytimeLocation: 'oma',
          daytimeLocationOther: null,
          activity: null,
          activityOther: null,
          sleepLocation: 'mama',
          broughtBy: null,
          broughtByOther: null,
          pickedUpBy: 'trixie',
          pickedUpByOther: null,
          note: null,
          isShared: true,
          createdBy: 'u1',
          updatedBy: 'u1',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          version: 1,
        }}
        isToday={false}
        onClick={() => {}}
      />,
    );

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Oma')).toBeInTheDocument();
    expect(screen.getByText('Mama')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('data-diagonal', 'true');
  });

  it('egale cel bij alleen slaapplaats', async () => {
    const { DayCell } = await import('../components/DayCell');
    render(
      <DayCell
        day={9}
        entry={{
          id: '2',
          householdId: 'h1',
          date: '2026-08-09',
          daytimeLocation: 'papa',
          daytimeLocationOther: null,
          activity: null,
          activityOther: null,
          sleepLocation: 'papa',
          broughtBy: null,
          broughtByOther: null,
          pickedUpBy: null,
          pickedUpByOther: null,
          note: null,
          isShared: true,
          createdBy: 'u1',
          updatedBy: 'u1',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          version: 1,
        }}
        isToday={false}
        onClick={() => {}}
      />,
    );

    expect(screen.getByRole('button')).toHaveAttribute('data-diagonal', 'false');
  });
});
