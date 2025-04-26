describe('Study Scheduler PWA (E2E)', () => {
    beforeEach(() => {
      // Update URL if CRA picked a port other than 3000
      cy.visit('http://localhost:3002');
    });
  
    it('lets me add and persist a task', () => {
      // Fill out the Add Task form
      cy.get('input[placeholder="e.g. Math"]').type('E2E Test');
      cy.get('input[placeholder="e.g. 120"]').type('30');
  
      // Choose a datetime a few minutes ahead
      const dt = new Date();
      dt.setMinutes(dt.getMinutes() + 5);
      const iso = dt.toISOString().substring(0,16);
      cy.get('input[type="datetime-local"]').type(iso);
  
      cy.contains('Add Task').click();
  
      // Confirm it appears
      cy.contains('E2E Test').should('exist');
  
      // Reload to verify persistence
      cy.reload();
      cy.contains('E2E Test').should('exist');
    });
  
    it('lets me delete a task', () => {
      // Find the existing “E2E Test” and delete it
      cy.contains('E2E Test')
        .closest('li')
        .within(() => {
          cy.contains('Delete').click();
        });
      cy.contains('E2E Test').should('not.exist');
    });
  
    it('shows analytics charts', () => {
      // Two <canvas> elements = two charts
      cy.get('canvas').should('have.length', 2);
    });
  });
  