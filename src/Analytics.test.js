/**
 * @jest-environment jsdom
 */

// Ensure our canvas mock is active
import 'jest-canvas-mock';

import React from 'react';
import { render, screen } from '@testing-library/react';
import Analytics from './Analytics';

test('renders two charts and the heading', () => {
  // Prepare a fake tasks array
  const tasks = [
    { subject: 'Math', duration: '30', deadline: '2025-05-01T10:00' },
    { subject: 'History', duration: '45', deadline: '2025-05-02T12:00' },
    { subject: 'Math', duration: '60', deadline: '2025-05-01T14:00' }
  ];

  render(<Analytics tasks={tasks} />);

  // Heading
  expect(screen.getByText(/Performance Analytics/i)).toBeInTheDocument();

  // Two chart canvases (Bar + Line) should be in the document
  const canvases = screen.getAllByRole('img');
  expect(canvases).toHaveLength(2);
});
