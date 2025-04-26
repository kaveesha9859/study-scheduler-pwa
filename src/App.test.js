/**
 * @jest-environment jsdom
 */

// 1) Mock Analytics so Chart.js doesn’t run
jest.mock('./Analytics', () => () => <div data-testid="analytics-mock" />);

// 2) Mock ML so TensorFlow.js isn’t initialized
jest.mock('./ml', () => ({
  initModel: () => Promise.resolve(),
  predictPriority: () => 0.5,
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

test('renders the Study Scheduler header and analytics stub', async () => {
  render(<App />);

  // Wait for the header to appear
  await waitFor(() => {
    expect(screen.getByText(/Study Scheduler/i)).toBeInTheDocument();
  });

  // Confirm our mocked Analytics placeholder is rendered
  expect(screen.getByTestId('analytics-mock')).toBeInTheDocument();
});

test('allows user to add a task', async () => {
  const { container } = render(<App />);

  // Find inputs by placeholder / type
  const subjectInput = screen.getByPlaceholderText(/e\.g\. Math/i);
  const durationInput = screen.getByPlaceholderText(/e\.g\. 120/i);
  const deadlineInput = container.querySelector('input[type="datetime-local"]');

  // Fill in the form
  fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
  fireEvent.change(durationInput, { target: { value: '45' } });
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  fireEvent.change(deadlineInput, {
    target: { value: now.toISOString().substring(0,16) }
  });

  // Submit
  fireEvent.click(screen.getByText(/Add Task/i));

  // Verify the task appears
  expect(await screen.findByText(/Test Subject/i)).toBeInTheDocument();
  expect(screen.getByText(/45 mins/i)).toBeInTheDocument();
});

test('allows user to delete a task', async () => {
  const { container } = render(<App />);

  // First add a task to delete
  const subjectInput = screen.getByPlaceholderText(/e\.g\. Math/i);
  const durationInput = screen.getByPlaceholderText(/e\.g\. 120/i);
  const deadlineInput = container.querySelector('input[type="datetime-local"]');

  fireEvent.change(subjectInput, { target: { value: 'To Delete' } });
  fireEvent.change(durationInput, { target: { value: '10' } });
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  fireEvent.change(deadlineInput, {
    target: { value: now.toISOString().substring(0,16) }
  });
  fireEvent.click(screen.getByText(/Add Task/i));

  // Wait for it to show up
  expect(await screen.findByText(/To Delete/i)).toBeInTheDocument();

  // Click exactly the Delete *button*
  fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));

  // Assert it’s removed
  await waitFor(() => {
    expect(screen.queryByText(/To Delete/i)).toBeNull();
  });
});
