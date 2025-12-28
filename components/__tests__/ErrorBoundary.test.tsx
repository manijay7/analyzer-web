import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock console.error to avoid noise in test output
const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    consoleError.mockClear();
  });

  afterAll(() => {
    consoleError.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error fallback when an error occurs', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // Error details are only shown in development mode
    if (process.env.NODE_ENV === 'development') {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    }
    expect(consoleError).toHaveBeenCalled();
  });

  it('allows resetting error state', () => {
    let shouldThrow = true;

    const ThrowError = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Recovered content</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Reset error
    shouldThrow = false;
    fireEvent.click(screen.getByText('Try Again'));

    rerender(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const CustomFallback = ({ error, resetError }: { error?: Error; resetError: () => void }) => (
      <div data-testid="custom-fallback">
        Custom Error: {error?.message}
        <button onClick={resetError}>Reset</button>
      </div>
    );

    const ThrowError = () => {
      throw new Error('Custom test error');
    };

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error: Custom test error')).toBeInTheDocument();
  });
});