import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import { LoginPage } from '../pages/LoginPage';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

afterEach(() => {
  cleanup();
});

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
      expect(screen.getByLabelText(/gebruikersnaam/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/wachtwoord/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inloggen/i })).toBeInTheDocument();
  });
});

describe('DayCard privé', () => {
  it(
    'toont titel, tijd, opmerking en Privé-badge — geen lege locatie-UI',
    async () => {
      const { DayCard } = await import('../components/DayCard');
      render(
        <DayCard
          date="2026-10-11"
          entry={{
            id: 'p1',
            householdId: 'h1',
            date: '2026-10-11',
            daytimeLocation: null,
            daytimeLocationOther: null,
            activity: null,
            activityOther: null,
            sleepLocation: null,
            broughtBy: null,
            broughtByOther: null,
            pickedUpBy: null,
            pickedUpByOther: null,
            note: 'Niet vergeten paspoort',
            isShared: false,
            title: 'Tandarts',
            time: '14:00',
            createdBy: 'u1',
            updatedBy: 'u1',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            version: 1,
          }}
        />,
      );

      expect(screen.getByText('Tandarts')).toBeInTheDocument();
      expect(screen.getByText('14:00')).toBeInTheDocument();
      expect(screen.getByText('Niet vergeten paspoort')).toBeInTheDocument();
      expect(screen.getByText('Privé')).toBeInTheDocument();
      expect(screen.queryByText(/Overdag/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Slapen/i)).not.toBeInTheDocument();
    },
    15000,
  );
});

describe('Calendar rendering', () => {
  it(
    'kalender rendert dagcellen met diagonaal voor oma/mama',
    async () => {
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
      expect(screen.getByText('Trixie haalt op')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('data-diagonal', 'true');
    },
    15000,
  );

  it(
    'toont papa school brengen naast mama overdag, geen losse school-regel',
    async () => {
      const { DayCell } = await import('../components/DayCell');
      render(
        <DayCell
          day={23}
          entry={{
            id: '1',
            householdId: 'h1',
            date: '2026-09-23',
            daytimeLocation: 'mama',
            daytimeLocationOther: null,
            activity: 'school',
            activityOther: null,
            sleepLocation: null,
            broughtBy: 'papa',
            broughtByOther: null,
            pickedUpBy: 'mama',
            pickedUpByOther: null,
            note: null,
            isShared: true,
            title: null,
            time: null,
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

      expect(screen.getByText('Papa school brengen')).toBeInTheDocument();
      expect(screen.getByText('Mama')).toBeInTheDocument();
      expect(screen.getByText('Mama haalt op')).toBeInTheDocument();
      expect(screen.queryByText('School')).not.toBeInTheDocument();
    },
    15000,
  );

  it(
    'op gedeelde agenda: privé alleen als slotje; op privé-agenda: titel zichtbaar',
    async () => {
      const { DayCell } = await import('../components/DayCell');
      const shared = {
        id: 's',
        householdId: 'h1',
        date: '2026-10-11',
        daytimeLocation: 'papa' as const,
        daytimeLocationOther: null,
        activity: null,
        activityOther: null,
        sleepLocation: 'papa' as const,
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
      };
      const ownPrivate = {
        ...shared,
        id: 'p1',
        isShared: false,
        title: 'Tandarts',
        time: '14:00',
        sleepLocation: null,
        daytimeLocation: null,
      };

      const { rerender } = render(
        <DayCell
          day={11}
          entries={[shared, ownPrivate]}
          showPrivate
          isToday={false}
          onClick={() => {}}
        />,
      );

      const cell = screen.getByRole('button');
      expect(within(cell).getAllByText('Papa').length).toBeGreaterThan(0);
      expect(within(cell).queryByText('Tandarts')).not.toBeInTheDocument();
      expect(cell).toHaveAttribute('aria-label', expect.stringContaining('privé'));

      rerender(
        <DayCell
          day={11}
          entries={[ownPrivate]}
          showPrivate
          isToday={false}
          onClick={() => {}}
        />,
      );
      const privateOnly = screen.getByRole('button');
      expect(within(privateOnly).getByText(/Tandarts/)).toBeInTheDocument();
      expect(within(privateOnly).getByText(/14:00/)).toBeInTheDocument();
      expect(privateOnly).toHaveAttribute('aria-label', expect.stringContaining('Tandarts'));
    },
    15000,
  );

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
